const DRAFT_PREFIX = '_'

/** Exclusion rules for VitePress and sidebar scanning, maintained together. */
export const SOURCE_EXCLUDES = [
  'superpowers/**',
  `**/${DRAFT_PREFIX}*.md`,
  `**/${DRAFT_PREFIX}*/**`
]

/** Directory names ignored by VitePress default discovery, covered by fixture tests. */
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', 'dist'])

export function isIgnoredName(name: string): boolean {
  return name.startsWith(DRAFT_PREFIX) || name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(name)
}
