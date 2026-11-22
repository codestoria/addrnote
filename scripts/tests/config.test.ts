import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createMarkdownRenderer, resolveConfig } from 'vitepress'
import { collectMirrorEntries } from '../lib/scan.js'
import { generateSidebarData } from '../lib/site-data.js'
import { createSiteConfig } from '../../.vitepress/site-config.js'
import { LOCALES } from '../../content/locales.js'
import { DEFAULT_BRANCH, REPOSITORY_URL, SOURCE_DIRECTORY } from '../../content/site.js'

const config = createSiteConfig(
  Object.fromEntries(
    LOCALES.map((locale) => [locale, { nav: [], sidebars: {} }])
  ) as unknown as Parameters<typeof createSiteConfig>[0]
)

test('locale roots are configured', () => {
  assert.ok(config.locales)
  assert.deepEqual(Object.keys(config.locales), LOCALES)
  for (const locale of LOCALES) {
    assert.equal(config.locales[locale]?.link, `/${locale}/`)
  }
})

test('VitePress discovers only public pages among repository plans and drafts', async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'addrnote-publication-'))
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }))

  const fixtureFiles = {
    '.vitepress/config.mjs': `export default ${JSON.stringify({ srcDir: config.srcDir, srcExclude: config.srcExclude })}`,
    'notes/superpowers/plans/task.md': '# Repository plan\n',
    'notes/en/_draft.md': '# Draft page\n',
    'notes/en/_drafts/index.md': '# Page in a draft directory\n',
    'notes/en/.temp/note.md': '# Temporary page\n',
    'notes/en/node_modules/package/note.md': '# Dependency page\n',
    'notes/en/dist/note.md': '# Build output\n',
    'notes/en/.hidden.md': '# Hidden file\n',
    'notes/en/.hidden/note.md': '# Hidden directory\n',
    'notes/en/UPPER.MD': '# Uppercase extension\n',
    'notes/en/index.md': '# Public page\n',
    'notes/en/guide/note.md': '# Public note\n',
    'notes/en/guide/_draft.md': '# Hidden note\n'
  }
  for (const [relativePath, content] of Object.entries(fixtureFiles)) {
    const file = path.join(fixtureRoot, relativePath.replace(/^notes\//, `${SOURCE_DIRECTORY}/`))
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
  }

  const { pages } = await resolveConfig(fixtureRoot, 'build', 'production')

  assert.deepEqual(pages.sort(), ['en/guide/note.md', 'en/index.md'])
  const scannedFiles = [...(await collectMirrorEntries(fixtureRoot, 'en'))]
    .filter((entry) => entry.startsWith('file:'))
    .map((entry) => `en/${entry.slice(5)}`)
    .sort()
  assert.deepEqual(scannedFiles, pages.sort())
})

test('edit links point to files below notes', () => {
  const zhPattern = config.locales?.zh?.themeConfig?.editLink?.pattern
  const enPattern = config.locales?.en?.themeConfig?.editLink?.pattern
  assert.equal(zhPattern, `${REPOSITORY_URL}/edit/${DEFAULT_BRANCH}/${SOURCE_DIRECTORY}/:path`)
  assert.equal(enPattern, `${REPOSITORY_URL}/edit/${DEFAULT_BRANCH}/${SOURCE_DIRECTORY}/:path`)
})

test('VitePress applies an injected ordered-directory route policy', () => {
  const synthetic = createSiteConfig(
    Object.fromEntries(
      LOCALES.map((locale) => [locale, { nav: [], sidebars: {} }])
    ) as unknown as Parameters<typeof createSiteConfig>[0],
    [{ index: 2, within: ['subject'] }]
  )
  assert.equal(
    typeof synthetic.rewrites === 'function' &&
      synthetic.rewrites('en/subject/group/01-topic/index.md'),
    'en/subject/group/topic/index.md'
  )
})

test('strict generation blocks a symlink that VitePress would publish', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-links-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, '.vitepress'), { recursive: true })
  await writeFile(path.join(root, '.vitepress/config.mjs'), `export default { srcDir: 'notes' }`)
  for (const locale of ['zh', 'en']) {
    const unit = path.join(root, 'notes', locale, 'example')
    await mkdir(unit, { recursive: true })
    await writeFile(path.join(root, 'notes', locale, 'index.md'), '# Home')
    await writeFile(path.join(unit, 'index.md'), '# Example')
  }
  await symlink('index.md', path.join(root, 'notes/en/example/extra.md'))
  const { pages } = await resolveConfig(root, 'build', 'production')
  assert.ok(pages.includes('en/example/extra.md'))
  const sections = [
    { kind: 'standalone' as const, slug: 'example', title: { zh: '示例', en: 'Example' } }
  ]
  await assert.rejects(
    generateSidebarData(root, { strict: true, sections }),
    /symbolic link.*extra\.md/i
  )
})

test('Mermaid fences are transformed while ordinary code fences remain code', async () => {
  const markdown = await createMarkdownRenderer(process.cwd(), config.markdown, '/')
  const rendered = markdown.render(
    '```mermaid\nflowchart LR\n  A --> B\n```\n\n```text\nplain\n```'
  )
  assert.match(rendered, /<Mermaid\b/)
  assert.match(rendered, /mermaid-diagram/)
  assert.match(rendered, /plain/)
})
