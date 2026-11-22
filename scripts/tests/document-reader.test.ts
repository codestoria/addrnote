import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDocumentReader } from '../lib/document-reader.js'

test('a generation shares one read and parsed metadata per document', async () => {
  let reads = 0
  const readDocument = createDocumentReader(async () => {
    reads++
    return '---\ntitle: Example\n---\nBody'
  })
  const [first, second] = await Promise.all([
    readDocument('/example.md'),
    readDocument('/example.md')
  ])
  assert.equal(reads, 1)
  assert.equal(first.metadata.title, 'Example')
  assert.equal(second.metadata.title, 'Example')
})
