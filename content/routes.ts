import type { ContentSection } from './manifest.js'

export const ORDERED_DIRECTORY = /^(\d{2})-.+$/
const ORDERING_PREFIX = /^\d{2}-(?=.+)/

/** `index` counts source directories after the locale; `within` matches source path prefixes. */
export type OrderedRouteRule = { readonly index: number; readonly within?: readonly string[] }

/** Derive route rules only from the current content configuration. */
export function routeRulesForSections(
  sections: readonly ContentSection[]
): readonly OrderedRouteRule[] {
  const rules = sections.flatMap((section) =>
    section.orderedRouteDepths !== undefined
      ? section.orderedRouteDepths.map((index) => ({ index, within: [section.slug] }))
      : section.kind === 'grouped'
        ? section.groups.map((group) => ({ index: 2, within: [section.slug, group.slug] }))
        : []
  )
  const translateScope = (within: readonly string[] | undefined): readonly string[] | undefined => {
    if (!within?.length) return within
    const section = sections.find((item) => item.slug === within[0])
    if (!section) return within
    const scope = [...within]
    scope[0] = section.directory ?? section.slug
    if (section.kind === 'grouped' && scope.length > 1) {
      const group = section.groups.find((item) => item.slug === scope[1])
      if (group) scope[1] = group.directory ?? group.slug
    }
    return scope
  }
  return [
    ...(sections.some((section) => section.directory) ? [{ index: 0 }] : []),
    ...sections
      .filter((section) => section.directory)
      .map((section) => ({ index: 1, within: [section.directory!] })),
    ...rules.map((rule) => ({ ...rule, within: translateScope(rule.within) }))
  ]
}

export function stripOrderPrefix(segment: string): string {
  return segment.replace(ORDERING_PREFIX, '')
}

export function toPublicRouteSegments(
  sourceSegments: readonly string[],
  rules: readonly OrderedRouteRule[] = []
): string[] {
  return sourceSegments.map((segment, index) =>
    rules.some(
      (rule) =>
        rule.index === index &&
        (rule.within ?? []).every(
          (part, offset) => offset < index && sourceSegments[offset] === part
        )
    )
      ? stripOrderPrefix(segment)
      : segment
  )
}

export function rewriteOrderedDirectories(
  id: string,
  locales: readonly string[],
  rules: readonly OrderedRouteRule[] = []
): string {
  const [locale, ...segments] = id.split('/')
  if (!locales.includes(locale) || segments.length < 2) return id
  const file = segments.pop()!
  return [locale, ...toPublicRouteSegments(segments, rules), file].join('/')
}
