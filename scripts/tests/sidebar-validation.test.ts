import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

import { findLocaleDifferences, generateSidebarData } from '../lib/site-data.js'
import { watchSidebar } from '../lib/watch.js'
import { validateManifest } from '../lib/validate.js'

import {
  createProject,
  fixtureSections,
  fixtureUnits,
  spawnSupervisor,
  writeDocument
} from './sidebar-fixtures.js'

test('manifest rejects names excluded by content scanning', () => {
  for (const slug of ['.hidden', '_draft', 'dist', 'node_modules']) {
    const problems = validateManifest([
      { kind: 'standalone', slug, title: { zh: '示例', en: 'Example' } }
    ])
    assert.match(problems.join('\n'), /invalid section slug/)
  }
})

test('strict generation detects absent indexes and language-specific pages', async () => {
  const root = await createProject()
  for (const locale of ['zh', 'en']) {
    for (const unit of fixtureUnits) {
      await writeDocument(root, path.join('notes', locale, ...unit.directorySegments, 'index.md'))
    }
  }
  await writeDocument(root, 'notes/zh/topics/one/extra.md')
  await rm(path.join(root, 'notes/en/topics/one/index.md'))
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections: fixtureSections }),
    (error: Error) => {
      assert.match(error.message, /missing index: .*en.*one.*index\.md/)
      assert.match(error.message, /mirror differences:.*extra\.md/)
      return true
    }
  )
})

test('mirror comparison handles an additional synthetic locale', () => {
  assert.deepEqual(
    findLocaleDifferences({ zh: new Set(['a', 'b']), en: new Set(['a']), xx: new Set(['b']) }),
    { zh: [], en: ['b'], xx: ['a'] }
  )
})

test('strict generation rejects rewritten route collisions and uncovered pages', async () => {
  const root = await createProject()
  for (const locale of ['zh', 'en']) {
    for (const unit of fixtureUnits)
      await writeDocument(root, path.join('notes', locale, ...unit.directorySegments, 'index.md'))
    await writeDocument(root, `notes/${locale}/topics/one/01-intro/index.md`)
    await writeDocument(root, `notes/${locale}/topics/one/intro/index.md`)
    await writeDocument(root, `notes/${locale}/unknown/note.md`)
  }
  await assert.rejects(
    generateSidebarData(root, {
      strict: true,
      sections: fixtureSections,
      routeRules: [{ index: 2 }]
    }),
    (error: Error) => {
      assert.match(error.message, /route collision/i)
      assert.match(error.message, /uncovered/i)
      return true
    }
  )
})

test('strict generation rejects missing section and group landing pages', async () => {
  const root = await createProject()
  for (const locale of ['zh', 'en'])
    for (const unit of fixtureUnits)
      await writeDocument(root, path.join('notes', locale, ...unit.directorySegments, 'index.md'))
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections: fixtureSections }),
    /missing navigation index.*subjects/i
  )
})

test('strict generation rejects source directories that disagree with their public unit routes', async () => {
  const { validateUnitRoutes } = await import('../lib/validate.js')
  assert.match(
    validateUnitRoutes(
      [
        {
          segments: ['subjects', 'alpha', 'basic'],
          directorySegments: ['subjects', 'alpha', '01-wrong'],
          title: { zh: '基础', en: 'Basic' }
        }
      ],
      'zh'
    ).join('\n'),
    /route mismatch/i
  )
})

test('watch command reloads changes to content metadata', { timeout: 12000 }, async (t) => {
  const root = await createProject()
  const sourceRoot = path.resolve(import.meta.dirname, '../..')
  await cp(path.join(sourceRoot, 'content'), path.join(root, 'content'), { recursive: true })
  await writeFile(
    path.join(root, 'content/manifest.ts'),
    `export const CONTENT_SECTIONS = [{ kind: 'standalone', slug: 'example', directory: '01-example', title: { zh: '示例', en: 'Original example' } }]
export function getContentUnits(sections = CONTENT_SECTIONS) { return sections.map(section => ({ segments: [section.slug], directorySegments: [section.directory ?? section.slug], title: section.title })) }
`
  )
  await cp(path.join(sourceRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true })
  await mkdir(path.join(root, '.vitepress'), { recursive: true })
  await cp(path.join(sourceRoot, 'package.json'), path.join(root, 'package.json'))
  await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
  const child = spawnSupervisor(root)
  const output = path.join(root, '.vitepress/generated/sidebar-data.ts')
  async function waitFor(needle: string) {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      const data = await readFile(output, 'utf8').catch(() => '')
      if (data.includes(needle)) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.fail(`generated data did not include ${needle}`)
  }
  await waitFor('Original example')
  const manifest = path.join(root, 'content/manifest.ts')
  await writeFile(
    manifest,
    (await readFile(manifest, 'utf8')).replace('Original example', 'Updated example')
  )
  await waitFor('Updated example')
})

