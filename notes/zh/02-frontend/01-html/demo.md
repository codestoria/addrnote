---
title: 语义化 HTML 示例
description: 用页眉、导航与文章元素组织页面
---

# 语义化 HTML 示例

用 `header` 放置站点简介，用 `nav` 包裹导航链接，用 `main` 标记主要内容，再用 `article` 表示可以独立阅读的一条笔记。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>观察笔记</title>
  </head>
  <body>
    <header>
      <p>观察笔记</p>
      <nav aria-label="目录">
        <a href="#first-note">第一条笔记</a>
      </nav>
    </header>
    <main>
      <article aria-labelledby="first-note">
        <h1 id="first-note">第一条笔记</h1>
        <p>这周枫叶变红了。</p>
      </article>
    </main>
  </body>
</html>
```
