---
title: JavaScript 点击事件示例
description: 点击按钮时更新计数器
---

# JavaScript 点击事件示例

把脚本放在按钮和输出元素之后，确保脚本运行时两个元素都已存在。`click` 监听器会把计数加一并更新显示结果。

```html
<button id="increment" type="button">加一</button>
<output id="count" for="increment">0</output>

<script>
  const button = document.querySelector('#increment')
  const countOutput = document.querySelector('#count')
  let count = 0

  button.addEventListener('click', () => {
    count += 1
    countOutput.textContent = String(count)
  })
</script>
```
