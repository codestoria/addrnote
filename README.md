# Addrnote｜址笺

Addrnote 是一个基于 VitePress 的中英文技术笔记站。名称来自 `address` 与 `note`：为知识建立地址，方便定位、连接和再次查阅。

> Locate every piece of knowledge. 定位每一份知识。

## 快速开始

需要 Node.js 22 或更高版本及 npm。在仓库根目录运行：

```bash
npm ci
npm run dev
```

按终端提示打开本地地址。修改笔记后，开发进程会更新侧边栏；提交前可运行 `npm run check` 执行完整检查和构建。

## 从哪里开始

- [添加笔记、分类与翻译](docs/content-and-i18n.md)
- [开发命令、检查与 GitHub Pages 部署](docs/development-and-deployment.md)
- [项目结构和数据流](docs/architecture.md)
- [主题与布局](docs/theme-and-layout.md)
- [全部维护文档](docs/README.md)

站点使用 VitePress 原生多语言和仓库内的侧边栏生成脚本。文章放在 `notes/`，维护文档放在 `docs/`。
