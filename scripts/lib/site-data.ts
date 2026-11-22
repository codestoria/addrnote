import { lstat, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { routeRulesForSections, type OrderedRouteRule } from '../../content/routes.js'
import { SOURCE_EXCLUDES } from '../../content/exclusions.js'
import { SOURCE_DIRECTORY } from '../../content/site.js'
import { SHARED_PUBLICATION_PAGES } from '../../content/publication.js'
import { CONTENT_SECTIONS, getContentUnits, type ContentSection } from '../../content/manifest.js'
import { LOCALES, type Locale } from '../../content/locales.js'
import { navigationSections as defaultNavigationSections } from '../../content/navigation.js'
import { buildSiteTree } from '../../content/tree.js'
import {
  collectMirrorEntries,
  collectAllMirrorEntries,
  rejectContentSymlinks,
  resolveLocaleRoot,
  scanLocaleSidebar
} from './scan.js'
import { validateLocalePages, validateManifest } from './validate.js'
import { createDocumentReader } from './document-reader.js'
import { resolvePublicationPolicy, type PublicationPolicy } from './publication.js'

import { findLocaleDifferences } from './mirror.js'
export { findLocaleDifferences } from './mirror.js'

export type GenerationResult = {
  changed: boolean
  outputPath: string
  differences: Record<Locale, string[]>
}

export async function generateSidebarData(
  projectRoot = process.cwd(),
  options: {
    strict?: boolean
    sections?: readonly ContentSection[]
    navigationSections?: readonly ContentSection[]
    publication?: PublicationPolicy
    routeRules?: readonly OrderedRouteRule[]
    scanSidebar?: typeof scanLocaleSidebar
    buildNavigation?: typeof buildSiteTree
  } = {}
): Promise<GenerationResult> {
  const sections = options.sections ?? CONTENT_SECTIONS
  const manifestProblems = validateManifest(sections, { requireDirectories: !options.sections })
  if (manifestProblems.length) throw new Error(manifestProblems.join('\n'))
  const navigationSections =
    options.navigationSections ??
    (options.sections ? sections : defaultNavigationSections(sections))
  const units = getContentUnits(sections)
  const routeRules = options.routeRules ?? routeRulesForSections(sections)
  const publication = resolvePublicationPolicy(sections, options.publication)
  const readDocument = createDocumentReader()
  const scanSidebar = options.scanSidebar ?? scanLocaleSidebar
  const buildNavigation = options.buildNavigation ?? buildSiteTree
  await Promise.all(LOCALES.map((locale) => rejectContentSymlinks(projectRoot, locale)))
  const scans = await Promise.all(
    LOCALES.map(async (locale) => ({
      locale,
      ...(await scanSidebar(projectRoot, locale, units, readDocument, routeRules)),
      entries: await collectMirrorEntries(projectRoot, locale),
      mirrorEntries: await collectAllMirrorEntries(projectRoot, locale)
    }))
  )
  const differences = findLocaleDifferences(
    Object.fromEntries(scans.map(({ locale, mirrorEntries }) => [locale, mirrorEntries]))
  ) as Record<Locale, string[]>
  if (options.strict) {
    const problems: string[] = []
    // The development watcher does not need VitePress's page resolver.
    const { resolvePages } = await import('vitepress')
    const logger: Parameters<typeof resolvePages>[2] = {
      info: console.log,
      warn: console.warn,
      warnOnce: console.warn,
      error: console.error,
      clearScreen: () => {},
      hasErrorLogged: () => false,
      hasWarned: false
    }
    const { pages } = await resolvePages(
      path.join(projectRoot, SOURCE_DIRECTORY),
      { srcExclude: SOURCE_EXCLUDES },
      logger
    )
    const validated = new Set(
      scans.flatMap(({ locale, entries }) =>
        [...entries]
          .filter((entry) => entry.startsWith('file:'))
          .map((entry) => `${locale}/${entry.slice(5)}`)
      )
    )
    for (const page of SHARED_PUBLICATION_PAGES) {
      if (!pages.includes(page)) continue
      const sharedPath = path.join(projectRoot, SOURCE_DIRECTORY, page)
      if ((await lstat(sharedPath)).isSymbolicLink()) {
        problems.push(`symbolic link in content: ${sharedPath}`)
        continue
      }
      const { metadata } = await readDocument(sharedPath)
      if (
        Object.hasOwn(metadata, 'title') &&
        (typeof metadata.title !== 'string' || !metadata.title.trim())
      )
        problems.push(`invalid title: ${page} (expected a nonempty string)`)
      validated.add(page)
    }
    problems.push(
      ...pages
        .filter((page) => !validated.has(page))
        .map((page) => `unvalidated published page: ${page}`)
    )
    for (const { locale, missing, entries, mirrorEntries } of scans) {
      problems.push(
        ...(await validateLocalePages(
          projectRoot,
          locale,
          entries,
          sections,
          readDocument,
          publication,
          routeRules,
          mirrorEntries
        ))
      )
      if (missing.length) problems.push(`missing content units in ${locale}: ${missing.join(', ')}`)
      for (const unit of units) {
        const index = path.join(
          resolveLocaleRoot(projectRoot, locale),
          ...unit.directorySegments,
          'index.md'
        )
        try {
          if (!(await stat(index)).isFile()) problems.push(`missing index: ${index}`)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
          problems.push(`missing index: ${index}`)
        }
      }
      if (differences[locale].length)
        problems.push(`mirror differences: missing in ${locale}: ${differences[locale].join(', ')}`)
    }
    if (problems.length) throw new Error(problems.join('\n'))
  }
  const outputPath = path.join(projectRoot, '.vitepress', 'generated', 'sidebar-data.ts')
  const siteData = Object.fromEntries(
    scans.map(({ locale, sidebar }) => {
      return [locale, buildNavigation(locale, navigationSections, sidebar)]
    })
  )
  const output = serializeSidebarData(siteData, routeRules)
  const previousOutput = await readFile(outputPath, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    }
  )
  const changed = previousOutput !== output

  if (changed) {
    await mkdir(path.dirname(outputPath), { recursive: true })
    const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temporaryPath, output, 'utf8')
    await rename(temporaryPath, outputPath)
  }

  for (const { locale, missing } of scans) {
    logMissingContentUnits(locale, missing)
    if (differences[locale].length)
      console.warn(`[sidebar] missing in ${locale}: ${differences[locale].join(', ')}`)
  }
  return { changed, outputPath, differences }
}

function serializeSidebarData(siteData: unknown, routeRules: readonly OrderedRouteRule[]): string {
  return [
    '// Generated by scripts/gen-sidebar.ts. Do not edit or format manually.',
    "import type { DefaultTheme } from 'vitepress'",
    "import type { Locale } from '../../content/locales'",
    "import type { NavigationNode } from '../../content/tree'",
    '',
    `export const siteData = ${JSON.stringify(siteData, null, 2)} satisfies Record<Locale, { nav: NavigationNode[]; sidebars: DefaultTheme.SidebarMulti }>`,
    `export const routeRules = ${JSON.stringify(routeRules)} as const`,
    ''
  ].join('\n')
}

function logMissingContentUnits(locale: Locale, missing: string[]): void {
  if (missing.length > 0) {
    console.warn(`[sidebar] missing content units in ${locale}: ${missing.join(', ')}`)
  }
}
