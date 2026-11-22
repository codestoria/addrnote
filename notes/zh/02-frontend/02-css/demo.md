---
title: CSS 自定义属性示例
description: 使用 CSS 自定义属性统一按钮颜色
---

# CSS 自定义属性示例

将以下样式应用到 `<button class="action">` 上。在 `:root` 上定义 `--accent-color`，再通过 `var()` 读取它，让按钮的背景与边框共用同一种颜色。

```css
:root {
  --accent-color: #2454a6;
}

.action {
  background-color: var(--accent-color);
  border: 1px solid var(--accent-color);
  color: #fff;
  padding: 0.5rem 1rem;
}
```
