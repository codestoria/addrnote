import type { DefaultTheme } from 'vitepress'
import { DEFAULT_BRANCH, REPOSITORY_URL, SOURCE_DIRECTORY } from './site.js'

const socialLinks: DefaultTheme.SocialLink[] = [
  { icon: 'github', link: REPOSITORY_URL, ariaLabel: 'GitHub' }
]

export const LOCALE_META = {
  zh: {
    homeLabel: '首页',
    search: {
      translations: {
        button: {
          buttonText: '搜索文档',
          buttonAriaLabel: '搜索文档'
        },
        modal: {
          displayDetails: '显示详细列表',
          noResultsText: '没有找到相关结果',
          resetButtonTitle: '清除查询',
          backButtonTitle: '关闭搜索',
          footer: {
            selectText: '选择',
            selectKeyAriaLabel: '回车键',
            navigateText: '切换',
            navigateUpKeyAriaLabel: '向上箭头',
            navigateDownKeyAriaLabel: '向下箭头',
            closeText: '关闭',
            closeKeyAriaLabel: 'Esc 键'
          }
        }
      }
    },
    site: {
      label: '简体中文',
      lang: 'zh-CN',
      title: '址笺',
      description: '定位每一份知识',
      themeConfig: {
        siteTitle: '址笺',
        outline: { label: '本页目录', level: [2, 3] },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: { text: '最后更新' },
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到内容',
        socialLinks,
        editLink: {
          pattern: `${REPOSITORY_URL}/edit/${DEFAULT_BRANCH}/${SOURCE_DIRECTORY}/:path`,
          text: '在 GitHub 编辑此页'
        }
      }
    }
  },
  en: {
    homeLabel: 'Home',
    search: {
      translations: {
        button: {
          buttonText: 'Search',
          buttonAriaLabel: 'Search documentation'
        },
        modal: {
          displayDetails: 'Display detailed list',
          noResultsText: 'No results found',
          resetButtonTitle: 'Clear query',
          backButtonTitle: 'Close search',
          footer: {
            selectText: 'Select',
            selectKeyAriaLabel: 'Enter key',
            navigateText: 'Navigate',
            navigateUpKeyAriaLabel: 'Up arrow',
            navigateDownKeyAriaLabel: 'Down arrow',
            closeText: 'Close',
            closeKeyAriaLabel: 'Escape key'
          }
        }
      }
    },
    site: {
      label: 'English',
      lang: 'en-US',
      title: 'Addrnote',
      description: 'Locate every piece of knowledge.',
      themeConfig: {
        siteTitle: 'Addrnote',
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdated: { text: 'Last updated' },
        darkModeSwitchLabel: 'Appearance',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
        skipToContentLabel: 'Skip to content',
        socialLinks,
        editLink: {
          pattern: `${REPOSITORY_URL}/edit/${DEFAULT_BRANCH}/${SOURCE_DIRECTORY}/:path`,
          text: 'Edit this page on GitHub'
        }
      }
    }
  }
} satisfies Record<
  string,
  {
    homeLabel: string
    search: object
    site: {
      label: string
      lang: string
      title: string
      description: string
      themeConfig: DefaultTheme.Config
    }
  }
>

export const LOCALES = Object.keys(LOCALE_META) as (keyof typeof LOCALE_META)[]
export type Locale = keyof typeof LOCALE_META
