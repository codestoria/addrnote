import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

import { format, type Options } from 'prettier'

const projectRoot = path.resolve(import.meta.dirname, '../..')

async function readJson(relativePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'))
}

test('Markdown formatting preserves frontmatter, long prose, and fenced code', async () => {
  const config = (await readJson('.prettierrc')) as Options
  const longLine = '这是一行需要保持原样的技术笔记内容，'.repeat(12)
  const markdown = `---
title: 格式化示例
description: 验证 frontmatter 保持稳定
---

# 格式化示例

${longLine}

\`\`\`cpp
int main(){return 0;}
\`\`\`

\`\`\`mermaid
graph TD;A-->B
\`\`\`
`

  const formatted = await format(markdown, { ...config, parser: 'markdown' })

  assert.match(formatted, /^---\ntitle: 格式化示例\ndescription: 验证 frontmatter 保持稳定\n---/)
  assert.ok(formatted.includes(longLine))
  assert.ok(formatted.includes('```cpp\nint main(){return 0;}\n```'))
  assert.ok(formatted.includes('```mermaid\ngraph TD;A-->B\n```'))
})
