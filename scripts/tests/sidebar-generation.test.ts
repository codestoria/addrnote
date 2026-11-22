import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { rewriteOrderedDirectories } from '../../content/routes.js'

import { collectMirrorEntries, scanLocaleSidebar } from '../lib/scan.js'
import { findLocaleDifferences, generateSidebarData } from '../lib/site-data.js'
import { watchSidebar } from '../lib/watch.js'

import {
  createProject,
  fixtureSections,
  fixtureUnits,
  flattenItems,
  writeDocument
} from './sidebar-fixtures.js'

test('mirror comparison reports language-specific missing entries', async () => {
  const root = await createProject()
  await writeDocument(root, 'notes/zh/subjects/alpha/01-intro/index.md')
  await writeDocument(root, 'notes/zh/subjects/alpha/01-intro/only-zh.md')
  await writeDocument(root, 'notes/en/subjects/alpha/01-intro/index.md')
  await writeDocument(root, 'notes/en/subjects/beta/01-intro/index.md')

  const zhEntries = await collectMirrorEntries(root, 'zh')
  const enEntries = await collectMirrorEntries(root, 'en')

  assert.deepEqual(findLocaleDifferences({ zh: zhEntries, en: enEntries }), {
    en: ['file:subjects/alpha/01-intro/only-zh.md'],
    zh: ['dir:subjects/beta', 'dir:subjects/beta/01-intro', 'file:subjects/beta/01-intro/index.md']
  })
})

test('mirror comparison covers the complete locale trees', async () => {
  const root = await createProject()
  await writeDocument(root, 'notes/zh/topics/one/demo.md')
  await writeDocument(root, 'notes/en/topics/two/demo.md')

  const zhEntries = await collectMirrorEntries(root, 'zh')
  const enEntries = await collectMirrorEntries(root, 'en')

  assert.deepEqual(findLocaleDifferences({ zh: zhEntries, en: enEntries }), {
    en: ['dir:topics/one', 'file:topics/one/demo.md'],
    zh: ['dir:topics/two', 'file:topics/two/demo.md']
  })
})

test('generateSidebarData writes isolated locale exports and remains stable', async () => {
  const root = await createProject()
  await writeDocument(
    root,
    'notes/zh/subjects/alpha/01-intro/index.md',
    '---\ntitle: C++ 基础\n---'
  )
  await writeDocument(
    root,
    'notes/en/subjects/alpha/01-intro/index.md',
    '---\ntitle: C++ Basics\n---'
  )

  await writeDocument(root, 'notes/zh/subjects/alpha/01-intro/example.md', '---\ntitle: 示例\n---')
  await writeDocument(
    root,
    'notes/en/subjects/alpha/01-intro/example.md',
    '---\ntitle: Example\n---'
  )

  const first = await generateSidebarData(root, { sections: fixtureSections })
  const firstContent = await readFile(first.outputPath, 'utf8')
  const second = await generateSidebarData(root, { sections: fixtureSections })

  assert.equal(first.changed, true)
  assert.equal(second.changed, false)
  const { siteData } = await import(pathToFileURL(first.outputPath).href)
  for (const locale of ['zh', 'en']) {
    const prefix = `/${locale}/subjects/alpha/intro/`
    assert.ok(siteData[locale].sidebars[prefix])
    const item = flattenItems(siteData[locale].sidebars[prefix]).find(
      (entry) => entry.link === `${prefix}example`
    )
    assert.equal(item?.text, locale === 'zh' ? '示例' : 'Example')
  }
  assert.equal(await readFile(second.outputPath, 'utf8'), firstContent)
})

test(
  'watch mode regenerates for an edit made during its initial generation',
  { timeout: 5000 },
  async (t) => {
    const root = await createProject()
    const page = 'notes/zh/topics/one/index.md'
    await writeDocument(root, page, '# Original')
    await writeDocument(root, 'notes/en/topics/one/index.md')
    const events = new EventEmitter()
    const regenerated = once(events, 'regenerated')

    const close = await watchSidebar(root, async () => {
      const content = await readFile(path.join(root, page), 'utf8')
      if (content === '# Original') {
        await writeDocument(root, page, '# Edited')
      } else {
        events.emit('regenerated', content)
      }
    })
    t.after(close)

    assert.deepEqual(await regenerated, ['# Edited'])
  }
)

test('filesystem errors are not mistaken for missing content', async () => {
  const root = await createProject()
  await writeDocument(root, 'notes/zh', 'not a directory')
  await assert.rejects(scanLocaleSidebar(root, 'zh', fixtureUnits), { code: 'ENOTDIR' })
})

test('generation rejects duplicate manifest entries before scanning or writing', async () => {
  const root = await createProject()
  const title = { zh: '示例', en: 'Example' }
  const cases = [
    {
      sections: [
        { kind: 'standalone' as const, slug: 'guide', title },
        { kind: 'standalone' as const, slug: 'guide', title }
      ],
      pattern: /duplicate section slug.*guide/i
    },
    {
      sections: [
        {
          kind: 'collection' as const,
          slug: 'topics',
          title,
          entries: [
            { slug: 'one', title },
            { slug: 'one', title }
          ]
        }
      ],
      pattern: /duplicate.*topics.*slug.*one/i
    },
    {
      sections: [
        {
          kind: 'grouped' as const,
          slug: 'subjects',
          title,
          groups: [
            { slug: 'group', title, entries: [] },
            { slug: 'group', title, entries: [] }
          ]
        }
      ],
      pattern: /duplicate.*subjects.*slug.*group/i
    },
    {
      sections: [
        {
          kind: 'grouped' as const,
          slug: 'subjects',
          title,
          groups: [
            {
              slug: 'group',
              title,
              entries: [
                { slug: 'one', directory: '01-one', title },
                { slug: 'two', directory: '01-one', title }
              ]
            }
          ]
        }
      ],
      pattern: /duplicate source.*subjects\/group\/01-one/i
    }
  ]
  for (const { sections, pattern } of cases) {
    for (const strict of [false, true]) {
      await assert.rejects(generateSidebarData(root, { sections, strict }), pattern)
    }
  }
  await assert.rejects(readFile(path.join(root, '.vitepress/generated/sidebar-data.ts')), {
    code: 'ENOENT'
  })
})

