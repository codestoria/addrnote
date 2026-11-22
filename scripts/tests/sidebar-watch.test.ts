import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { cp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { generateSidebarData } from '../lib/site-data.js'

import { createProject, spawnSupervisor, writeDocument } from './sidebar-fixtures.js'

test('metadata edits during initial generation trigger a reload', { timeout: 12000 }, async (t) => {
  const root = await createProject()
  const sourceRoot = path.resolve(import.meta.dirname, '../..')
  await cp(path.join(sourceRoot, 'content'), path.join(root, 'content'), { recursive: true })
  await cp(path.join(sourceRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true })
  await mkdir(path.join(root, '.vitepress'), { recursive: true })
  await cp(path.join(sourceRoot, 'package.json'), path.join(root, 'package.json'))
  await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
  const manifest = path.join(root, 'content/manifest.ts')
  await writeFile(
    manifest,
    `export const CONTENT_SECTIONS = [{ kind: 'standalone', slug: 'fixture', title: { zh: '示例', en: 'Before edit' } }]
export function getContentUnits(sections = CONTENT_SECTIONS) { return sections.map(section => ({ segments: [section.slug], directorySegments: [section.directory ?? section.slug], title: section.title })) }
`
  )
  // A synthetic generator exposes a deterministic startup barrier without editing production code.
  await writeFile(
    path.join(root, 'scripts/lib/site-data.ts'),
    `
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CONTENT_SECTIONS } from '../../content/manifest.js'
export async function generateSidebarData(root) {
  const marker = path.join(root, 'started')
  if (!(await stat(marker).catch(() => null))) {
    await writeFile(marker, 'started')
    await new Promise(resolve => setTimeout(resolve, 1200))
  }
  const outputPath = path.join(root, '.vitepress/generated/sidebar-data.ts')
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(CONTENT_SECTIONS))
  return { changed: true, outputPath }
}
`
  )
  const child = spawnSupervisor(root)
  async function waitFor(file: string, text: string) {
    const end = Date.now() + 6000
    while (Date.now() < end) {
      if ((await readFile(file, 'utf8').catch(() => '')).includes(text)) return
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    assert.fail(`did not find ${text} in ${file}`)
  }
  await waitFor(path.join(root, 'started'), 'started')
  await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('Before edit', 'After edit'))
  await waitFor(path.join(root, '.vitepress/generated/sidebar-data.ts'), 'After edit')
})

test('strict generation rejects symbolic links in locale content', async () => {
  const root = await createProject()
  const sections = [
    { kind: 'standalone' as const, slug: 'fixture', title: { zh: '示例', en: 'Fixture' } }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/fixture/index.md`)
  }
  await symlink('index.md', path.join(root, 'notes/en/fixture/extra.md'))
  await assert.rejects(
    generateSidebarData(root, { sections, strict: true }),
    /symbolic link.*extra\.md/i
  )
})

test('strict generation rejects symbolic links at the locale root', async () => {
  const root = await createProject()
  const sections = [
    { kind: 'standalone' as const, slug: 'fixture', title: { zh: '示例', en: 'Fixture' } }
  ]
  await writeDocument(root, 'notes/zh/index.md')
  await writeDocument(root, 'notes/zh/fixture/index.md')
  await symlink('zh', path.join(root, 'notes/en'), 'dir')
  await assert.rejects(generateSidebarData(root, { sections, strict: true }), /symbolic link.*en/i)
})

test(
  'watch command recovers after a source syntax error is fixed',
  { timeout: 15000 },
  async (t) => {
    const root = await createProject()
    const sourceRoot = path.resolve(import.meta.dirname, '../..')
    await cp(path.join(sourceRoot, 'content'), path.join(root, 'content'), { recursive: true })
    await cp(path.join(sourceRoot, 'scripts'), path.join(root, 'scripts'), { recursive: true })
    await mkdir(path.join(root, '.vitepress'), { recursive: true })
    await cp(path.join(sourceRoot, 'package.json'), path.join(root, 'package.json'))
    await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
    const manifest = path.join(root, 'content/manifest.ts')
    const source = `export const CONTENT_SECTIONS = [{ kind: 'standalone', slug: 'fixture', directory: '01-fixture', title: { zh: '示例', en: 'Original' } }]
export function getContentUnits(sections = CONTENT_SECTIONS) { return sections.map(section => ({ segments: [section.slug], directorySegments: [section.directory ?? section.slug], title: section.title })) }
`
    await writeFile(manifest, source)
    const child = spawnSupervisor(root, ['ignore', 'pipe', 'pipe'])
    let output = ''
    child.stdout!.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr!.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    async function waitFor(text: string) {
      const deadline = Date.now() + 5000
      while (Date.now() < deadline) {
        if (output.includes(text)) return
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
      assert.fail(`missing ${text} in output: ${output}`)
    }
    await waitFor('[sidebar] watching')
    await writeFile(manifest, 'export const CONTENT_SECTIONS = [\n')
    await waitFor('watcher stopped; restart the development command')
    await writeFile(manifest, source.replace('Original', 'Recovered'))
    const generated = path.join(root, '.vitepress/generated/sidebar-data.ts')
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      if ((await readFile(generated, 'utf8').catch(() => '')).includes('Recovered')) return
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    assert.fail(`sidebar did not recover: ${output}`)
  }
)

test('strict publication can include a content root without adding a navigation item', async () => {
  const root = await createProject()
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'guide',
      directory: '01-guide',
      title: { zh: '指南', en: 'Guide' }
    }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/01-guide/index.md`)
    await writeDocument(root, `notes/${locale}/02-reference/api.md`)
  }
  const result = await generateSidebarData(root, {
    strict: true,
    sections,
    publication: {
      indexes: ['index.md', '01-guide/index.md'],
      contentRoots: ['01-guide', '02-reference']
    }
  })
  const { siteData } = await import(pathToFileURL(result.outputPath).href)
  assert.equal(
    siteData.en.nav.some((item: { link: string }) => item.link.includes('reference')),
    false
  )
  const changed = await generateSidebarData(root, {
    strict: true,
    sections,
    publication: {
      indexes: ['index.md', '01-guide/index.md'],
      contentRoots: ['01-guide', '02-reference']
    },
    buildNavigation: (_locale, _sections, sidebars) => ({ nav: [], sidebars })
  })
  const updated = await readFile(changed.outputPath, 'utf8')
  assert.match(updated, /"nav": \[\]/)
})

