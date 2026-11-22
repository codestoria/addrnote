import { lstat, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { isIgnoredName } from '../../content/exclusions.js'
import { getContentUnits, type ContentUnit } from '../../content/manifest.js'
import { LOCALE_META, type Locale } from '../../content/locales.js'
import { toPublicRouteSegments, type OrderedRouteRule } from '../../content/routes.js'
import { SOURCE_DIRECTORY } from '../../content/site.js'
import { createDocumentReader, type DocumentReader } from './document-reader.js'

export type SidebarItem = {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

export type SidebarMulti = Record<string, SidebarItem[]>

const naturalCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base'
})

function compareNames(left: string, right: string): number {
  if (left === 'index.md') return right === 'index.md' ? 0 : -1
  if (right === 'index.md') return 1
  return naturalCollator.compare(left, right)
}

function titleFromMetadata(metadata: Record<string, unknown>): string | undefined {
  const title = metadata.title
  if (typeof title === 'string') return title.trim() || undefined
  return undefined
}

export function normalizeDisplayName(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .replace(/^\d+[\s._-]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

export function resolveLocaleRoot(projectRoot: string, locale: Locale): string {
  return path.join(projectRoot, SOURCE_DIRECTORY, locale)
}

async function inspectContentUnits(
  projectRoot: string,
  locale: Locale,
  units: readonly ContentUnit[]
) {
  const localeRoot = resolveLocaleRoot(projectRoot, locale)
  const present: { unitPath: string; segments: string[]; directorySegments: string[] }[] = []
  const missing: string[] = []

  for (const { segments, directorySegments } of units) {
    const unitPath = path.join(localeRoot, ...directorySegments)
    if (await directoryExists(unitPath)) {
      present.push({ unitPath, segments, directorySegments })
    } else {
      missing.push(segments.join('/'))
    }
  }

  return { present, missing }
}

export async function scanLocaleSidebar(
  projectRoot: string,
  locale: Locale,
  units: readonly ContentUnit[] = getContentUnits(),
  readDocument: DocumentReader = createDocumentReader(),
  routeRules?: readonly OrderedRouteRule[]
) {
  const { present, missing } = await inspectContentUnits(projectRoot, locale, units)
  const routeRoot = `/${locale}`
  const sidebar: SidebarMulti = {}
  for (const { unitPath, segments, directorySegments } of present) {
    const routePrefix = `${routeRoot}/${segments.join('/')}/`
    sidebar[routePrefix] = await buildDirectoryItems(
      unitPath,
      routeRoot,
      segments,
      directorySegments,
      locale,
      readDocument,
      routeRules
    )
  }

  return { sidebar, missing }
}

/** Reject links before scanning: VitePress follows them, but the content tree must be mirrored. */
export async function rejectContentSymlinks(projectRoot: string, locale: Locale): Promise<void> {
  const sourceRoot = path.join(projectRoot, SOURCE_DIRECTORY)
  const root = resolveLocaleRoot(projectRoot, locale)
  for (const directory of [sourceRoot, root]) {
    try {
      if ((await lstat(directory)).isSymbolicLink())
        throw new Error(`symbolic link in content: ${directory}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
  }
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`symbolic link in content: ${entryPath}`)
      if (entry.isDirectory()) await visit(entryPath)
    }
  }
  await visit(root)
}

export async function collectMirrorEntries(
  projectRoot: string,
  locale: Locale
): Promise<Set<string>> {
  const root = resolveLocaleRoot(projectRoot, locale)
  const entries = new Set<string>()
  if (!(await directoryExists(root))) return entries

  async function visit(currentPath: string, segments: string[]): Promise<void> {
    const directoryEntries = (await readdir(currentPath, { withFileTypes: true })).sort(
      (left, right) => compareNames(left.name, right.name)
    )

    for (const entry of directoryEntries) {
      if (isIgnoredName(entry.name)) continue
      const relativeSegments = [...segments, entry.name]
      const relativePath = relativeSegments.join('/')

      if (entry.isDirectory()) {
        entries.add(`dir:${relativePath}`)
        await visit(path.join(currentPath, entry.name), relativeSegments)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        entries.add(`file:${relativePath}`)
      }
    }
  }

  await visit(root, [])
  return entries
}

/** Compare all paths in locale trees, including hidden files and assets. */
export async function collectAllMirrorEntries(
  projectRoot: string,
  locale: Locale
): Promise<Set<string>> {
  const root = resolveLocaleRoot(projectRoot, locale)
  const entries = new Set<string>()
  if (!(await directoryExists(root))) return entries
  async function visit(directory: string, prefix: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isSymbolicLink())
        throw new Error(`symbolic link in content: ${path.join(directory, entry.name)}`)
      if (entry.isDirectory()) {
        entries.add(`dir:${relative}`)
        await visit(path.join(directory, entry.name), relative)
      } else if (entry.isFile()) entries.add(`file:${relative}`)
    }
  }
  await visit(root, '')
  return entries
}

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    return (await stat(directoryPath)).isDirectory()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

/** Traverse a content unit and project its documents into sidebar items. */
async function buildDirectoryItems(
  directoryPath: string,
  routeRoot: string,
  routeSegments: string[],
  sourceSegments: string[],
  locale: Locale,
  readDocument: DocumentReader,
  routeRules: readonly OrderedRouteRule[] | undefined
): Promise<SidebarItem[]> {
  async function visit(parts: string[]): Promise<SidebarItem[]> {
    const directory = path.join(directoryPath, ...parts)
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => !isIgnoredName(entry.name))
      .sort((a, b) => compareNames(a.name, b.name))
    const items: SidebarItem[] = []
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childParts = [...parts, entry.name]
        const children = await visit(childParts)
        const childRoute = toPublicRouteSegments([...sourceSegments, ...childParts], routeRules)
        const index = children.find((item) => item.link === `${routeRoot}/${childRoute.join('/')}/`)
        const other = children.filter((item) => item !== index)
        if (index)
          items.push({ ...index, ...(other.length ? { collapsed: false, items: other } : {}) })
        else if (other.length)
          items.push({ text: normalizeDisplayName(entry.name), collapsed: false, items: other })
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const isIndex = entry.name === 'index.md'
        const { metadata } = await readDocument(path.join(directory, entry.name))
        const nested = parts.length
          ? toPublicRouteSegments([...sourceSegments, ...parts], routeRules)
          : routeSegments
        const link = isIndex
          ? `${routeRoot}/${nested.join('/')}/`
          : `${routeRoot}/${[...nested, entry.name.replace(/\.md$/, '')].join('/')}`
        const text =
          titleFromMetadata(metadata) ??
          (isIndex && !parts.length
            ? LOCALE_META[locale].homeLabel
            : normalizeDisplayName(isIndex ? parts.at(-1)! : entry.name))
        items.push({ text, link })
      }
    }
    return items
  }
  return visit([])
}
