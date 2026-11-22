import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { SOURCE_DIRECTORY } from '../content/site.js'
import { auditTranslations } from './lib/translation-audit.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function changedPages(): Promise<Set<string> | undefined> {
  const args = process.argv.slice(2)
  if (!args.length) return undefined
  if (args[0] !== '--changed' || args.length > 2)
    throw new Error('Usage: translation:audit [--changed [base-ref]]')
  const base = args[1] ?? 'HEAD'
  const git = promisify(execFile)
  const [diff, untracked] = await Promise.all([
    git('git', ['diff', '--name-only', '-z', '--diff-filter=ACMR', base, '--', SOURCE_DIRECTORY], {
      cwd: root
    }),
    git('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', SOURCE_DIRECTORY], {
      cwd: root
    })
  ])
  const prefix = `${SOURCE_DIRECTORY}/`
  return new Set(
    `${diff.stdout}${untracked.stdout}`
      .split('\0')
      .filter((file) => file.startsWith(prefix) && file.endsWith('.md'))
      .map((file) => file.slice(prefix.length))
  )
}

const stats = { checked: 0 }
changedPages()
  .then((pages) => auditTranslations(root, pages, stats))
  .then((issues) => {
    console.log(`Translation review: checked ${stats.checked} locale page(s).`)
    if (stats.checked === 0) console.log('No matching pages to review.')
    if (issues.length) {
      console.error(issues.join('\n'))
      console.error(`${issues.length} translation audit issue(s) found.`)
      process.exitCode = 1
    } else if (stats.checked > 0)
      console.log('All checked pages have a completed translation review marker.')
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
