import { stat } from 'node:fs/promises'
import { createDocumentReader, type DocumentReader } from './document-reader.js'
import path from 'node:path'
import {
  CONTENT_SECTIONS,
  getContentUnits,
  type ContentUnit,
  type ContentSection
} from '../../content/manifest.js'
import { LOCALES, type Locale } from '../../content/locales.js'
import { isIgnoredName } from '../../content/exclusions.js'
import {
  ORDERED_DIRECTORY,
  stripOrderPrefix,
  rewriteOrderedDirectories,
  type OrderedRouteRule
} from '../../content/routes.js'
import { resolveLocaleRoot } from './scan.js'
import {
  findUncoveredPages,
  publicationPolicyFromSections,
  type PublicationPolicy
} from './publication.js'

export function validateOrderedDirectories(entries: Set<string>): string[] {
  const directories = [...entries]
    .filter((entry) => entry.startsWith('dir:'))
    .map((entry) => entry.slice(4))
  const seen = new Map<string, string>()
  const duplicates: string[] = []
  for (const directory of directories) {
    const match = /^(?:(.*\/))?(\d{2})-.+$/.exec(directory)
    if (!match) continue
    const key = `${match[1] ?? ''}${match[2]}`
    const previous = seen.get(key)
    if (previous)
      duplicates.push(`duplicate directory order ${match[2]}: ${previous} and ${directory}`)
    else seen.set(key, directory)
  }
  return [
    ...duplicates,
    ...directories
      .filter((directory) => !ORDERED_DIRECTORY.test(directory.split('/').at(-1)!))
      .map((directory) => `invalid ordered directory: ${directory} (expected NN-name)`)
  ]
}