test('strict generation rejects missing units before writing output', async () => {
  const root = await createProject()
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections: fixtureSections }),
    /missing content units/i
  )
  await assert.rejects(readFile(path.join(root, '.vitepress/generated/sidebar-data.ts')), {
    code: 'ENOENT'
  })
})

test('generation rejects unsafe manifest paths and missing localized titles before writing', async () => {
  const root = await createProject()
  const title = { zh: '示例', en: 'Example' }
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 'subjects',
      title,
      groups: [
        {
          slug: '../escape',
          title,
          entries: [{ slug: 'intro', directory: '01/intro', title: { zh: ' ', en: 'Intro' } }]
        }
      ]
    }
  ]
  await assert.rejects(generateSidebarData(root, { sections }), (error: Error) => {
    assert.match(error.message, /invalid.*slug.*\.\.\/escape/i)
    assert.match(error.message, /invalid.*directory.*01\/intro/i)
    assert.match(error.message, /invalid.*title.*zh/i)
    return true
  })
  await assert.rejects(readFile(path.join(root, '.vitepress/generated/sidebar-data.ts')), {
    code: 'ENOENT'
  })
})

test('closing the watcher waits for an in-flight regeneration', { timeout: 5000 }, async () => {
  const root = await createProject()
  const page = 'notes/zh/topics/one/index.md'
  await writeDocument(root, page, '# Original')
  await writeDocument(root, 'notes/en/topics/one/index.md')
  const events = new EventEmitter()
  let release!: () => void
  const blocked = new Promise<void>((resolve) => {
    release = resolve
  })
  let calls = 0
  const started = once(events, 'started')
  const close = await watchSidebar(root, async () => {
    if (++calls === 1) {
      await writeDocument(root, page, '# Changed')
    } else {
      events.emit('started')
      await blocked
    }
  })
  await started
  let closed = false
  const closing = close().then(() => {
    closed = true
  })
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(closed, false)
  release()
  await closing
  assert.equal(closed, true)
})

test('custom route policy is persisted for VitePress and sidebar links', async () => {
  const { createSiteConfig } = await import('../../.vitepress/site-config.js')
  const root = await createProject()
  const sections = [
    { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/example/index.md`)
    await writeDocument(root, `notes/${locale}/example/01-chapter/note.md`)
  }
  const result = await generateSidebarData(root, {
    sections,
    routeRules: [{ index: 1, within: ['example'] }]
  })
  const { siteData, routeRules } = await import(pathToFileURL(result.outputPath).href)
  const config = createSiteConfig(siteData, routeRules)
  assert.equal(
    typeof config.rewrites === 'function' && config.rewrites('en/example/01-chapter/note.md'),
    'en/example/chapter/note.md'
  )
  assert.ok(
    flattenItems(siteData.en.sidebars['/en/example/']).some(
      (item) => item.link === '/en/example/chapter/note'
    )
  )
})

test('a new grouped category derives ordered routes consistently from its manifest', async () => {
  const root = await createProject()
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 'synthetic',
      title: { zh: '主题', en: 'Topics' },
      groups: [
        {
          slug: 'group',
          title: { zh: '组', en: 'Group' },
          entries: [{ slug: 'intro', directory: '01-intro', title: { zh: '入门', en: 'Intro' } }]
        }
      ]
    }
  ]
  for (const locale of ['zh', 'en'])
    await writeDocument(root, `notes/${locale}/synthetic/group/01-intro/index.md`)
  const result = await generateSidebarData(root, { sections })
  const { routeRules } = await import(pathToFileURL(result.outputPath).href)
  assert.equal(
    rewriteOrderedDirectories('en/synthetic/group/01-intro/index.md', ['en'], routeRules),
    'en/synthetic/group/intro/index.md'
  )
})

test('strict mirror includes hidden files and non-Markdown assets', async () => {
  const root = await createProject()
  const sections = [
    { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/example/index.md`)
  }
  await writeDocument(root, 'notes/zh/example/.hidden/image.svg', '<svg/>')
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections }),
    /mirror differences:.*\.hidden\/image\.svg/
  )
})

test('mirror comparison includes ordinary cache directories', async () => {
  const { collectAllMirrorEntries } = await import('../lib/scan.js')
  const root = await createProject()
  await writeDocument(root, 'notes/zh/guide/cache/guide.md')
  await writeDocument(root, 'notes/en/guide/index.md')
  const zh = await collectAllMirrorEntries(root, 'zh')
  const en = await collectAllMirrorEntries(root, 'en')
  assert.ok(findLocaleDifferences({ zh, en }).en.includes('file:guide/cache/guide.md'))
})
