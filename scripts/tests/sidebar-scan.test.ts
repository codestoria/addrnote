import assert from 'node:assert/strict'
import { test } from 'node:test'

import { rewriteOrderedDirectories } from '../../content/routes.js'

import { normalizeDisplayName, scanLocaleSidebar } from '../lib/scan.js'

import { createProject, fixtureUnits, flattenItems, writeDocument } from './sidebar-fixtures.js'

test('scans an injected content unit independently of the site manifest', async () => {
  const root = await createProject()
  await writeDocument(root, 'notes/en/example/group/100-topic/index.md')
  await writeDocument(
    root,
    'notes/en/example/group/100-topic/02-first.md',
    '---\ntitle: First\n---'
  )
  const units = [
    {
      segments: ['example', 'group', 'topic'],
      directorySegments: ['example', 'group', '100-topic'],
      title: { zh: '主题', en: 'Topic' }
    }
  ]
  const { sidebar } = await scanLocaleSidebar(root, 'en', units)
  const items = flattenItems(sidebar['/en/example/group/topic/'])
  assert.ok(items.some((item) => item.link === '/en/example/group/topic/02-first'))
})

test('nested sidebar links match VitePress rewrites when a slug starts with an ordering prefix', async () => {
  const root = await createProject()
  const units = [
    {
      segments: ['example', 'group', '01-topic'],
      directorySegments: ['example', 'group', '01-01-topic'],
      title: { zh: '主题', en: 'Topic' }
    }
  ]
  const files = ['chapter/index.md', 'chapter/deeper/note.md']
  for (const file of files) await writeDocument(root, `notes/en/example/group/01-01-topic/${file}`)
  const { sidebar } = await scanLocaleSidebar(root, 'en', units)
  const links = flattenItems(sidebar['/en/example/group/01-topic/']).map((item) => item.link)
  for (const file of files) {
    const source = `en/example/group/01-01-topic/${file}`
    const rewritten = rewriteOrderedDirectories(source, ['en'])
    const expected = `/${rewritten.replace(/index\.md$/, '').replace(/\.md$/, '')}`
    assert.ok(links.includes(expected), `Missing sidebar link ${expected}`)
  }
})

test('sidebar labels parse frontmatter and fall back for invalid titles', async () => {
  const root = await createProject()
  const fixtures = [
    ['01-plain.md', '---\ntitle: C++ Basics\n---\n', 'C++ Basics'],
    ['02-quoted.md', "---\ntitle: 'Java OOP'\n---\n", 'Java OOP'],
    ['03-folded.md', '---\ntitle: >\n  Memory model\n---\n', 'Memory model'],
    ['04-comment.md', '---\ntitle: Java basics # label\n---\n', 'Java basics'],
    ['05-body.md', '# Body\ntitle: Not frontmatter', 'body'],
    ['06-number.md', '---\ntitle: 123\n---\n', 'number'],
    ['07-boolean.md', '---\ntitle: true\n---\n', 'boolean']
  ]
  for (const [name, contents] of fixtures)
    await writeDocument(root, `notes/en/example/${name}`, contents)
  const units = [
    { segments: ['example'], directorySegments: ['example'], title: { zh: '示例', en: 'Example' } }
  ]
  const { sidebar } = await scanLocaleSidebar(root, 'en', units)
  assert.deepEqual(
    sidebar['/en/example/'].map((item) => item.text),
    fixtures.map(([, , title]) => title)
  )
})

test('normalizeDisplayName strips ordering prefixes but preserves meaningful digits', () => {
  assert.equal(normalizeDisplayName('01-memory-model.md'), 'memory model')
  assert.equal(normalizeDisplayName('10_smart-pointers.md'), 'smart pointers')
  assert.equal(normalizeDisplayName('3D-graphics.md'), '3D graphics')
  assert.equal(normalizeDisplayName('404.md'), '404')
})

test('sidebar discovers documents in natural order with their source routes', async () => {
  const root = await createProject()
  const unit = 'notes/zh/subjects/alpha/01-intro'
  await writeDocument(root, `${unit}/index.md`)
  await writeDocument(root, `${unit}/10-ten.md`)
  await writeDocument(root, `${unit}/2-two.md`)
  await writeDocument(root, `${unit}/01-one.md`, '---\ntitle: First\n---')
  await writeDocument(root, `${unit}/03-memory/01-stack.md`)
  const { sidebar } = await scanLocaleSidebar(root, 'zh', fixtureUnits, undefined, [{ index: 2 }])
  const items = flattenItems(sidebar['/zh/subjects/alpha/intro/'])
  const links = items.flatMap(({ link }) => (link ? [link] : []))
  const expected = ['01-one', '2-two', '03-memory/01-stack', '10-ten'].map(
    (file) => `/zh/subjects/alpha/intro/${file}`
  )
  const positions = expected.map((link) => links.indexOf(link))
  assert.ok(positions.every((position) => position >= 0))
  assert.ok(positions.every((position, index) => index === 0 || positions[index - 1] < position))
  assert.equal(items.find(({ link }) => link?.endsWith('/01-one'))?.text, 'First')
})

