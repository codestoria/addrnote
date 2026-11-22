import type { Locale } from './locales.js'

export type LocalizedText = Readonly<Record<Locale, string>>

type ContentEntry = {
  readonly slug: string
  readonly directory?: string
  readonly title: LocalizedText
}

type ContentGroup = ContentEntry & {
  readonly entries: readonly (ContentEntry & { readonly directory: string })[]
}

export type ContentSection = ContentEntry & { readonly orderedRouteDepths?: readonly number[] } & (
    | { readonly kind: 'grouped'; readonly groups: readonly ContentGroup[] }
    | { readonly kind: 'collection'; readonly entries: readonly ContentEntry[] }
    | { readonly kind: 'standalone' }
  )

export type ContentUnit = {
  /** Public route segments for the content unit. */
  segments: string[]
  /** Source-directory segments, independent of display order. */
  directorySegments: string[]
  title: LocalizedText
}

export const CONTENT_SECTIONS: readonly ContentSection[] = [
  {
    kind: 'grouped',
    slug: 'languages',
    directory: '01-languages',
    orderedRouteDepths: [2],
    title: { zh: '编程语言', en: 'Languages' },
    groups: [
      {
        slug: 'cpp',
        directory: '01-cpp',
        title: { zh: 'C++', en: 'C++' },
        entries: [
          {
            slug: 'cpp-basic',
            directory: '01-cpp-basic',
            title: { zh: 'C++ 基础', en: 'C++ Basics' }
          },
          { slug: 'cpp-oop', directory: '02-cpp-oop', title: { zh: 'C++ OOP', en: 'C++ OOP' } },
          {
            slug: 'modern-cpp',
            directory: '03-modern-cpp',
            title: { zh: '现代 C++', en: 'Modern C++' }
          }
        ]
      },
      {
        slug: 'java',
        directory: '02-java',
        title: { zh: 'Java', en: 'Java' },
        entries: [
          {
            slug: 'java-basic',
            directory: '01-java-basic',
            title: { zh: 'Java 基础', en: 'Java Basics' }
          },
          { slug: 'java-oop', directory: '02-java-oop', title: { zh: 'Java OOP', en: 'Java OOP' } }
        ]
      }
    ]
  },
  {
    kind: 'collection',
    slug: 'frontend',
    directory: '02-frontend',
    orderedRouteDepths: [2],
    title: { zh: '前端', en: 'Frontend' },
    entries: [
      { slug: 'html', directory: '01-html', title: { zh: 'HTML', en: 'HTML' } },
      { slug: 'css', directory: '02-css', title: { zh: 'CSS', en: 'CSS' } },
      {
        slug: 'javascript',
        directory: '03-javascript',
        title: { zh: 'JavaScript', en: 'JavaScript' }
      }
    ]
  },
  {
    kind: 'collection',
    slug: 'backend',
    directory: '03-backend',
    orderedRouteDepths: [2],
    title: { zh: '后端', en: 'Backend' },
    entries: [
      { slug: 'java-web', directory: '01-java-web', title: { zh: 'Java Web', en: 'Java Web' } },
      { slug: 'go-web', directory: '02-go-web', title: { zh: 'Go Web', en: 'Go Web' } }
    ]
  },
  {
    kind: 'collection',
    slug: 'databases',
    directory: '04-databases',
    orderedRouteDepths: [2],
    title: { zh: '数据库', en: 'Databases' },
    entries: [
      { slug: 'mysql', directory: '01-mysql', title: { zh: 'MySQL', en: 'MySQL' } },
      { slug: 'redis', directory: '02-redis', title: { zh: 'Redis', en: 'Redis' } }
    ]
  },
  {
    kind: 'collection',
    slug: 'game-development',
    directory: '05-game-development',
    orderedRouteDepths: [2],
    title: { zh: '游戏开发', en: 'Game Development' },
    entries: [
      { slug: 'unity', directory: '01-unity', title: { zh: 'Unity', en: 'Unity' } },
      { slug: 'godot', directory: '02-godot', title: { zh: 'Godot', en: 'Godot' } },
      { slug: 'cocos', directory: '03-cocos', title: { zh: 'Cocos', en: 'Cocos' } }
    ]
  },
  {
    kind: 'standalone',
    slug: 'system-design',
    directory: '06-system-design',
    orderedRouteDepths: [2],
    title: { zh: '系统设计', en: 'System Design' }
  }
]

export function getContentUnits(
  sections: readonly ContentSection[] = CONTENT_SECTIONS
): ContentUnit[] {
  return sections.flatMap((section): ContentUnit[] => {
    switch (section.kind) {
      case 'grouped':
        return section.groups.flatMap((group) =>
          group.entries.map((entry) => ({
            segments: [section.slug, group.slug, entry.slug],
            directorySegments: [
              section.directory ?? section.slug,
              group.directory ?? group.slug,
              entry.directory
            ],
            title: entry.title
          }))
        )
      case 'collection':
        return section.entries.map((entry) => ({
          segments: [section.slug, entry.slug],
          directorySegments: [section.directory ?? section.slug, entry.directory ?? entry.slug],
          title: entry.title
        }))
      case 'standalone':
        return [
          {
            segments: [section.slug],
            directorySegments: [section.directory ?? section.slug],
            title: section.title
          }
        ]
    }
  })
}
