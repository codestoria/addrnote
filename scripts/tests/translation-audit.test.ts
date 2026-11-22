import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { auditTranslations } from '../lib/translation-audit.js'

test('translation audit identifies unreviewed, pending and invalid pages by locale', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en'])
    await mkdir(path.join(root, 'notes', locale), { recursive: true })
  await writeFile(path.join(root, 'notes/zh/index.md'), '---\ntranslation: complete\n---\n')
  await writeFile(path.join(root, 'notes/en/index.md'), '# Unreviewed')
  await writeFile(path.join(root, 'notes/en/pending.md'), '---\ntranslation: pending\n---\n')
  await writeFile(path.join(root, 'notes/zh/pending.md'), '---\ntranslation: unknown\n---\n')
  const issues = await auditTranslations(root)
  assert.deepEqual(issues.sort(), [
    'en/index.md: missing translation review',
    'en/pending.md: translation pending',
    'zh/pending.md: invalid translation status'
  ])
})

test('translation audit rejects missing locale roots and landing pages', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-missing-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, 'notes/zh'), { recursive: true })
  const issues = await auditTranslations(root)
  assert.ok(issues.some((issue) => issue.includes('zh/index.md')))
  assert.ok(issues.some((issue) => issue.includes('en')))
})

test('translation audit reports symbolic links instead of ignoring pages', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-link-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en']) {
    await mkdir(path.join(root, 'notes', locale), { recursive: true })
    await writeFile(
      path.join(root, 'notes', locale, 'index.md'),
      '---\ntranslation: complete\n---\n'
    )
  }
  await symlink('index.md', path.join(root, 'notes/en/extra.md'))
  const issues = await auditTranslations(root)
  assert.ok(issues.some((issue) => /symbolic link.*extra\.md/.test(issue)))
})

test('translation audit reports a missing mirrored page even when existing pages are reviewed', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-mirror-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en']) {
    await mkdir(path.join(root, 'notes', locale), { recursive: true })
    await writeFile(
      path.join(root, 'notes', locale, 'index.md'),
      '---\ntranslation: complete\n---\n'
    )
  }
  await writeFile(path.join(root, 'notes/zh/extra.md'), '---\ntranslation: complete\n---\n')
  const issues = await auditTranslations(root)
  assert.ok(issues.some((issue) => /missing in en.*extra\.md/.test(issue)))
})

test('translation audit can restrict review markers to changed locale files', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-changed-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en']) {
    await mkdir(path.join(root, 'notes', locale), { recursive: true })
    await writeFile(path.join(root, 'notes', locale, 'index.md'), '# Existing')
    await writeFile(path.join(root, 'notes', locale, 'new.md'), '# New')
  }
  const issues = await auditTranslations(root, new Set(['en/new.md']))
  assert.deepEqual(issues, ['en/new.md: missing translation review'])
})

test('translation audit counts selected existing pages, including zero matches', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'addrnote-translation-count-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const locale of ['zh', 'en']) {
    await mkdir(path.join(root, 'notes', locale), { recursive: true })
    await writeFile(
      path.join(root, 'notes', locale, 'index.md'),
      '---\ntranslation: complete\n---\n'
    )
  }
  const count = { checked: 0 }
  await auditTranslations(root, new Set(['en/index.md', 'en/deleted.md']), count)
  assert.equal(count.checked, 1)
  await auditTranslations(root, new Set(), count)
  assert.equal(count.checked, 0)
})
