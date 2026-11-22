import { once } from 'node:events'
import chokidar from 'chokidar'
import { LOCALES } from '../../content/locales.js'
import { resolveLocaleRoot } from './scan.js'

// Coalesce rapid editor writes without regenerating for every filesystem event.
const WRITE_STABILITY_MS = 100
const WRITE_POLL_MS = 20
const REGENERATION_DEBOUNCE_MS = 75

export async function watchSidebar(
  projectRoot: string,
  generate: () => Promise<void>
): Promise<() => Promise<void>> {
  const roots = LOCALES.map((locale) => resolveLocaleRoot(projectRoot, locale))
  const watcher = chokidar.watch(roots, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: WRITE_STABILITY_MS, pollInterval: WRITE_POLL_MS }
  })
  const initialGeneration = once(watcher, 'ready').then(() => generate())
  let generationQueue = initialGeneration
  let timer: NodeJS.Timeout | undefined

  watcher.on('all', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      generationQueue = generationQueue.then(generate).catch((error: unknown) => {
        console.error('[sidebar] generation failed:', error)
      })
    }, REGENERATION_DEBOUNCE_MS)
  })

  const close = async () => {
    if (timer) clearTimeout(timer)
    await watcher.close()
    await generationQueue.catch(() => undefined)
  }
  try {
    await initialGeneration
  } catch (error) {
    await close()
    throw error
  }
  return close
}
