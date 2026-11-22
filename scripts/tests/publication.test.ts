import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findUncoveredPages } from '../lib/publication.js'

test('publication coverage can allow pages independently of navigation entries', () => {
  const policy = { indexes: ['index.md'], contentRoots: ['guides', 'reference'] }
  assert.deepEqual(
    findUncoveredPages(['index.md', 'guides/note.md', 'reference/api.md', 'other.md'], policy),
    ['other.md']
  )
})

test('generation can choose sidebar and navigation projections independently', async (t) => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const path = await import('node:path')
  const { generateSidebarData } = await import('../lib/site-data.js')
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-projections-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const output = await generateSidebarData(root, {
    sections: [],
    scanSidebar: async () => ({ sidebar: { '/example/': [{ text: 'Scanned' }] }, missing: [] }),
    buildNavigation: (_locale, _sections, sidebars) => ({
      nav: [{ text: 'Projected', link: '/example/' }],
      sidebars
    })
  })
  const text = await readFile(output.outputPath, 'utf8')
  assert.match(text, /Scanned/)
  assert.match(text, /Projected/)
})

test('strict publication survives removing a section from navigation', async (t) => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const path = await import('node:path')
  const { generateSidebarData } = await import('../lib/site-data.js')
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-nav-independent-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en']) {
    await mkdir(path.join(root, 'notes', locale, '01-guide'), { recursive: true })
    await writeFile(path.join(root, 'notes', locale, 'index.md'), '# Home')
    await writeFile(path.join(root, 'notes', locale, '01-guide', 'index.md'), '# Guide')
    await writeFile(path.join(root, 'notes', locale, '01-guide', 'note.md'), '# Note')
  }
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'guide',
      directory: '01-guide',
      title: { zh: '指南', en: 'Guide' }
    }
  ]
  const result = await generateSidebarData(root, { strict: true, sections, navigationSections: [] })
  const { readFile } = await import('node:fs/promises')
  const data = await readFile(result.outputPath, 'utf8')
  assert.equal((data.match(/"nav": \[\]/g) ?? []).length, 2)
})

test('an explicit publication policy does not change with navigation sections', async () => {
  const { resolvePublicationPolicy } = await import('../lib/publication.js')
  const policy = { indexes: ['index.md'], contentRoots: ['reference'] }
  const sections = [
    { kind: 'standalone' as const, slug: 'guide', title: { zh: '指南', en: 'Guide' } }
  ]
  assert.deepEqual(resolvePublicationPolicy(sections, policy), policy)
  assert.deepEqual(resolvePublicationPolicy([], policy), policy)
  assert.ok(resolvePublicationPolicy(sections).contentRoots.includes('guide'))
})

test('default publication derives coverage for newly registered units', async () => {
  const { resolvePublicationPolicy } = await import('../lib/publication.js')
  const sections = [
    {
      kind: 'collection' as const,
      slug: 'new-area',
      title: { zh: '新', en: 'New' },
      entries: [{ slug: 'intro', title: { zh: '入门', en: 'Intro' } }]
    }
  ]
  const policy = resolvePublicationPolicy(sections)
  assert.deepEqual(findUncoveredPages(['new-area/index.md', 'new-area/intro/note.md'], policy), [])
})
