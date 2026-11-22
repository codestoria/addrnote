import type { DefaultTheme } from 'vitepress'
import type { NavigationNode } from '../content/tree.js'

export const DOMAIN_NAV_COMPONENT = 'DomainNavItem'

export function adaptNavigation(nodes: readonly NavigationNode[]): DefaultTheme.NavItem[] {
  return nodes.map(({ items, ...link }) =>
    items ? { component: DOMAIN_NAV_COMPONENT, props: { ...link, items } } : link
  )
}
