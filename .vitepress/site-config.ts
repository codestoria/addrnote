import { defineConfig, type DefaultTheme } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import type { NavigationNode } from '../content/tree'
import { adaptNavigation } from './nav-adapter'
import { SOURCE_EXCLUDES } from '../content/exclusions'
import { LOCALES, LOCALE_META, type Locale } from '../content/locales'
import { rewriteOrderedDirectories, type OrderedRouteRule } from '../content/routes'
import { SITE_BASE, SOURCE_DIRECTORY } from '../content/site'

export function createSiteConfig(
  siteData: Record<Locale, { nav: NavigationNode[]; sidebars: DefaultTheme.SidebarMulti }>,
  routeRules?: readonly OrderedRouteRule[]
) {
  return withMermaid(
    defineConfig({
      title: LOCALE_META.en.site.title,
      description: LOCALE_META.en.site.description,
      mermaid: { theme: 'default', securityLevel: 'strict' },
      mermaidPlugin: { class: 'mermaid-diagram' },
      head: [
        [
          'link',
          { rel: 'icon', type: 'image/svg+xml', href: `${SITE_BASE}brand/addrnote-icon.svg` }
        ]
      ],
      base: SITE_BASE,
      srcDir: SOURCE_DIRECTORY,
      rewrites: (id) => rewriteOrderedDirectories(id, LOCALES, routeRules),
      cleanUrls: false,
      lastUpdated: true,
      srcExclude: SOURCE_EXCLUDES,
      themeConfig: {
        logo: { src: '/brand/addrnote-icon.svg', alt: 'Addrnote' },
        search: {
          provider: 'local',
          options: {
            locales: Object.fromEntries(
              LOCALES.map((locale) => [locale, LOCALE_META[locale].search])
            )
          }
        }
      },
      locales: Object.fromEntries(
        LOCALES.map((locale) => {
          const site = LOCALE_META[locale].site
          return [
            locale,
            {
              ...site,
              link: `/${locale}/`,
              themeConfig: {
                ...site.themeConfig,
                nav: adaptNavigation(siteData[locale].nav),
                sidebar: siteData[locale].sidebars
              }
            }
          ]
        })
      )
    })
  )
}