test(
  'watch command exits when its initial sidebar generation fails',
  { timeout: 10000 },
  async (t) => {
    const root = await createProject()
    const sourceRoot = path.resolve(import.meta.dirname, '../..')
    await cp(path.join(sourceRoot, 'content'), path.join(root, 'content'), { recursive: true })
    await cp(path.join(sourceRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true })
    await mkdir(path.join(root, '.vitepress'), { recursive: true })
    await cp(path.join(sourceRoot, 'package.json'), path.join(root, 'package.json'))
    await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
    await writeFile(
      path.join(root, 'content/manifest.ts'),
      `export const CONTENT_SECTIONS = [{ kind: 'standalone', slug: 'fixture', directory: '01-fixture', title: { zh: '测试', en: 'Fixture' } }]
export function getContentUnits(sections = CONTENT_SECTIONS) { return sections.map(section => ({ segments: [section.slug], directorySegments: [section.directory ?? section.slug], title: section.title })) }
`
    )
    await writeDocument(root, 'notes/zh/01-fixture/broken.md', '---\ntitle: [invalid\n---\n')
    await writeDocument(root, 'notes/en/01-fixture/index.md')
    const child = spawnSupervisor(root, ['ignore', 'pipe', 'pipe'])
    let stderr = ''
    child.stderr!.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk
    })
    const result = await Promise.race([
      once(child, 'exit').then(([code]) => code),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 3000))
    ])
    assert.notEqual(
      result,
      'timeout',
      'watch command stayed running after initial generation failed'
    )
    assert.notEqual(result, 0)
    assert.match(stderr, /YAMLException|unexpected end of the stream/i)
  }
)

test('strict validation reports blank titles and explicitly pending translations', async () => {
  const { validateLocalePages } = await import('../lib/validate.js')
  const root = await createProject()
  await writeDocument(root, 'notes/en/example.md', '---\ntitle: " "\ntranslation: pending\n---\n')
  const problems = await validateLocalePages(root, 'en', new Set(['file:example.md']), [])
  assert.match(problems.join('\n'), /empty title.*example\.md/i)
  assert.match(problems.join('\n'), /translation.*pending.*example\.md/i)
})

