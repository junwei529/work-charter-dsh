import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_DSH_VERSION = '0.1.2-alpha.1'
const EXPECTED_CANDIDATE_VERSION = '0.1.0-alpha.1'
const EXPECTED_SCDP_VERSION = '0.1.1-alpha.1'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [dshArgument, scdpArgument] = process.argv.slice(2)

if (dshArgument === undefined || scdpArgument === undefined) {
  throw new Error('usage: npm run verify:dsh-source -- <exact-dsh-source-root> <exact-scdp-source-root>')
}

const dshRoot = resolve(dshArgument)
const scdpRoot = resolve(scdpArgument)

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

async function requireFragments(path, fragments) {
  const source = await readFile(path, 'utf8')
  for (const fragment of fragments) {
    requireValue(source.includes(fragment), `${path} is missing ${JSON.stringify(fragment)}`)
  }
  return source
}

async function packageIndex(root) {
  const packagesRoot = join(root, 'packages')
  const manifests = new Map()
  const visit = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isFile() && entry.name === 'package.json') {
        const manifest = await json(path)
        if (typeof manifest.name === 'string') manifests.set(manifest.name, { manifest, path })
        continue
      }
      if (entry.isDirectory() && entry.name !== 'node_modules') await visit(path)
    }
  }
  await visit(packagesRoot)
  return manifests
}

async function requirePackage(packages, packageName, requiredExports = []) {
  const indexed = packages.get(packageName)
  requireValue(indexed !== undefined, `DSH source is missing ${packageName}`)
  requireValue(indexed.manifest.version === EXPECTED_DSH_VERSION, `${packageName} version drift`)
  for (const key of requiredExports) {
    requireValue(Object.hasOwn(indexed.manifest.exports ?? {}, key), `${packageName} is missing export ${key}`)
  }
  return indexed.manifest
}

const dshManifest = await json(join(dshRoot, 'package.json'))
requireValue(dshManifest.name === '@deepseek-ai/dsh-root', 'unexpected DSH source root')
requireValue(dshManifest.version === EXPECTED_DSH_VERSION, 'DSH source version drift')

const candidateManifest = await json(join(repositoryRoot, 'package.json'))
requireValue(candidateManifest.version === EXPECTED_CANDIDATE_VERSION, 'work-charter-dsh candidate version drift')
for (const graphName of ['peerDependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(candidateManifest[graphName] ?? {})) {
    if (name.startsWith('@deepseek-ai/dsh-')) {
      requireValue(version === EXPECTED_DSH_VERSION, `${graphName}.${name} is not pinned to alpha.1`)
    }
  }
  requireValue(
    candidateManifest[graphName]?.['session-coordinator-dsh'] === EXPECTED_SCDP_VERSION,
    `${graphName}.session-coordinator-dsh is not pinned to the source candidate`,
  )
}
for (const removed of ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-test-runtime']) {
  requireValue(!Object.hasOwn(candidateManifest.peerDependencies ?? {}, removed), `${removed} remains a peer`)
  requireValue(!Object.hasOwn(candidateManifest.devDependencies ?? {}, removed), `${removed} remains a development dependency`)
}

const expectedInject = [
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-sidebar',
]
requireValue(
  JSON.stringify(candidateManifest.dsh?.client?.inject) === JSON.stringify(expectedInject),
  'candidate Client injection graph drift',
)

const packages = await packageIndex(dshRoot)
for (const graphName of ['peerDependencies', 'devDependencies']) {
  for (const name of Object.keys(candidateManifest[graphName] ?? {})) {
    if (name.startsWith('@deepseek-ai/dsh-')) await requirePackage(packages, name)
  }
}
await requirePackage(packages, '@deepseek-ai/dsh-api-remotes', ['.', './client'])
await requirePackage(packages, '@deepseek-ai/dsh-client-ui-conversation', ['.', './client'])
await requirePackage(packages, '@deepseek-ai/dsh-client-ui-layout', ['.', './client'])
const renderer = await requirePackage(packages, '@deepseek-ai/dsh-client-ui-renderer', ['.', './client'])
await requirePackage(packages, '@deepseek-ai/dsh-client-ui-session', ['.', './client'])
await requirePackage(packages, '@deepseek-ai/dsh-client-ui-sidebar', ['.', './client'])
await requirePackage(packages, '@deepseek-ai/dsh-client-ui-slots', ['.'])
requireValue(renderer.dsh?.client?.platform === 'web', 'UI Renderer platform drift')
requireValue(renderer.dsh?.client?.immediately === true, 'UI Renderer immediate boot contract drift')

