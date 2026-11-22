# 项目结构和数据流

[返回文档目录](README.md)

## 顶层目录

| 路径                                | 作用                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `.vitepress/`                       | VitePress 配置、自定义主题和本地生成数据。                      |
| `content/`                          | 站点元数据、内容清单、路径和导航树规则；不是文章正文目录。      |
| `notes/`                            | VitePress 的 `srcDir`；包含中文、英文 Markdown 和公开静态资源。 |
| `scripts/`                          | 侧边栏生成、监听、开发进程、测试和 Git hook 安装脚本。          |
| `.github/workflows/`                | GitHub Actions 检查及 GitHub Pages 部署。                       |
| `docs/`                             | 当前维护文档；位于 `notes/` 外，不参与站点页面发现。            |
| `drafts/`                           | 仓库内的草稿目录，位于站点源目录之外。                          |
| `resources/`                        | 仓库内的资源目录，位于站点源目录之外。                          |
| `.vscode/`                          | 编辑器项目设置。                                                |
| `package.json`、`package-lock.json` | npm 命令、依赖和锁定版本。                                      |
| `tsconfig.json`                     | TypeScript 和 Vue 类型检查范围及编译选项。                      |
| `.prettierrc`、`.prettierignore`    | 格式化规则和排除范围。                                          |
| `.gitignore`                        | Git 忽略规则。                                                  |
| `local-ci.sh`                       | 从仓库根目录运行 `npm run check`。                              |
| `README.md`                         | 项目介绍和维护文档入口。                              |

`node_modules/` 为本地依赖；`.vitepress/generated/`、`.vitepress/cache/`、`.vitepress/dist/` 是生成数据或构建产物，不应手动维护。

## 配置和主题

| 文件                                     | 作用                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `.vitepress/config.ts`                   | 导入生成的 `siteData`，交给配置工厂。                                                                             |
| `.vitepress/site-config.ts`              | 创建 VitePress 配置，适配导航数据并组合语言、搜索、路径改写、侧边栏及 Mermaid。可用虚拟数据调用，不依赖真实文章。 |
| `.vitepress/theme/index.ts`              | 扩展默认主题、注册 `DomainNavItem`、安装布局和图标点击动画。                                                      |
| `.vitepress/theme/vue/DomainNavItem.vue` | 自定义桌面导航及移动菜单项。                                                                                      |
| `.vitepress/theme/vue/SidebarLayout.vue` | 包装默认布局，为 `index.md` 页面添加样式类。                                                                      |
| `.vitepress/theme/page-layout.ts`        | 判断路径是否为 `index.md`。                                                                                       |
| `.vitepress/theme/styles/`               | 品牌变量及默认主题兼容样式，二者分文件维护。                                                                      |
| `.vitepress/theme/vue-shim.d.ts`         | Vue 单文件组件的 TypeScript 声明。                                                                                |

## 内容元数据

| 文件                     | 作用                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `content/manifest.ts`    | 声明知识域、分组、内容单元、目录和多语言标题；`getContentUnits` 将其转换为扫描单元。 |
| `content/locales.ts`     | 声明语言、站点文字、搜索翻译和编辑链接。                                             |
| `content/site.ts`        | 源目录、部署 base、仓库地址和默认分支。                                              |
| `content/routes.ts`      | 将指定层级的有序目录映射到公开路由。                                                 |
| `content/publication.ts` | 可独立于导航追加的发布覆盖路径。                                                     |
| `content/navigation.ts`  | 配置需要从导航中隐藏的已注册知识域。                                                 |
| `content/tree.ts`        | 将清单与扫描结果组装为 VitePress 导航和多路由侧边栏。                                |
| `content/exclusions.ts`  | 集中维护项目的发布排除规则及扫描忽略名称。                                           |

## 脚本与测试

| 文件                                | 作用                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `scripts/gen-sidebar.ts`            | 生成器命令入口；支持 `--strict` 和 `--watch`。                   |
| `scripts/lib/mirror.ts`             | 比较各语言目录中的相对路径。                                     |
| `scripts/lib/translation-audit.ts`  | 检查翻译审核标记和语言镜像。                                     |
| `scripts/lib/scan.ts`               | 扫描内容单元、提取标题、排序，并收集语言镜像路径。               |
| `scripts/lib/validate.ts`           | 检查清单重复项、目录与公开路由、入口页和页面冲突。               |
| `scripts/lib/document-reader.ts`    | 单次生成内共享文档解析结果；下次生成重新读取。                   |
| `scripts/lib/publication.ts`        | 构建并检查发布覆盖策略。                                         |
| `scripts/lib/site-data.ts`          | 协调扫描、严格校验、组装及写入生成数据。                         |
| `scripts/lib/watch.ts`              | 监听语言目录变化，合并事件并排队重新生成。                       |
| `scripts/dev.sh`                    | 并行启动 VitePress 开发服务和生成器监听，退出时清理进程。        |
| `scripts/install-hooks.sh`          | 安装仓库提供的 pre-commit hook，不覆盖已有 hook。                |
| `scripts/hooks/pre-commit`          | 调用 `local-ci.sh`。                                             |
| `scripts/tests/config.test.ts`      | 用虚拟数据检查配置、发布排除和路由规则。                         |
| `scripts/tests/content-map.test.ts` | 检查清单源目录和编号路由规则。                                   |
| `scripts/tests/sidebar-*.test.ts`  | 用临时内容检查扫描、生成、校验及监听。                           |
| `scripts/tests/prettier.test.ts`    | 检查 Markdown 格式化行为。                                       |
| `.github/workflows/deploy.yml`      | 在 PR、`main` 推送和手动触发时检查；符合条件时上传并部署 Pages。 |

## 数据如何到达页面

1. `content/manifest.ts` 声明内容单元；生成器扫描各语言目录中的 Markdown，读取 frontmatter 标题并排序。
2. `scripts/lib/validate.ts` 和 `site-data.ts` 在严格模式下检查入口、路由冲突、覆盖范围和语言镜像；清单重复检查在普通及严格生成中均生效。
3. `content/tree.ts` 将清单和扫描结果组装成站点数据；生成器写入 `.vitepress/generated/sidebar-data.ts`，其中导航为不依赖主题组件的普通数据。
4. `.vitepress/config.ts` 将生成数据交给 `.vitepress/site-config.ts`；配置层通过导航适配器转换组件格式，并由 VitePress 原生配置消费。
5. `.vitepress/theme/` 扩展默认主题；`notes/public/` 的资源按 VitePress 公开资源规则处理。

执行 `npm run dev`、`npm run build` 等命令时，npm 生命周期钩子会先生成数据。`npm test` 使用虚拟内容，不以生成真实站点数据为前提。更详细的命令和验证顺序见[开发、检查与部署](development-and-deployment.md)。
