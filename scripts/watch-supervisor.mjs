import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const watcher = chokidar.watch(
  [
    path.join(root, 'content'),
    path.join(root, 'scripts/lib'),
    path.join(root, 'scripts/gen-sidebar.ts')
  ],
  { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 } }
)
let child
let everReady = false
let restart = false
let stopping = false

function start() {
  restart = false
  child = spawn(
    process.execPath,
    ['--import', 'tsx', path.join(root, 'scripts/gen-sidebar.ts'), '--watch'],
    {
      cwd: root,
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    }
  )
  child.on('message', (message) => {
    if (message?.type === 'ready') everReady = true
  })
  child.on('exit', (code, signal) => {
    child = undefined
    if (stopping) return
    if (restart) return start()
    if (!everReady) {
      process.exitCode = code || (signal ? 1 : 0)
      void watcher.close()
    } else {
      console.error(
        '[sidebar] watcher stopped; restart the development command or edit a content or script TypeScript file to retry'
      )
    }
  })
}
watcher.on('all', (_event, changedPath) => {
  if (!changedPath.endsWith('.ts') || stopping) return
  restart = true
  if (child) child.kill('SIGTERM')
  else start()
})
async function stop() {
  if (stopping) return
  stopping = true
  await watcher.close()
  if (child) {
    const finished = once(child, 'exit')
    child.kill('SIGTERM')
    await finished
  }
}
process.once('SIGINT', () => {
  void stop()
})
process.once('SIGTERM', () => {
  void stop()
})
await once(watcher, 'ready')
if (!stopping) start()
