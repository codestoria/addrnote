export function findLocaleDifferences<L extends string>(
  entriesByLocale: Record<L, Set<string>>
): Record<L, string[]> {
  const entries = Object.entries(entriesByLocale) as [L, Set<string>][]
  const all = new Set(entries.flatMap(([, values]) => [...values]))
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
  return Object.fromEntries(
    entries.map(([locale, values]) => [
      locale,
      [...all].filter((value) => !values.has(value)).sort(collator.compare)
    ])
  ) as Record<L, string[]>
}