test('sidebar uses localized frontmatter titles for nested indexes and pages', async () => {
  const root = await createProject()
  for (const [locale, title] of [
    ['zh', '变量'],
    ['en', 'Variables']
  ]) {
    await writeDocument(root, `notes/${locale}/subjects/alpha/01-intro/index.md`)
    await writeDocument(
      root,
      `notes/${locale}/subjects/alpha/01-intro/01-variables/index.md`,
      `---\ntitle: ${title}\n---`
    )
    await writeDocument(
      root,
      `notes/${locale}/subjects/alpha/01-intro/01-variables/types.md`,
      `---\ntitle: ${title} types\n---`
    )
    const { sidebar } = await scanLocaleSidebar(root, locale as 'zh' | 'en', fixtureUnits)
    const items = flattenItems(sidebar[`/${locale}/subjects/alpha/intro/`])
    assert.equal(items.find(({ link }) => link?.endsWith('/01-variables/'))?.text, title)
    assert.equal(items.find(({ link }) => link?.endsWith('/types'))?.text, `${title} types`)
    assert.ok(items.every(({ link }) => !link || link.startsWith(`/${locale}/`)))
  }
})

test('sidebar ignores drafts and excluded directories', async () => {
  const root = await createProject()
  const unit = 'notes/en/subjects/beta/01-intro'
  await writeDocument(root, `${unit}/index.md`)
  await writeDocument(root, `${unit}/public.md`)
  for (const file of [
    '_draft.md',
    '_private/note.md',
    'node_modules/package/note.md',
    '.temp/note.md'
  ])
    await writeDocument(root, `${unit}/${file}`)
  const { sidebar } = await scanLocaleSidebar(root, 'en', fixtureUnits)
  const links = flattenItems(sidebar['/en/subjects/beta/intro/']).flatMap(({ link }) =>
    link ? [link] : []
  )
  assert.ok(links.includes('/en/subjects/beta/intro/public'))
  assert.ok(links.every((link) => !/_draft|_private|node_modules|\.temp/.test(link)))
})

test('sidebar scans collection and standalone content units', async () => {
  const root = await createProject()
  for (const unit of ['topics/one', 'guide']) {
    await writeDocument(root, `notes/en/${unit}/index.md`)
    await writeDocument(root, `notes/en/${unit}/demo.md`)
  }
  const { sidebar } = await scanLocaleSidebar(root, 'en', fixtureUnits)
  for (const unit of ['topics/one', 'guide']) {
    const links = flattenItems(sidebar[`/en/${unit}/`]).flatMap(({ link }) => (link ? [link] : []))
    assert.ok(links.includes(`/en/${unit}/demo`))
  }
})

test('sidebar scanning reports locale-relative paths for absent units', async () => {
  const root = await createProject()
  await writeDocument(root, 'notes/zh/topics/one/index.md')
  await writeDocument(root, 'notes/en/guide/index.md')

  const { missing } = await scanLocaleSidebar(root, 'zh', fixtureUnits)

  assert.ok(missing.includes('topics/two'))
  assert.ok(missing.includes('subjects/alpha/intro'))
  assert.ok(missing.includes('guide'))
  assert.equal(missing.includes('topics/one'), false)
})

test('a directory without an index keeps a nested indexed directory as a child', async () => {
  const root = await createProject()
  await writeDocument(
    root,
    'notes/en/example/01-parent/01-child/index.md',
    '---\ntitle: Child\n---\n'
  )
  await writeDocument(root, 'notes/en/example/01-parent/01-child/note.md')
  const units = [
    { segments: ['example'], directorySegments: ['example'], title: { zh: '示例', en: 'Example' } }
  ]
  const { sidebar } = await scanLocaleSidebar(root, 'en', units)
  const parent = sidebar['/en/example/'][0]
  assert.equal(parent.text, 'parent')
  assert.equal(parent.link, undefined)
  assert.equal(parent.items?.[0].text, 'Child')
  assert.equal(parent.items?.[0].link, '/en/example/01-parent/01-child/')
})

test('unit index links use their localized document title or home label', async () => {
  const root = await createProject()
  const units = [
    { segments: ['example'], directorySegments: ['example'], title: { zh: '示例', en: 'Example' } }
  ]
  await writeDocument(root, 'notes/zh/example/index.md', '---\ntitle: 入门\n---\n')
  await writeDocument(root, 'notes/en/example/index.md', '# Example\n')
  const zh = await scanLocaleSidebar(root, 'zh', units)
  const en = await scanLocaleSidebar(root, 'en', units)
  assert.deepEqual(zh.sidebar['/zh/example/'][0], { text: '入门', link: '/zh/example/' })
  assert.deepEqual(en.sidebar['/en/example/'][0], { text: 'Home', link: '/en/example/' })
})
