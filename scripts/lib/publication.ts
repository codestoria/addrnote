import { getContentUnits, type ContentSection } from '../../content/manifest.js'
import { PUBLICATION_ADDITIONS } from '../../content/publication.js'

/** Publication coverage is independent of how navigation is rendered. */
export type PublicationPolicy = {
  indexes: readonly string[]
  contentRoots: readonly string[]
}

/** Default policy preserves the existing manifest-based publication contract. */
export function publicationPolicyFromSections(
  sections: readonly ContentSection[]
): PublicationPolicy {
  return {
    indexes: [
      'index.md',
      ...PUBLICATION_ADDITIONS.indexes,
      ...sections.flatMap((section) => [
        `${section.directory ?? section.slug}/index.md`,
        ...(section.kind === 'grouped'
          ? section.groups.map(
              (group) =>
                `${section.directory ?? section.slug}/${group.directory ?? group.slug}/index.md`
            )
          : [])
      ])
    ],
    contentRoots: [
      ...getContentUnits(sections).map((unit) => unit.directorySegments.join('/')),
      ...PUBLICATION_ADDITIONS.contentRoots
    ]
  }
}

export function findUncoveredPages(files: readonly string[], policy: PublicationPolicy): string[] {
  const indexes = new Set(policy.indexes)
  return files.filter(
    (file) => !indexes.has(file) && !policy.contentRoots.some((root) => file.startsWith(`${root}/`))
  )
}

/** Use an independent policy when supplied; retain manifest-derived compatibility. */
export function resolvePublicationPolicy(
  sections: readonly ContentSection[],
  policy?: PublicationPolicy
): PublicationPolicy {
  return policy ?? publicationPolicyFromSections(sections)
}
