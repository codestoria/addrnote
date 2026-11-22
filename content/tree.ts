import type { DefaultTheme } from 'vitepress'

/** The navigation projection needs only slugs and localized titles from the manifest. */
type Entry<L extends string> = {
  readonly slug: string
  readonly directory?: string
  readonly title: Readonly<Record<L, string>>
}
type Section<L extends string> = Entry<L> &
  (
    | {
        readonly kind: 'grouped'
        readonly groups: readonly (Entry<L> & {
          readonly entries: readonly (Entry<L> & { readonly directory: string })[]
        })[]
      }
    | { readonly kind: 'collection'; readonly entries: readonly Entry<L>[] }
    | { readonly kind: 'standalone' }
  )

export type NavigationNode = {
  text: string
  link: string
  items?: { text: string; link: string }[]
}

export function buildSiteTree<L extends string>(
  locale: L,
  sections: readonly Section<L>[],
  units: Record<string, DefaultTheme.SidebarItem[]>
) {
  const ordered = <T extends { readonly directory?: string }>(items: readonly T[]): readonly T[] =>
    items.every((item) => item.directory)
      ? [...items].sort((a, b) => a.directory!.localeCompare(b.directory!, 'en', { numeric: true }))
      : items
  const nav: NavigationNode[] = []
  const sidebars: Record<string, DefaultTheme.SidebarItem[]> = { ...units }
  const top: DefaultTheme.SidebarItem[] = []
  const insert = (key: string, items: DefaultTheme.SidebarItem[]) => {
    if (Object.hasOwn(sidebars, key)) throw new Error(`Duplicate sidebar prefix: ${key}`)
    sidebars[key] = items
  }
  for (const section of ordered(sections)) {
    const link = `/${locale}/${section.slug}/`
    const text = section.title[locale]
    if (section.kind === 'standalone') {
      nav.push({ text, link })
      top.push({ text, link })
      continue
    }
    const children = ordered(section.kind === 'grouped' ? section.groups : section.entries)
    nav.push({
      text,
      link,
      items: children.map((child) => ({
        text: child.title[locale],
        link: `${link}${child.slug}/`
      }))
    })
    const sidebarItems: DefaultTheme.SidebarItem[] =
      section.kind === 'grouped'
        ? ordered(section.groups).map((group) => {
            const groupLink = `${link}${group.slug}/`
            const item: DefaultTheme.SidebarItem = {
              text: group.title[locale],
              collapsed: false,
              items: [...group.entries]
                .sort((a, b) => a.directory.localeCompare(b.directory, 'en', { numeric: true }))
                .map((entry) => ({
                  text: entry.title[locale],
                  link: `${groupLink}${entry.slug}/`
                }))
            }
            insert(groupLink, [item])
            return item
          })
        : ordered(section.entries).map((entry) => ({
            text: entry.title[locale],
            link: `${link}${entry.slug}/`
          }))
    const item: DefaultTheme.SidebarItem = { text, collapsed: false, items: sidebarItems }
    insert(link, [item])
    top.push(item)
  }
  insert(`/${locale}/`, top)
  return { nav, sidebars }
}