/** Check manifest identities before generating navigation or reading content. */
export function validateManifest(
  sections: readonly ContentSection[],
  options: { requireDirectories?: boolean } = {}
): string[] {
  const problems: string[] = []
  function checkPathSegment(value: string, label: string) {
    if (!value || isIgnoredName(value) || /[\s\\/?#%]/.test(value))
      problems.push(`invalid ${label}: ${value}`)
  }
  function checkEntry(
    entry: {
      readonly slug: string
      readonly directory?: string
      readonly title: Readonly<Record<Locale, string>>
    },
    scope: string
  ) {
    checkPathSegment(entry.slug, `${scope} slug`)
    if (options.requireDirectories && entry.directory === undefined)
      problems.push(`missing directory for ${scope} ${entry.slug}`)
    if (entry.directory !== undefined) {
      checkPathSegment(entry.directory, `${scope} directory`)
      if (!ORDERED_DIRECTORY.test(entry.directory))
        problems.push(
          `invalid ordered directory for ${scope}: ${entry.directory} (expected NN-name)`
        )
      else if (options.requireDirectories && stripOrderPrefix(entry.directory) !== entry.slug)
        problems.push(`directory ${entry.directory} does not match slug ${entry.slug} in ${scope}`)
    }
    for (const locale of LOCALES) {
      if (typeof entry.title[locale] !== 'string' || !entry.title[locale].trim())
        problems.push(`invalid title for ${scope} ${entry.slug}: ${locale}`)
    }
  }
  function checkSlugs(items: readonly { readonly slug: string }[], scope: string) {
    const seen = new Set<string>()
    for (const { slug } of items) {
      if (seen.has(slug)) problems.push(`duplicate ${scope} slug: ${slug}`)
      seen.add(slug)
    }
  }
  checkSlugs(sections, 'section')
  for (const section of sections) {
    checkEntry(section, 'section')
    if (section.kind === 'collection') {
      checkSlugs(section.entries, `entry in ${section.slug}`)
      for (const entry of section.entries) checkEntry(entry, `entry in ${section.slug}`)
    } else if (section.kind === 'grouped') {
      checkSlugs(section.groups, `group in ${section.slug}`)
      for (const group of section.groups) {
        checkEntry(group, `group in ${section.slug}`)
        checkSlugs(group.entries, `entry in ${section.slug}/${group.slug}`)
        const orderNumbers = new Set<string>()
        for (const entry of group.entries) {
          checkEntry(entry, `entry in ${section.slug}/${group.slug}`)
          const order = /^(\d{2})-/.exec(entry.directory)?.[1]
          if (order && orderNumbers.has(order))
            problems.push(`duplicate directory order ${order}: ${section.slug}/${group.slug}`)
          if (order) orderNumbers.add(order)
        }
      }
    }
  }
  const units = getContentUnits(sections)
  for (const [label, select] of [
    ['public unit path', (unit: ContentUnit) => unit.segments.join('/')],
    ['source unit path', (unit: ContentUnit) => unit.directorySegments.join('/')]
  ] as const) {
    const seen = new Set<string>()
    for (const unit of units) {
      const value = select(unit)
      if (seen.has(value)) problems.push(`duplicate ${label}: ${value}`)
      seen.add(value)
    }
  }
  return problems
}

export function validateUnitRoutes(
  units: readonly ContentUnit[],
  locale: Locale,
  routeRules?: readonly OrderedRouteRule[]
): string[] {
  return units.flatMap((unit) => {
    const source = `${locale}/${unit.directorySegments.join('/')}/index.md`
    const expected = `${locale}/${unit.segments.join('/')}/index.md`
    const actual = rewriteOrderedDirectories(source, LOCALES, routeRules)
    return actual === expected
      ? []
      : [`unit route mismatch: ${source} -> ${actual}, expected ${expected}`]
  })
}

/** Validate publication coverage, metadata, required indexes, and rewritten route collisions. */
export async function validateLocalePages(
  projectRoot: string,
  locale: Locale,
  entries: Set<string>,
  sections: readonly ContentSection[] = CONTENT_SECTIONS,
  readDocument: DocumentReader = createDocumentReader(),
  policy: PublicationPolicy = publicationPolicyFromSections(sections),
  routeRules?: readonly OrderedRouteRule[],
  directoryEntries: Set<string> = entries
): Promise<string[]> {
  const problems = validateUnitRoutes(getContentUnits(sections), locale, routeRules)
  problems.push(
    ...validateOrderedDirectories(directoryEntries).map((problem) => `${locale}: ${problem}`)
  )
  const root = resolveLocaleRoot(projectRoot, locale)
  const requiredIndexes = policy.indexes
  for (const index of requiredIndexes) {
    try {
      if (!(await stat(path.join(root, index))).isFile())
        problems.push(`missing navigation index: ${locale}/${index}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      problems.push(`missing navigation index: ${locale}/${index}`)
    }
  }
  const files = [...entries]
    .filter((entry) => entry.startsWith('file:'))
    .map((entry) => entry.slice(5))
  problems.push(
    ...findUncoveredPages(files, policy).map((file) => `uncovered page: ${locale}/${file}`)
  )
  const routes = new Map<string, string>()
  for (const entry of entries) {
    if (!entry.startsWith('file:')) continue
    const file = entry.slice(5)
    const { metadata } = await readDocument(path.join(root, file))
    if (
      Object.hasOwn(metadata, 'title') &&
      (metadata.title == null || (typeof metadata.title === 'string' && !metadata.title.trim()))
    )
      problems.push(`empty title: ${locale}/${file}`)
    if (
      Object.hasOwn(metadata, 'title') &&
      metadata.title != null &&
      typeof metadata.title !== 'string'
    )
      problems.push(`invalid title: ${locale}/${file} (expected a string)`)
    if (Object.hasOwn(metadata, 'translation')) {
      if (metadata.translation === 'pending')
        problems.push(`translation pending: ${locale}/${file}`)
      else if (metadata.translation !== 'complete')
        problems.push(`invalid translation status: ${locale}/${file}`)
    }
    const rewritten = rewriteOrderedDirectories(`${locale}/${file}`, LOCALES, routeRules)
    const route = rewritten.replace(/\.md$/i, '.html')
    const previous = routes.get(route)
    if (previous) problems.push(`route collision: ${previous} and ${locale}/${file} -> ${route}`)
    else routes.set(route, `${locale}/${file}`)
  }
  return problems
}
