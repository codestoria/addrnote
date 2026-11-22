import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

type GenerateSidebarData = typeof import('./lib/site-data.js').generateSidebarData

async function runWatchMode(projectRoot: string): Promise<void> {
  const [{ LOCALES }, { SOURCE_DIRECTORY }, { generateSidebarData }, { watchSidebar }] =
    await Promise.all([
      import('../content/locales.js'),
      import('../content/site.js'),
      import('./lib/site-data.js'),
      import('./lib/watch.js')
    ])
  const stopWatching = await watchSidebar(projectRoot, () =>
    generateAndReport(projectRoot, generateSidebarData)
  )
  const close = async (): Promise<void> => {
    await stopWatching()
    process.exit(0)
  }
  process.once('SIGINT', () => void close())
  process.once('SIGTERM', () => void close())
  console.log(
    `[sidebar] watching ${LOCALES.map((locale) => `${SOURCE_DIRECTORY}/${locale}/`).join(', ')}`
  )
  process.send?.({ type: 'ready' })
}

let generationFailed = false

async function generateAndReport(
  projectRoot: string,
  generateSidebarData: GenerateSidebarData
): Promise<void> {
  try {
    const result = await generateSidebarData(projectRoot)
    if (generationFailed) console.log('[sidebar] generation recovered; sidebar data is up to date')
    generationFailed = false
    console.log(`[sidebar] ${result.changed ? 'generated' : 'unchanged'}: ${result.outputPath}`)
  } catch (error) {
    generationFailed = true
    console.error('[sidebar] generation failed; sidebar data may be stale:', error)
    throw error
  }
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  if (process.argv.includes('--watch')) {
    await runWatchMode(projectRoot)
    return
  }

  const { generateSidebarData } = await import('./lib/site-data.js')
  const result = await generateSidebarData(projectRoot, {
    strict: process.argv.includes('--strict')
  })
  console.log(`[sidebar] ${result.changed ? 'generated' : 'unchanged'}: ${result.outputPath}`)
}

const entryPoint = process.argv[1]
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((error: unknown) => {
    console.error('[sidebar] fatal error:', error)
    process.exitCode = 1
  })
}
