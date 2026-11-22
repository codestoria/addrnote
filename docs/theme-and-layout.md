# 主题与布局

[返回文档目录](README.md)

## 修改颜色、字体和品牌资源

1. 打开 `.vitepress/theme/styles/tokens.css` 查看亮色、暗色变量；`default-theme.css` 集中维护依赖默认主题 DOM 的首页、卡片、动画和布局规则。先查找已有 `--atm-` 或 VitePress `--vp-` 变量，再决定是否添加样式。
2. 修改 `notes/public/brand/` 下的图标和背景。站点配置中的 logo 位于 `.vitepress/site-config.ts`，favicon 使用 `SITE_BASE`；背景引用位于 `tokens.css`，动画样式位于 `default-theme.css`。
3. 运行 `npm run dev`，分别检查亮色、暗色、桌面和移动视口。部署在 `/addrnote/` 子路径下时，也要检查静态资源链接；自定义 Vue 组件中的站内链接可使用 `withBase`，参照 `DomainNavItem.vue`。

首页的文字、功能卡片等页面内容由 `notes/zh/index.md` 和 `notes/en/index.md` 维护；共享配置和界面翻译分别位于 `.vitepress/site-config.ts` 与 `content/locales.ts`。修改页面内容时维持双语目录镜像。

## 扩展 Vue 组件

1. 将组件放入 `.vitepress/theme/vue/`，根据需要编写 TypeScript 和样式。
2. 若 Markdown 或主题配置需要通过组件名使用，在 `.vitepress/theme/index.ts` 的 `enhanceApp` 中导入并注册，参照已有 `DomainNavItem`。
3. 若组件需要接收配置数据，明确其 props 类型和数据来源；当前导航的数据由 `content/tree.ts` 组装。新增或替换导航组件时，应同步调整注册名与数据适配，并检查桌面和移动菜单、键盘访问及子路径链接。
4. 运行 `npm run typecheck`、`npm test` 和 `npm run build`；布局及交互在预览中人工验收。

## 扩展页面布局

`.vitepress/theme/index.ts` 以 `SidebarLayout` 作为主题 `Layout`。`SidebarLayout.vue` 内部渲染 `DefaultTheme.Layout`，并根据 `page.filePath` 为 `index.md` 添加 `addrnote-index-page` 类；`default-theme.css` 再利用该类控制索引页的 aside。

要增加全站布局内容，可在 `SidebarLayout.vue` 中扩展默认布局或使用默认主题提供的布局插槽；先保留现有 `DefaultTheme.Layout` 和所需页面上下文，再检查首页、普通文档页和不同语言页。若只改变某些页面，可考虑在 Markdown frontmatter 中使用 VitePress 支持的页面配置，避免全站覆盖。

当前部分选择器依赖默认主题的内部 DOM 类名（例如 `.VPHome`、`.VPDoc`）。升级 VitePress 或替换主题时，需人工检查导航、首页背景和动画、文档侧栏与 aside。功能测试应使用虚拟内容测试扫描和路由，不应绑定现有 DOM、网页文字或导航排列。

## 修改点击动画

图标点击事件在 `.vitepress/theme/index.ts` 中绑定；动画位于 `default-theme.css`，持续时间变量位于 `tokens.css`。调整时同时核对事件目标、CSS 类和时长，并检查连续点击与减少动态效果的设置。
