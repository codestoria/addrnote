import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import matter from 'gray-matter'
import { Lexer, Parser, Evaluator, data } from '@actions/expressions'
import { DEFAULT_BRANCH, REPOSITORY_URL, SITE_BASE } from '../../content/site.js'

type Workflow = {
  on: { push: { branches: string[] } }
  concurrency: { group: string; 'cancel-in-progress': string }
  jobs: Record<
    string,
    {
      if?: string
      needs?: string
      permissions?: Record<string, string>
      environment?: { name?: string }
      steps: { uses?: string; if?: string; with?: Record<string, unknown> }[]
    }
  >
}

function evaluate(expression: string, event: string, ref: string): string {
  const source = expression.trim().replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, '$1')
  const tokens = new Lexer(source).lex().tokens
  const parsed = new Parser(tokens, ['github'], []).parse()
  const context = new data.Dictionary({
    key: 'github',
    value: new data.Dictionary(
      { key: 'event_name', value: new data.StringData(event) },
      { key: 'ref', value: new data.StringData(ref) }
    )
  })
  return new Evaluator(parsed, context).evaluate().coerceString()
}

function checkWorkflow(workflow: Workflow, branch: string) {
  assert.deepEqual(workflow.on.push.branches, [branch])
  const ref = `refs/heads/${branch}`
  const scenarios = [
    { event: 'push', ref, production: true },
    { event: 'workflow_dispatch', ref, production: true },
    { event: 'pull_request', ref, production: false },
    { event: 'push', ref: 'refs/heads/other', production: false },
    { event: 'workflow_dispatch', ref: 'refs/heads/other', production: false }
  ]
  const upload = workflow.jobs.check.steps.find((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@')
  )
  assert.ok(upload, 'Pages artifact upload step missing')
  for (const scenario of scenarios) {
    const { event, ref: currentRef, production } = scenario
    assert.equal(evaluate(upload.if ?? '', event, currentRef), String(production))
    assert.equal(evaluate(workflow.jobs.deploy.if ?? '', event, currentRef), String(production))
    assert.equal(
      evaluate(workflow.concurrency['cancel-in-progress'], event, currentRef),
      String(!production)
    )
    assert.equal(
      evaluate(workflow.concurrency.group, event, currentRef),
      production ? 'pages-production' : `pages-check-${event}-${currentRef}`
    )
  }
  assert.equal(upload.with?.path, './.vitepress/dist')
  assert.equal(workflow.jobs.deploy.needs, 'check')
  assert.equal(workflow.jobs.deploy.permissions?.pages, 'write')
  assert.equal(workflow.jobs.deploy.permissions?.['id-token'], 'write')
  assert.equal(workflow.jobs.deploy.environment?.name, 'github-pages')
  assert.ok(
    workflow.jobs.deploy.steps.some((step) => step.uses?.startsWith('actions/deploy-pages@'))
  )
}

test('Pages workflow and site deployment settings agree', async () => {
  const root = path.resolve(import.meta.dirname, '../..')
  const text = await readFile(path.join(root, '.github/workflows/deploy.yml'), 'utf8')
  const workflow = matter(`---\n${text}\n---\n`).data as Workflow
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  checkWorkflow(workflow, DEFAULT_BRANCH)
  const reformatted = structuredClone(workflow)
  reformatted.concurrency.group = reformatted.concurrency.group.replaceAll(' && ', '  &&  ')
  reformatted.concurrency['cancel-in-progress'] = reformatted.concurrency[
    'cancel-in-progress'
  ].replace(' || ', '  ||  ')
  checkWorkflow(reformatted, DEFAULT_BRANCH)
  const equivalent = structuredClone(workflow)
  const equivalentGuard = `github.ref == 'refs/heads/${DEFAULT_BRANCH}' && github.event_name != 'pull_request'`
  equivalent.jobs.deploy.if = equivalentGuard
  equivalent.jobs.check.steps.find((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@')
  )!.if = equivalentGuard
  checkWorkflow(equivalent, DEFAULT_BRANCH)
  const setup = workflow.jobs.check.steps.find((step) =>
    step.uses?.startsWith('actions/setup-node@')
  )
  const nodeVersion = String(setup?.with?.['node-version'] ?? '')
  const minimumVersion = packageJson.engines.node.match(/^>=(\d+)$/)?.[1]
  assert.ok(
    /^\d+$/.test(nodeVersion) && minimumVersion,
    'expected supported Node version declarations'
  )
  assert.ok(Number(nodeVersion) >= Number(minimumVersion))
  assert.equal(SITE_BASE, `/${new URL(REPOSITORY_URL).pathname.split('/').filter(Boolean).at(-1)}/`)

  const incorrectUpload = structuredClone(workflow)
  const upload = incorrectUpload.jobs.check.steps.find((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@')
  )!
  upload.if = "github.ref == 'refs/heads/other'"
  assert.throws(() => checkWorkflow(incorrectUpload, DEFAULT_BRANCH))
  const incorrectDeploy = structuredClone(workflow)
  incorrectDeploy.jobs.deploy.if = "github.ref == 'refs/heads/other'"
  assert.throws(() => checkWorkflow(incorrectDeploy, DEFAULT_BRANCH))
  const incorrectPath = structuredClone(workflow)
  incorrectPath.jobs.check.steps.find((step) =>
    step.uses?.startsWith('actions/upload-pages-artifact@')
  )!.with!.path = './wrong'
  assert.throws(() => checkWorkflow(incorrectPath, DEFAULT_BRANCH))
  const incorrectConcurrency = structuredClone(workflow)
  incorrectConcurrency.concurrency.group += ' || true'
  assert.throws(() => checkWorkflow(incorrectConcurrency, DEFAULT_BRANCH))
  const incorrectLiteral = structuredClone(workflow)
  incorrectLiteral.concurrency.group = incorrectLiteral.concurrency.group.replace(
    'pages-production',
    'pages- production'
  )
  assert.throws(() => checkWorkflow(incorrectLiteral, DEFAULT_BRANCH))
  const incorrectCancel = structuredClone(workflow)
  incorrectCancel.concurrency['cancel-in-progress'] += ' || true'
  assert.throws(() => checkWorkflow(incorrectCancel, DEFAULT_BRANCH))
  const incorrectPermissions = structuredClone(workflow)
  incorrectPermissions.jobs.deploy.permissions!.pages = 'read'
  assert.throws(() => checkWorkflow(incorrectPermissions, DEFAULT_BRANCH))
})
