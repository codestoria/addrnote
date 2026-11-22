import { readFile } from 'node:fs/promises'
import matter from 'gray-matter'

export type DocumentReader = (file: string) => Promise<{ metadata: Record<string, unknown> }>

/** Cache is scoped to one generation, so subsequent watch runs observe changes. */
export function createDocumentReader(
  read: (file: string) => Promise<string> = (file) => readFile(file, 'utf8')
): DocumentReader {
  const documents = new Map<string, Promise<{ metadata: Record<string, unknown> }>>()
  return (file) => {
    let document = documents.get(file)
    if (!document) {
      document = read(file).then((content) => ({ metadata: matter(content).data }))
      documents.set(file, document)
    }
    return document
  }
}