await requireFragments(join(dshRoot, 'packages/api/remotes/src/client/index.ts'), [
  'interface Context',
  'remote: ClientRemote',
])
await requireFragments(join(dshRoot, 'packages/client/ui-renderer/src/client/index.ts'), [
  "export { SlotRegistry } from './registry.ts'",
  'slots: SlotRegistry',
])
await requireFragments(join(dshRoot, 'packages/client/ui-session/src/client/index.ts'), [
  'interface SessionStandardProps',
  'sessionId: SessionId',
  "export const inject = ['sessions', 'slots']",
])
await requireFragments(join(dshRoot, 'packages/client/ui-conversation/src/client/contract/slots.ts'), [
  "'conversation.session.header.actions': {",
])
await requireFragments(join(dshRoot, 'packages/client/ui-layout/src/client/index.ts'), [
  "'shell.overlay': { kind: 'list'; scope: 'root' }",
])
await requireFragments(join(dshRoot, 'packages/client/ui-sidebar/src/client/contract/slots.ts'), [
  "'sidebar.footer.action': { kind: 'list'; scope: 'root'",
])

try {
  await access(join(dshRoot, 'packages/client/runtime'))
  throw new Error('removed aggregate packages/client/runtime still exists')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const clientSource = await requireFragments(join(repositoryRoot, 'src/client/index.tsx'), [
  "import type { Context as ClientContext } from '@deepseek-ai/cordis'",
  "import type {} from '@deepseek-ai/dsh-api-remotes/client'",
  "import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'",
  "import type {} from '@deepseek-ai/dsh-client-ui-session/client'",
])
requireValue(!clientSource.includes('@deepseek-ai/dsh-client-runtime'), 'candidate Client still imports removed runtime')

const scdpManifest = await json(join(scdpRoot, 'package.json'))
requireValue(scdpManifest.name === 'session-coordinator-dsh', 'unexpected scdp source root')
requireValue(scdpManifest.version === EXPECTED_SCDP_VERSION, 'scdp source candidate version drift')
for (const graphName of ['peerDependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(scdpManifest[graphName] ?? {})) {
    if (!name.startsWith('@deepseek-ai/dsh-')) continue
    requireValue(version === EXPECTED_DSH_VERSION, `scdp ${graphName}.${name} is not pinned to alpha.1`)
    await requirePackage(packages, name)
  }
}
for (const removed of ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-test-runtime']) {
  requireValue(!Object.hasOwn(scdpManifest.peerDependencies ?? {}, removed), `scdp ${removed} remains a peer`)
  requireValue(!Object.hasOwn(scdpManifest.devDependencies ?? {}, removed), `scdp ${removed} remains a development dependency`)
}
await requireFragments(join(scdpRoot, 'src/types.ts'), [
  'export const SESSION_COORDINATOR_CONTRACT_VERSION = 3 as const',
  'export const SESSION_COORDINATOR_STORAGE_SCHEMA_VERSION = 2 as const',
])
await requireFragments(join(scdpRoot, 'src/index.ts'), [
  'SESSION_COORDINATOR_CONTRACT_VERSION',
  'SESSION_COORDINATOR_STORAGE_SCHEMA_VERSION',
  'sessionCoordinator: SessionCoordinator',
])

process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  dshVersion: EXPECTED_DSH_VERSION,
  candidateVersion: EXPECTED_CANDIDATE_VERSION,
  scdpVersion: EXPECTED_SCDP_VERSION,
  scdpContract: 3,
  scdpSchema: 2,
  checkedSeats: [
    '@deepseek-ai/dsh-api-remotes/client',
    '@deepseek-ai/dsh-client-ui-renderer/client',
    '@deepseek-ai/dsh-client-ui-session/client',
    'conversation.session.header.actions',
    'shell.overlay',
    'sidebar.footer.action',
  ],
  removedAggregate: '@deepseek-ai/dsh-client-runtime',
  evidenceBoundary: 'source contracts only; package installation, full DSH build, and runtime qualification are not evaluated',
})}\n`)
