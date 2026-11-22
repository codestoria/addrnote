---
title: JavaScript Click Event Demo
description: Update a counter in response to a button click
---

# JavaScript Click Event Demo

Place the script after the button and output so both elements exist when the script runs. The `click` listener increments the count and writes it to the output.

```html
<button id="increment" type="button">Add one</button>
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
