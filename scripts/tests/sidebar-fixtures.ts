import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { afterEach } from 'node:test'
import { getContentUnits } from '../../content/manifest.js'

export const fixtureSections = [
  {
    kind: 'grouped' as const,
    slug: 'subjects',
    title: { zh: '主题', en: 'Subjects' },
    groups: [
      {
        slug: 'alpha',
        title: { zh: '甲', en: 'Alpha' },
        entries: [
          { slug: 'intro', directory: '01-intro', title: { zh: '入门', en: 'Intro' } },
          { slug: 'advanced', directory: '02-advanced', title: { zh: '进阶', en: 'Advanced' } }
        ]
      },
      {
        slug: 'beta',
        title: { zh: '乙', en: 'Beta' },
        entries: [{ slug: 'intro', directory: '01-intro', title: { zh: '入门', en: 'Intro' } }]
      }
    ]
  },
  {
    kind: 'collection' as const,
    slug: 'topics',
    title: { zh: '分类', en: 'Topics' },
    entries: [
      { slug: 'one', title: { zh: '一', en: 'One' } },
      { slug: 'two', title: { zh: '二', en: 'Two' } }
    ]
  },
  { kind: 'standalone' as const, slug: 'guide', title: { zh: '指南', en: 'Guide' } }
]
export const fixtureUnits = getContentUnits(fixtureSections)

const temporaryDirectories: string[] = []
const supervisors = new Map<ChildProcess, Promise<void>>()

export function spawnSupervisor(
  root: string,
  stdio: 'ignore' | ['ignore', 'pipe', 'pipe'] = 'ignore'
) {
  const child = spawn(process.execPath, ['scripts/watch-supervisor.mjs'], {
    cwd: root,
    detached: true,
    stdio
  })
  const closed = new Promise<void>((resolve, reject) => {
    child.once('close', () => resolve())
    child.once('error', reject)
  })
  supervisors.set(child, closed)
  return child
}

async function stopSupervisor(child: ChildProcess, closed: Promise<void>): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  let timeout: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      closed,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`watch supervisor ${child.pid} did not close`)),
          3000
        )
      })
    ])
  } catch (error) {
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {}
    }
    throw error
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

afterEach(async () => {
  const active = [...supervisors]
  supervisors.clear()
  try {
    await Promise.all(active.map(([child, closed]) => stopSupervisor(child, closed)))
  } finally {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true }))
    )
  }
})

export async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'addrnote-test-'))
  temporaryDirectories.push(projectRoot)
  return projectRoot
}

export async function writeDocument(
  projectRoot: string,
  relativePath: string,
  content = '# Document\n'
): Promise<void> {
  const destination = path.join(projectRoot, relativePath)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, content, 'utf8')
}

type TestSidebarItem = { text: string; link?: string; items?: TestSidebarItem[] }

export function flattenItems(items: TestSidebarItem[]): { text: string; link?: string }[] {
  return items.flatMap(({ text, link, items }) => [{ text, link }, ...flattenItems(items ?? [])])
}
