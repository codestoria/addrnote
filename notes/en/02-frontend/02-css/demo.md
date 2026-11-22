---
title: CSS Custom Properties Demo
description: Share a button color with a CSS custom property
---

# CSS Custom Properties Demo

Apply these styles to a `<button class="action">`. Define `--accent-color` on `:root` and read it with `var()` so the button's background and border use the same color.

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