test('strict generation rejects VitePress pages outside configured locale trees', async () => {
  const root = await createProject()
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'guide',
      directory: '01-guide',
      title: { zh: '指南', en: 'Guide' }
    }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/01-guide/index.md`)
  }
  await writeDocument(root, 'notes/orphan.md')
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections }),
    /unvalidated.*orphan\.md/i
  )
})

test('strict generation allows the explicitly published root entry', async () => {
  const root = await createProject()
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'guide',
      directory: '01-guide',
      title: { zh: '指南', en: 'Guide' }
    }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/01-guide/index.md`)
  }
  await writeDocument(root, 'notes/index.md')
  await generateSidebarData(root, { strict: true, sections })
})

test('strict generation rejects a shared entry that is a symbolic link', async () => {
  const root = await createProject()
  const sections = [
    { kind: 'standalone' as const, slug: 'guide', title: { zh: '指南', en: 'Guide' } }
  ]
  for (const locale of ['zh', 'en']) {
    await writeDocument(root, `notes/${locale}/index.md`)
    await writeDocument(root, `notes/${locale}/guide/index.md`)
  }
  await symlink('en/index.md', path.join(root, 'notes/index.md'))
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections }),
    /symbolic link.*index\.md/i
  )
})

test('watcher notices assets in hidden directories', { timeout: 8000 }, async (t) => {
  const { watchSidebar } = await import('../lib/watch.js')
  const root = await createProject()
  for (const locale of ['zh', 'en'])
    await writeDocument(root, `notes/${locale}/.hidden/seed.svg`, 'seed')
  const events = new EventEmitter()
  const close = await watchSidebar(root, async () => {
    events.emit('regenerated')
  })
  t.after(close)
  const regenerated = once(events, 'regenerated')
  await writeDocument(root, 'notes/zh/.hidden/asset.svg', 'image')
  await regenerated
})
