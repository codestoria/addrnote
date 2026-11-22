export function isIndexDocument(filePath: string): boolean {
  return /(^|\/)index\.md$/.test(filePath)
}