test(
  'watcher recovers after a later generation error is corrected',
  { timeout: 8000 },
  async (t) => {
    const root = await createProject()
    const sections = [
      { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
    ]
    for (const locale of ['zh', 'en']) await writeDocument(root, `notes/${locale}/example/index.md`)
    const page = 'notes/en/example/note.md'
    await writeDocument(root, page, '---\ntitle: Original\n---\n')
    const events = new EventEmitter()
    const close = await watchSidebar(root, async () => {
      try {
        await generateSidebarData(root, { sections })
        events.emit('success')
      } catch (error) {
        events.emit('failed')
        throw error
      }
    })
    t.after(close)
    const failed = once(events, 'failed')
    await writeDocument(root, page, '---\ntitle: [invalid\n---\n')
    await failed
    const recovered = once(events, 'success')
    await writeDocument(root, page, '---\ntitle: Recovered\n---\n')
    await recovered
    assert.match(
      await readFile(path.join(root, '.vitepress/generated/sidebar-data.ts'), 'utf8'),
      /Recovered/
    )
  }
)

test('strict validation rejects non-string frontmatter titles', async () => {
  const { validateLocalePages } = await import('../lib/validate.js')
  const root = await createProject()
  await writeDocument(root, 'notes/en/index.md', '# Home')
  await writeDocument(root, 'notes/en/example/index.md', '# Example')
  await writeDocument(root, 'notes/en/example/note.md', '---\ntitle: [one, two]\n---\n')
  const sections = [
    { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
  ]
  const entries = new Set(['file:index.md', 'file:example/index.md', 'file:example/note.md'])
  assert.match(
    (await validateLocalePages(root, 'en', entries, sections)).join('\n'),
    /invalid title.*note\.md/i
  )
})

test('strict validation rejects unknown translation statuses but permits completed and unmarked pages', async () => {
  const { validateLocalePages } = await import('../lib/validate.js')
  const root = await createProject()
  await writeDocument(root, 'notes/en/index.md', '# Home\n')
  await writeDocument(root, 'notes/en/example/unknown.md', '---\ntranslation: Pending\n---\n')
  await writeDocument(root, 'notes/en/example/complete.md', '---\ntranslation: complete\n---\n')
  await writeDocument(root, 'notes/en/example/unmarked.md', '# Unmarked\n')
  const entries = new Set([
    'file:index.md',
    'file:example/unknown.md',
    'file:example/complete.md',
    'file:example/unmarked.md'
  ])
  const sections = [
    { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
  ]
  const problems = await validateLocalePages(root, 'en', entries, sections)
  assert.match(problems.join('\n'), /invalid translation.*unknown\.md/i)
  assert.doesNotMatch(problems.join('\n'), /translation.*(?:complete|unmarked)\.md/i)
})

test('ordered content directories require exactly two digits', async () => {
  const { validateOrderedDirectories } = await import('../lib/validate.js')
  const units = [
    { segments: ['guide'], directorySegments: ['guide'], title: { zh: '指南', en: 'Guide' } }
  ]
  const problems = validateOrderedDirectories(
    new Set([
      'dir:guide/01-good',
      'dir:guide/1-bad',
      'dir:guide/100-bad',
      'dir:guide/plain',
      'dir:guide/old'
    ])
  )
  assert.match(problems.join('\n'), /guide\/1-bad/)
  assert.match(problems.join('\n'), /guide\/100-bad/)
  assert.match(problems.join('\n'), /guide\/plain/)
  assert.match(problems.join('\n'), /guide\/old/)
  assert.doesNotMatch(problems.join('\n'), /guide\/01-good/)
})

test('ordered directories reject duplicate sibling numbers', async () => {
  const { validateOrderedDirectories } = await import('../lib/validate.js')
  const units = [
    { segments: ['guide'], directorySegments: ['guide'], title: { zh: '指南', en: 'Guide' } }
  ]
  const problems = validateOrderedDirectories(new Set(['dir:guide/01-one', 'dir:guide/01-two']))
  assert.match(problems.join('\n'), /duplicate.*01/i)
})

test('manifest rejects duplicate ordering numbers in grouped content units', () => {
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 'subject',
      title: { zh: '主题', en: 'Subject' },
      groups: [
        {
          slug: 'group',
          title: { zh: '组', en: 'Group' },
          entries: [
            { slug: 'one', directory: '01-one', title: { zh: '一', en: 'One' } },
            { slug: 'two', directory: '01-two', title: { zh: '二', en: 'Two' } }
          ]
        }
      ]
    }
  ]
  assert.match(validateManifest(sections).join('\n'), /duplicate.*01/i)
})

test('ordered directory validation covers structural directories', async () => {
  const { validateOrderedDirectories } = await import('../lib/validate.js')
  const entries = new Set(['dir:subject', 'dir:subject/group', 'dir:subject/group/01-unit'])
  const units = [
    {
      segments: ['subject', 'group', 'unit'],
      directorySegments: ['subject', 'group', '01-unit'],
      title: { zh: '入门', en: 'Intro' }
    }
  ]
  const problems = validateOrderedDirectories(entries).join('\n')
  assert.match(problems, /subject \(expected/)
  assert.match(problems, /subject\/group \(expected/)
})

test('ordered directory validation rejects duplicate numbers at locale root', async () => {
  const { validateOrderedDirectories } = await import('../lib/validate.js')
  const entries = new Set(['dir:01-first', 'dir:01-second'])
  assert.match(validateOrderedDirectories(entries).join('\n'), /duplicate.*01/i)
})

test('manifest validates every explicitly configured source directory', () => {
  const title = { zh: '主题', en: 'Subject' }
  const sections = [
    {
      kind: 'collection' as const,
      slug: 'one',
      directory: '../outside',
      title,
      entries: [{ slug: 'entry', directory: '_hidden', title }]
    },
    {
      kind: 'grouped' as const,
      slug: 'two',
      directory: '01-two',
      title,
      groups: [{ slug: 'group', directory: '100-group', title, entries: [] }]
    }
  ]
  const problems = validateManifest(sections).join('\n')
  assert.match(problems, /\.\.\/outside/)
  assert.match(problems, /_hidden/)
  assert.match(problems, /100-group/)
})

test('production manifest requires ordered directories matching each slug', () => {
  const title = { zh: '示例', en: 'Example' }
  const sections = [
    {
      kind: 'collection' as const,
      slug: 'one',
      directory: '01-wrong',
      title,
      entries: [{ slug: 'child', title }]
    },
    {
      kind: 'grouped' as const,
      slug: 'two',
      directory: '02-two',
      title,
      groups: [{ slug: 'group', directory: '01-wrong', title, entries: [] }]
    }
  ]
  const errors = validateManifest(sections, { requireDirectories: true }).join('\n')
  assert.match(errors, /01-wrong.*one/)
  assert.match(errors, /missing.*directory.*child/i)
  assert.match(errors, /01-wrong.*group/)
})
