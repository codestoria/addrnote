import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

test('dev command forwards arguments to the server', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-dev-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'scripts'), { recursive: true })
  await mkdir(path.join(root, 'node_modules/.bin'), { recursive: true })
  await copyFile(path.resolve(import.meta.dirname, '../dev.sh'), path.join(root, 'scripts/dev.sh'))
  await writeFile(path.join(root, 'scripts/watch-sidebar.sh'), '#!/bin/bash\nexec sleep 10\n')
  const server = path.join(root, 'node_modules/.bin/vitepress')
  await writeFile(server, '#!/bin/bash\nprintf "%s\\n" "$@" > server-args\n')
  await chmod(server, 0o755)
  const child = spawn('bash', ['scripts/dev.sh', '--host', '127.0.0.1', '--port', '4321'], {
    cwd: root,
    stdio: 'ignore'
  })
  const [code] = await once(child, 'exit')
  assert.equal(code, 0)
  assert.deepEqual((await readFile(path.join(root, 'server-args'), 'utf8')).trim().split('\n'), [
    'dev',
    '.',
    '--host',
    '127.0.0.1',
    '--port',
    '4321'
  ])
})
