import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getContentUnits } from '../../content/manifest.js'
import { rewriteOrderedDirectories, toPublicRouteSegments } from '../../content/routes.js'

test('reordering grouped entries does not change existing source paths', () => {
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 'subjects',
      title: { zh: '语言', en: 'Languages' },
      groups: [
        {
          slug: 'example',
          title: { zh: 'C++', en: 'C++' },
          entries: [
            { slug: 'new', directory: '03-new', title: { zh: '新', en: 'New' } },
            { slug: 'basic', directory: '01-basic', title: { zh: '基础', en: 'Basic' } }
          ]
        }
      ]
    }
  ]
  assert.deepEqual(
    getContentUnits(sections).map((unit) => unit.directorySegments.join('/')),
    ['subjects/example/03-new', 'subjects/example/01-basic']
  )
})

const syntheticRules = [{ index: 2 }]

test('ordered directories support exactly two digits', () => {
  assert.equal(
    rewriteOrderedDirectories('en/subject/group/01-topic/index.md', ['en'], syntheticRules),
    'en/subject/group/topic/index.md'
  )
  assert.equal(
    rewriteOrderedDirectories('en/subject/group/100-topic/index.md', ['en'], syntheticRules),
    'en/subject/group/100-topic/index.md'
  )
  assert.equal(
    rewriteOrderedDirectories('en/subject/group/1-topic/index.md', ['en'], syntheticRules),
    'en/subject/group/1-topic/index.md'
  )
})

test('source path conversion preserves nested numbering while stripping the supported directory', () => {
  const source = ['subject', 'group', '01-topic', '02-chapter']
  assert.deepEqual(toPublicRouteSegments(source, syntheticRules), [
    'subject',
    'group',
    'topic',
    '02-chapter'
  ])
  assert.deepEqual(source, ['subject', 'group', '01-topic', '02-chapter'])
})

test('ordered route rewriting is consistent across synthetic content types and depths', () => {
  const cases: [string, string][] = [
    ['en/subject/group/01-topic/index.md', 'en/subject/group/topic/index.md'],
    ['en/collection/unit/01-chapter/note.md', 'en/collection/unit/chapter/note.md'],
    ['en/standalone/01-chapter/note.md', 'en/standalone/01-chapter/note.md'],
    ['en/subject/group/01-topic/02-chapter/note.md', 'en/subject/group/topic/02-chapter/note.md']
  ]
  for (const [source, expected] of cases)
    assert.equal(rewriteOrderedDirectories(source, ['en'], syntheticRules), expected)
})

test('route policy can select multiple ordered depths without changing default URLs', () => {
  const rule = [
    { index: 1, within: ['domain'] },
    { index: 3, within: ['domain'] }
  ]
  assert.deepEqual(toPublicRouteSegments(['domain', '01-group', '02-topic', '03-chapter'], rule), [
    'domain',
    'group',
    '02-topic',
    'chapter'
  ])
  assert.equal(
    rewriteOrderedDirectories('en/domain/01-group/02-topic/03-chapter/note.md', ['en'], rule),
    'en/domain/group/02-topic/chapter/note.md'
  )
  assert.deepEqual(toPublicRouteSegments(['other', '01-group'], rule), ['other', '01-group'])
})

test('new unrelated sections retain numbered directory names in public URLs', () => {
  assert.equal(
    rewriteOrderedDirectories('en/new-area/group/01-topic/index.md', ['en']),
    'en/new-area/group/01-topic/index.md'
  )
})

test('a section can explicitly select ordered route depths', async () => {
  const { routeRulesForSections } = await import('../../content/routes.js')
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'manual',
      title: { zh: '手册', en: 'Manual' },
      orderedRouteDepths: [1]
    }
  ]
  const rules = routeRulesForSections(sections)
  assert.equal(
    rewriteOrderedDirectories('en/manual/01-chapter/note.md', ['en'], rules),
    'en/manual/chapter/note.md'
  )
  assert.equal(
    rewriteOrderedDirectories('en/other/01-chapter/note.md', ['en'], rules),
    'en/other/01-chapter/note.md'
  )
})

test('grouped sidebars order entries by source directory prefixes', async () => {
  const { buildSiteTree } = await import('../../content/tree.js')
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 's',
      title: { en: 'S' },
      groups: [
        {
          slug: 'g',
          title: { en: 'G' },
          entries: [
            { slug: 'later', directory: '02-later', title: { en: 'Later' } },
            { slug: 'first', directory: '01-first', title: { en: 'First' } }
          ]
        }
      ]
    }
  ]
  const items = buildSiteTree('en', sections, {}).sidebars['/en/s/g/'][0].items!
  assert.deepEqual(
    items.map((item) => item.link),
    ['/en/s/g/first/', '/en/s/g/later/']
  )
})

test('numbered structural source directories retain their public paths', async () => {
  const { routeRulesForSections } = await import('../../content/routes.js')
  const { publicationPolicyFromSections } = await import('../lib/publication.js')
  const sections = [
    {
      kind: 'grouped' as const,
      slug: 'subject',
      directory: '01-subject',
      title: { zh: '主题', en: 'Subject' },
      groups: [
        {
          slug: 'group',
          directory: '02-group',
          title: { zh: '组', en: 'Group' },
          entries: [{ slug: 'intro', directory: '01-intro', title: { zh: '入门', en: 'Intro' } }]
        }
      ]
    }
  ]
  assert.deepEqual(getContentUnits(sections)[0].directorySegments, [
    '01-subject',
    '02-group',
    '01-intro'
  ])
  assert.equal(
    rewriteOrderedDirectories(
      'en/01-subject/02-group/01-intro/index.md',
      ['en'],
      routeRulesForSections(sections)
    ),
    'en/subject/group/intro/index.md'
  )
  assert.ok(
    publicationPolicyFromSections(sections).indexes.includes('01-subject/02-group/index.md')
  )
})

test('route rules depend only on the supplied section configuration', async () => {
  const { routeRulesForSections } = await import('../../content/routes.js')
  assert.deepEqual(routeRulesForSections([]), [])
  const sections = [
    {
      kind: 'standalone' as const,
      slug: 'sample',
      directory: '01-sample',
      title: { zh: '例', en: 'Sample' }
    }
  ]
  const rules = routeRulesForSections(sections)
  assert.equal(
    rewriteOrderedDirectories('en/01-sample/01-child/02-topic/note.md', ['en'], rules),
    'en/sample/child/02-topic/note.md'
  )
})
