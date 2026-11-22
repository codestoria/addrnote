# 开发、检查与部署

[返回文档目录](README.md)

## 安装与常用命令

要求 Node.js 22 或更高版本以及 npm。在仓库根目录运行：

```bash
npm ci                       # 按锁文件安装依赖
npm run dev                  # 先生成数据，再启动开发服务和侧边栏监听
npm run gen-sidebar          # 普通生成，报告缺失内容
npm run gen-sidebar -- --strict  # 严格校验并生成
npm run watch-sidebar        # 独立监听内容变化
npm run translation:audit    # 检查翻译审核标记和镜像
npm run translation:audit -- --changed  # 只检查变更页面的标记，仍检查完整镜像
npm test                     # 使用测试 fixture，不扫描真实站点作为前置步骤
npm run typecheck            # 先生成站点数据，再检查类型
npm run build                # 先严格生成，再构建站点
npm run preview              # 先生成数据，再预览已构建的站点
npm run format:check         # 检查格式
npm run format               # 格式化仓库中未被忽略的文件
npm run check                # 严格生成、格式检查、测试、类型检查和构建
./local-ci.sh                # 运行 npm run check
```

`npm run check` 在第一次严格生成后使用 `--ignore-scripts` 运行测试、类型检查及构建，避免生命周期钩子重复生成。需要本地提交前自动检查时，运行 `./scripts/install-hooks.sh`；脚本不会覆盖已有 hook。检查失败不会自动格式化、暂存或提交。

## 本地开发和排错

- 修改 Markdown 正文、目录或标题时，`npm run dev` 中的监听器会重新生成侧边栏；修改 `content/` 元数据或生成代码时，监听进程会重新加载；启动后若生成源码出现语法错误，修复并保存后会自动重试。若监听子进程意外退出，请按日志提示重新启动开发命令或修改生成相关的 TypeScript 文件。
- 生成失败时，开发日志提示侧边栏数据可能过期；修复错误后再次生成，观察恢复提示。生产构建使用严格模式，不能依赖旧数据绕过校验。
- `.vitepress/generated/sidebar-data.ts` 是本地产物；应通过生成命令重建，勿手工修改。`npm test` 不要求真实文档或预生成的站点数据。
- 默认主题的部分样式和动画依赖 VitePress 的 DOM 类名；升级 VitePress 或替换主题时，应重新核对这些选择器。修改主题时，除自动检查外，还需人工查看亮色、暗色、移动端、桌面端、两种语言及子路径资源。测试不应绑定真实网页内容、DOM 布局或导航排列。

## GitHub Pages

`.github/workflows/deploy.yml` 对 PR、`main` 推送和手动触发运行 `npm ci` 与 `npm run check`。非 PR 且目标为 `main` 时，工作流上传 `.vitepress/dist` 并使用 GitHub Pages 部署；生产运行和其他检查分别使用并发组。仓库需要配置 GitHub Pages 对应的 Actions 部署环境及权限。

站点部署参数位于 `content/site.ts`：`SITE_BASE`、`REPOSITORY_URL`、`DEFAULT_BRANCH`、`SOURCE_DIRECTORY`。迁移仓库、修改分支或域名时，检查这些值、工作流中的 `main` 条件及 GitHub Pages 配置，并检查 favicon、图片和站内链接。公开 URL 改变时，评估旧链接和重定向。更改工作流后应查看实际 Actions 运行结果；本地构建无法证明远端 Pages 已部署。
