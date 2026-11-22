import type { ContentSection } from './manifest.js'

/** Sections omitted from navigation remain registered and publishable. */
export const HIDDEN_NAVIGATION_SECTIONS: readonly string[] = []

export function navigationSections(sections: readonly ContentSection[]): readonly ContentSection[] {
  return sections.filter((section) => !HIDDEN_NAVIGATION_SECTIONS.includes(section.slug))
}
