import path from 'node:path'
import { lstat } from 'node:fs/promises'
import { LOCALES } from '../../content/locales.js'
import { createDocumentReader } from './document-reader.js'
import { findLocaleDifferences } from './mirror.js'
import {
  collectAllMirrorEntries,
  collectMirrorEntries,
  rejectContentSymlinks,
  resolveLocaleRoot
} from './scan.js'

/** Report review markers; a marker records human review, not translation quality. */
export async function auditTranslations(
  projectRoot: string,
  changedPages?: ReadonlySet<string>,
  stats?: { checked: number }
): Promise<string[]> {
  if (stats) stats.checked = 0
  const readDocument = createDocumentReader()
  const issues: string[] = []
  const entriesByLocale: Record<string, Set<string>> = {}
  for (const locale of LOCALES) {
    const root = resolveLocaleRoot(projectRoot, locale)
    try {
      const info = await lstat(root)
      if (info.isSymbolicLink() || !info.isDirectory()) {
        issues.push(`${locale}: invalid locale root`)
        continue
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      issues.push(`${locale}: missing locale root`)
      continue
    }
    try {
      await rejectContentSymlinks(projectRoot, locale)
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('symbolic link in content:'))
        throw error
      issues.push(`${locale}: ${error.message}`)
      continue
    }
    const entries = await collectMirrorEntries(projectRoot, locale)
    entriesByLocale[locale] = await collectAllMirrorEntries(projectRoot, locale)
    if (!entries.has('file:index.md'))
      issues.push(`${locale}/index.md: missing locale landing page`)
    for (const entry of entries) {
      if (!entry.startsWith('file:')) continue
      const file = entry.slice(5)
      if (changedPages && !changedPages.has(`${locale}/${file}`)) continue
      if (stats) stats.checked++
      const { metadata } = await readDocument(
        path.join(resolveLocaleRoot(projectRoot, locale), file)
      )
      if (!Object.hasOwn(metadata, 'translation'))
        issues.push(`${locale}/${file}: missing translation review`)
      else if (metadata.translation === 'pending')
        issues.push(`${locale}/${file}: translation pending`)
      else if (metadata.translation !== 'complete')
        issues.push(`${locale}/${file}: invalid translation status`)
    }
  }
  if (LOCALES.every((locale) => Object.hasOwn(entriesByLocale, locale))) {
    const differences = findLocaleDifferences(entriesByLocale)
    for (const locale of LOCALES) {
      for (const missing of differences[locale])
        issues.push(`mirror missing in ${locale}: ${missing}`)
    }
  }
  return issues
}
