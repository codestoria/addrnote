# 内容、分类与语言

[返回文档目录](README.md)

站点正文位于 `notes/`。`notes/zh/` 和 `notes/en/` 的相对路径必须严格镜像，包括空目录、隐藏文件和非 Markdown 资源；两种语言的文件内容分别维护。

## 新增一篇笔记

1. 在已有内容单元下，为两种语言创建相同的相对路径。例如：

   ```text
   notes/zh/02-frontend/01-html/accessibility.md
   notes/en/02-frontend/01-html/accessibility.md
   ```

2. 分别填写标题和正文。例如中文页面：

   ```markdown
   ---
   title: 无障碍基础
   ---

   # 无障碍基础
   ```

3. 运行 `npm run dev` 监听更改，或运行 `npm run gen-sidebar` 手动生成。侧边栏优先使用 frontmatter 的 `title`；提供时必须是非空字符串，未提供时使用处理过的文件名。
4. 发布前人工核对两种语言，审核完成后在 frontmatter 添加 `translation: complete`。运行 `npm run translation:audit` 检查审核标记和镜像；只检查变更页面的标记可运行 `npm run translation:audit -- --changed`。
5. 运行 `npm run check` 执行严格校验和构建。

新增、移动、重命名或删除文件和目录时，须同步两种语言。路径镜像和审核标记不能判断翻译质量。`translation: pending` 会阻止严格构建；未标记页面允许构建，但会被翻译审核命令报告。

## 新增分类或知识域

[内容清单](../content/manifest.ts) 的 `CONTENT_SECTIONS` 定义三种形态：

- `collection`：知识域直接包含内容单元，例如前端下的 HTML。
- `grouped`：知识域包含分组，分组再包含内容单元，例如编程语言下的 C++ 基础。
- `standalone`：知识域本身就是内容单元，例如系统设计。

例如，在已有 `collection` 的 `entries` 中添加一个内容单元，选择未被同级目录使用的编号：

```ts
{
  slug: 'accessibility',
  directory: '04-accessibility',
  title: { zh: '无障碍', en: 'Accessibility' }
}
```

然后在对应知识域的中英文目录中各创建 `04-accessibility/index.md`，按需更新上级概述页，并运行 `npm run check`。新增知识域还须创建两种语言的知识域 `index.md`；`grouped` 的每个分组也需要 `index.md`。同级 slug、公开单元路径和源目录路径必须唯一。

新增笔记可由扫描器发现；新增上述结构单元需要登记清单。不同于现有三种形态的新层级需要同步扩展清单投影、导航、发布和路由规则，详见 [content/MAINTENANCE.md](../content/MAINTENANCE.md)。

## 目录编号与公开 URL

每个语言目录下的子目录都使用恰好两位数字和连字符，例如 `01-html`；同级目录的数字不能重复。清单中每个结构条目的 `directory` 去掉前缀后必须等于 `slug`。目录编号决定排序，修改编号时须同步两种语言。

生成的路由规则会剥离已注册结构目录和清单中指定深度的前缀。例如：

```text
源文件：notes/zh/01-languages/01-cpp/01-cpp-basic/index.md
路由：  /zh/languages/cpp/cpp-basic/
```

更深层目录的前缀是否进入 URL 取决于该知识域的路由规则；侧边栏显示名称会另外清理前缀。不要仅凭显示文字推断 URL。修改路由规则或 URL 中保留的编号前，先评估旧链接、冲突及重定向。

## 新增语言

1. 在 `content/locales.ts` 添加语言代码、站点元数据、界面及搜索翻译。
2. 在 `content/manifest.ts` 中为所有多语言标题添加该语言。
3. 创建 `notes/<语言代码>/`，使其路径与现有语言树一致，并翻译页面内容。
4. 运行 `npm run check`，在预览中检查语言切换、搜索、链接和内容。

## 草稿、发布范围与排错

以下划线开头的文件或目录不会进入侧边栏及站点发布；项目排除规则和扫描忽略名称见 [exclusions.ts](../content/exclusions.ts)。**草稿路径仍属于镜像检查范围**，而严格校验要求语言树内所有目录使用 `NN-name`。因此，尚未准备好双语提交的草稿更适合放在语言目录之外的 `drafts/`；若在语言树中使用草稿文件，仍需同步两种语言的路径。

发布覆盖默认由内容清单推导。无需导航入口的页面可在 [publication.ts](../content/publication.ts) 配置语言目录下的相对路径：`indexes` 要求文件存在，`contentRoots` 允许其目录下的 Markdown 发布。镜像约束仍然适用。

严格生成出现 `missing index`、`mirror differences`、`route collision` 或 `uncovered page` 时，按报错路径检查清单、两种语言目录、入口文件和路由规则。生成文件由脚本维护，不要手动修改。

## Mermaid 图表

Markdown 支持 `mermaid` 代码块；普通代码块不受影响。添加图表后，在开发预览中检查图形及暗色模式。

````markdown
```mermaid
flowchart LR
  Start --> Finish
```
````
