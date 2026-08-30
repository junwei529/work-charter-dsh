import { createHash } from 'node:crypto'
import { cp, link, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const releaseRoot = join(repositoryRoot, '.verification', 'release-readiness')
const releaseEvidenceLock = join(releaseRoot, '.final-evidence.lock')
const dshArtifactSourceRoot = join(repositoryRoot, '.verification', 'artifacts', 'dsh-v0.1.2-alpha.1')
const scdpArtifactSourceRoot = join(
  repositoryRoot,
  '.verification',
  'release-inputs',
  'session-coordinator-dsh-v0.1.1-alpha.1-published',
)
const prequalifiedPnpmStoreRoot = join(repositoryRoot, '.verification', 'pnpm-store')
const exactPnpmPath = join(repositoryRoot, '.verification', 'corepack', 'v1', 'pnpm', '11.7.0', 'bin', 'pnpm.cjs')

const DSH_HEAD = 'cd5ef8148158c3a752a658978873241fdf8e2bbc'
const DSH_TAG = 'dsh-v0.1.2-alpha.1'
const DSH_VERSION = '0.1.2-alpha.1'
const DSH_ARTIFACT_COUNT = 241
const DSH_INSTALLED_OVERRIDE_COUNT = 78
const DSH_ROOT_ARCHIVE = 'deepseek-ai-dsh-0.1.2-alpha.1.tgz'
const DSH_ROOT_SHA256 = '95d12c190d169c99db15d8958b034004489b6b43a0cb50879f885102bb18ed32'
const DSH_ARTIFACT_MANIFEST_SHA256 = 'b8aa5da1d0fec2abd7bf581819d7638de6e859adfd60c530a466b1c7ff90b1c6'
const SCDP_ARCHIVE = 'session-coordinator-dsh-0.1.1-alpha.1.tgz'
const SCDP_VERSION = '0.1.1-alpha.1'
const SCDP_BYTES = 97138
const SCDP_SHA256 = '9575d1edf782f16b2d87b49bc27e290ecf841fa607a7d4a4468a41de2389b269'
const SCDP_SHA512 = '2cffe633734aea39989dd28d70e811536dd54aace5038b87ece3416013809fabf1394e053559e2f6c9b61c67f35ecd22a10972621cb3bdf79b097dd0bc2df2df'

const EXPECTED_EXPORTS = {
  '.': { types: './lib/types/index.d.ts', default: './lib/index.js' },
  './client': { types: './lib/types/client/index.d.ts', default: './lib/client.js' },
  './remote': { types: './lib/typert.remote-client.d.ts', default: './lib/typert.remote-client.js' },
  './types': { types: './lib/types/types.d.ts', default: './lib/types/types.js' },
  './typert': { types: './lib/typert.host.d.ts', default: './lib/typert.host.js' },
  './package.json': './package.json',
}
const EXPECTED_REPOSITORY = { type: 'git', url: 'git+https://github.com/junwei529/work-charter-dsh.git' }
const EXPECTED_HOMEPAGE = 'https://github.com/junwei529/work-charter-dsh#readme'
const EXPECTED_BUGS = { url: 'https://github.com/junwei529/work-charter-dsh/issues' }
const EXPECTED_DSH_INJECT = [
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-sidebar',
]
const EXPECTED_DEPENDENCIES = { zod: '4.4.3' }
const EXPECTED_PEER_DEPENDENCIES = {
  '@deepseek-ai/cordis': '4.0.1',
  '@deepseek-ai/dsh-agent': DSH_VERSION,
  '@deepseek-ai/dsh-api-remotes': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-conversation': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-layout': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-renderer': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-session': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-sidebar': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-slots': DSH_VERSION,
  '@deepseek-ai/dsh-session': DSH_VERSION,
  '@deepseek-ai/dsh-skill': DSH_VERSION,
  '@deepseek-ai/dsh-storage-domain': DSH_VERSION,
  '@deepseek-ai/dsh-system-prompt': DSH_VERSION,
  '@deepseek-ai/dsh-tools': DSH_VERSION,
  '@deepseek-ai/dsh-typert-protocol': DSH_VERSION,
  react: '18.3.1',
  'session-coordinator-dsh': SCDP_VERSION,
}
const EXPECTED_DEV_DEPENDENCIES = {
  '@deepseek-ai/cordis': '4.0.1',
  '@deepseek-ai/dsh-agent': DSH_VERSION,
  '@deepseek-ai/dsh-api-remotes': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-conversation': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-layout': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-renderer': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-session': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-sidebar': DSH_VERSION,
  '@deepseek-ai/dsh-client-ui-slots': DSH_VERSION,
  '@deepseek-ai/dsh-session': DSH_VERSION,
  '@deepseek-ai/dsh-skill': DSH_VERSION,
  '@deepseek-ai/dsh-storage-domain': DSH_VERSION,
  '@deepseek-ai/dsh-system-prompt': DSH_VERSION,
  '@deepseek-ai/dsh-tools': DSH_VERSION,
  '@deepseek-ai/dsh-typert-generator': DSH_VERSION,
  '@deepseek-ai/dsh-typert-protocol': DSH_VERSION,
  '@testing-library/react': '16.3.2',
  '@types/node': '22.20.0',
  '@types/react': '18.3.1',
  '@types/react-dom': '18.3.0',
  eslint: '10.8.1',
  jsdom: '29.1.1',
  react: '18.3.1',
  'react-dom': '18.3.1',
  'session-coordinator-dsh': SCDP_VERSION,
  tsdown: '0.22.2',
  typescript: '6.0.3',
  'typescript-eslint': '8.67.0',
  vitest: '4.1.8',
}
const EXPECTED_PACKAGE_FILES = [
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'assets/work-charter-dsh.md',
  'lib/client.js',
  'lib/client.js.map',
  'lib/index.js',
  'lib/typert.host.d.ts',
  'lib/typert.host.js',
  'lib/typert.remote-client.d.ts',
  'lib/typert.remote-client.d.ts.map',
  'lib/typert.remote-client.js',
  'lib/types/client/components.d.ts',
  'lib/types/client/components.d.ts.map',
  'lib/types/client/controller.d.ts',
  'lib/types/client/controller.d.ts.map',
  'lib/types/client/index.d.ts',
  'lib/types/client/index.d.ts.map',
  'lib/types/client/selection.d.ts',
  'lib/types/client/selection.d.ts.map',
  'lib/types/coordinator.d.ts',
  'lib/types/coordinator.d.ts.map',
  'lib/types/index.d.ts',
  'lib/types/index.d.ts.map',
  'lib/types/model-context.d.ts',
  'lib/types/model-context.d.ts.map',
  'lib/types/model-tools.d.ts',
  'lib/types/model-tools.d.ts.map',
  'lib/types/policy.d.ts',
  'lib/types/policy.d.ts.map',
  'lib/types/skill.d.ts',
  'lib/types/skill.d.ts.map',
  'lib/types/storage.d.ts',
  'lib/types/storage.d.ts.map',
  'lib/types/types.d.ts',
  'lib/types/types.d.ts.map',
  'lib/types/types.js',
  'package.json',
].sort()
const REQUIRED_RELEASE_FILES = ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'assets/work-charter-dsh.md']
const SOURCE_ROOT_FILES = [
  'package.json',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'tsconfig.base.json',
  'tsconfig.client.json',
  'tsconfig.host.json',
  'tsconfig.json',
  'tsdown.config.ts',
]
const SOURCE_SCRIPT_FILES = [
  'scripts/clean-build.mjs',
  'scripts/generate-typert.mjs',
  'scripts/release-audit.mjs',
]
const EXPECTED_MIT_LICENSE = [
  'MIT License',
  '',
  'Copyright (c) 2026 junwei529',
  '',
  'Permission is hereby granted, free of charge, to any person obtaining a copy',
  'of this software and associated documentation files (the "Software"), to deal',
  'in the Software without restriction, including without limitation the rights',
  'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
  'copies of the Software, and to permit persons to whom the Software is',
  'furnished to do so, subject to the following conditions:',
  '',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.',
  '',
].join('\n')

export function deriveReleaseLayout(manifest, root = releaseRoot) {
  validateReleaseMetadata(manifest)
  const archiveName = `${manifest.name}-${manifest.version}.tgz`
  return {
    root,
    archiveName,
    finalRoot: join(root, 'final'),
    finalArchive: join(root, 'final', archiveName),
    sha256File: join(root, 'final', `${archiveName}.sha256`),
    sha512File: join(root, 'final', `${archiveName}.sha512`),
    provenanceFile: join(root, 'final', `${archiveName}.provenance.json`),
  }
}

export function validateReleaseMetadata(manifest) {
  if (manifest.name !== 'work-charter-dsh') throw new Error('unexpected local package identity')
  if (manifest.version !== '0.1.0-alpha.1') throw new Error('candidate version must be 0.1.0-alpha.1')
  if (manifest.private !== true) throw new Error('release candidate must remain private')
  if (manifest.license !== 'MIT') throw new Error('release candidate must use the approved MIT license')
  if (manifest.description !== 'DSH-native Work Charter policy plugin backed by session-coordinator-dsh') {
    throw new Error('package description drift')
  }
  assertExactRecord(manifest.repository, EXPECTED_REPOSITORY, 'repository metadata')
  if (manifest.homepage !== EXPECTED_HOMEPAGE) throw new Error('homepage metadata drift')
  assertExactRecord(manifest.bugs, EXPECTED_BUGS, 'bugs metadata')
  if (Object.hasOwn(manifest, 'publishConfig')) throw new Error('forbidden public metadata: publishConfig')
  if (manifest.packageManager !== 'pnpm@11.7.0') throw new Error('package-manager drift')
  if (manifest.engines?.node !== '^22.19.0 || >=24.0.0') throw new Error('Node engine drift')
  if (JSON.stringify(manifest.exports) !== JSON.stringify(EXPECTED_EXPORTS)) throw new Error('public exports drift')
  if (JSON.stringify(manifest.dsh?.client?.inject) !== JSON.stringify(EXPECTED_DSH_INJECT)
    || manifest.dsh?.client?.platform !== 'web') {
    throw new Error('DSH Client metadata drift')
  }
  assertExactRecord(manifest.dependencies, EXPECTED_DEPENDENCIES, 'runtime dependency graph')
  assertExactRecord(manifest.peerDependencies, EXPECTED_PEER_DEPENDENCIES, 'peer dependency graph')
  assertExactRecord(manifest.devDependencies, EXPECTED_DEV_DEPENDENCIES, 'development dependency graph')
  for (const file of REQUIRED_RELEASE_FILES) {
    if (!manifest.files?.includes(file)) throw new Error(`package allowlist is missing ${file}`)
  }
  return manifest
}

export function auditSourceMapObject(map, label) {
  if (Object.hasOwn(map, 'sourcesContent')) throw new Error(`${label} contains sourcesContent`)
  if (!Array.isArray(map.sources) || map.sources.length === 0) throw new Error(`${label} has no non-empty sources array`)
  if (Object.hasOwn(map, 'file')
    && (typeof map.file !== 'string' || map.file.trim().length === 0 || isAbsoluteLike(map.file) || hasUriScheme(map.file))) {
    throw new Error(`${label} contains an absolute, URI, or invalid file path: ${String(map.file)}`)
  }
  if (Object.hasOwn(map, 'sourceRoot')
    && (typeof map.sourceRoot !== 'string' || map.sourceRoot.trim().length === 0
      || isAbsoluteLike(map.sourceRoot) || hasUriScheme(map.sourceRoot))) {
    throw new Error(`${label} contains an absolute, URI, or invalid sourceRoot: ${String(map.sourceRoot)}`)
  }
  for (const source of map.sources) {
    if (typeof source !== 'string' || source.trim().length === 0 || isAbsoluteLike(source) || hasUriScheme(source)) {
      throw new Error(`${label} contains an absolute, URI, or invalid source path: ${String(source)}`)
    }
  }
}

export function validatePackageFileList(files) {
  const actual = [...files].sort()
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_PACKAGE_FILES)) {
    const missing = EXPECTED_PACKAGE_FILES.filter(file => !actual.includes(file))
    const extra = actual.filter(file => !EXPECTED_PACKAGE_FILES.includes(file))
    throw new Error(`package file allowlist drift: missing=${missing.join(',')} extra=${extra.join(',')}`)
  }
  return actual
}

export function validateDshArtifactDescriptors(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) throw new Error('DSH artifact descriptors are missing')
  const names = new Set()
  const files = new Set()
  for (const descriptor of descriptors) {
    if (typeof descriptor?.name !== 'string' || !/^@deepseek-ai\/dsh(?:-|$)/.test(descriptor.name)) {
      throw new Error('DSH artifact package name is invalid')
    }
    if (descriptor.version !== DSH_VERSION) throw new Error(`DSH artifact version drift for ${descriptor.name}`)
    const expectedFile = `${descriptor.name.slice(1).replace('/', '-')}-${DSH_VERSION}.tgz`
    if (descriptor.file !== expectedFile) throw new Error(`DSH artifact filename mismatch for ${descriptor.name}`)
    if (!/^[0-9a-f]{64}$/.test(descriptor.sha256)
      || !Number.isSafeInteger(descriptor.bytes) || descriptor.bytes <= 0) {
      throw new Error(`DSH artifact hash or byte length is invalid for ${descriptor.name}`)
    }
    if (names.has(descriptor.name) || files.has(descriptor.file)) throw new Error('DSH artifact descriptors contain duplicates')
    names.add(descriptor.name)
    files.add(descriptor.file)
  }
  return [...descriptors].sort((left, right) => left.name.localeCompare(right.name))
}

export function validateDshArtifactManifest(rows, expectedSha256 = DSH_ARTIFACT_MANIFEST_SHA256) {
  validateEvidenceRows(rows, undefined, 'DSH artifact manifest')
  const normalized = [...rows].sort((left, right) => left.path.localeCompare(right.path))
  const sha256 = hash(Buffer.from(JSON.stringify(normalized), 'utf8'), 'sha256')
  if (sha256 !== expectedSha256) throw new Error('DSH artifact manifest does not match the exact-source build')
  return { rows: normalized, sha256 }
}

export function validateScdpArtifactDescriptor(descriptor) {
  const expected = {
    name: 'session-coordinator-dsh',
    version: SCDP_VERSION,
    file: SCDP_ARCHIVE,
    bytes: SCDP_BYTES,
    sha256: SCDP_SHA256,
    sha512: SCDP_SHA512,
    private: true,
    license: 'MIT',
  }
  assertExactRecord(descriptor, expected, 'scdp published artifact identity')
  return descriptor
}

export function createProducerWorkspaceConfig(dshDescriptors, scdpDescriptor) {
  const dsh = validateDshArtifactDescriptors(dshDescriptors)
  validateScdpArtifactDescriptor(scdpDescriptor)
  const overrides = Object.fromEntries([
    ...dsh.map(descriptor => [descriptor.name, `file:../dsh-artifacts/${descriptor.file}`]),
    [scdpDescriptor.name, `file:../scdp-artifact/${scdpDescriptor.file}`],
  ])
  return `${JSON.stringify({ packages: ['.'], overrides }, null, 2)}\n`
}

export function normalizeInstalledVirtualStoreLock(
  lockText,
  dshDescriptors,
  scdpDescriptor,
  dshRoot = dshArtifactSourceRoot,
  scdpRoot = join(repositoryRoot, '.verification', 'artifacts'),
) {
  if (typeof lockText !== 'string' || lockText.length === 0) throw new Error('installed virtual-store lock is missing')
  const descriptors = validateDshArtifactDescriptors(dshDescriptors)
  const descriptorByName = new Map(descriptors.map(descriptor => [descriptor.name, descriptor]))
  validateScdpArtifactDescriptor(scdpDescriptor)
  let normalized = lockText.replaceAll('\r\n', '\n')
  const overridesStart = normalized.indexOf('\noverrides:\n')
  const importersStart = normalized.indexOf('\nimporters:\n', overridesStart + 1)
  if (overridesStart === -1 || importersStart === -1) throw new Error('installed virtual-store lock has no bounded overrides section')
  const overrideLines = normalized.slice(overridesStart, importersStart).split('\n')
    .filter(line => /^  (?:'@deepseek-ai\/dsh|session-coordinator-dsh:)/.test(line))
  const dshOverrideLines = overrideLines.filter(line => line.includes('@deepseek-ai/dsh'))
  if (dshOverrideLines.length !== DSH_INSTALLED_OVERRIDE_COUNT) {
    throw new Error('installed virtual-store lock DSH override count drift')
  }
  const dshSourcePrefix = `file:${resolve(dshRoot).replaceAll('\\', '/').replace(/\/$/, '')}/`
  const scdpSourcePrefix = `file:${resolve(scdpRoot).replaceAll('\\', '/').replace(/\/$/, '')}/`
  const observedDshNames = new Set()
  for (const line of dshOverrideLines) {
    const match = line.match(/^  '([^']+)': (.+)$/)
    if (!match) throw new Error('installed virtual-store lock has an invalid DSH override line')
    const [, name, specifier] = match
    const descriptor = descriptorByName.get(name)
    if (!descriptor || specifier !== `${dshSourcePrefix}${descriptor.file}`) {
      throw new Error(`installed virtual-store lock DSH override drift for ${String(name)}`)
    }
    observedDshNames.add(name)
  }
  if (observedDshNames.size !== DSH_INSTALLED_OVERRIDE_COUNT) {
    throw new Error('installed virtual-store lock contains duplicate DSH overrides')
  }
  const scdpOverride = overrideLines.find(line => line.startsWith('  session-coordinator-dsh:'))
  if (scdpOverride !== `  session-coordinator-dsh: ${scdpSourcePrefix}${SCDP_ARCHIVE}`) {
    throw new Error('installed virtual-store lock scdp override drift')
  }
  const absoluteFileReferences = normalized.match(/file:[A-Za-z]:\/[^\s,}\]]+/g) ?? []
  if (absoluteFileReferences.length === 0 || absoluteFileReferences.some(reference => (
    !reference.startsWith(dshSourcePrefix) && reference !== `${scdpSourcePrefix}${SCDP_ARCHIVE}`
  ))) {
    throw new Error('installed virtual-store lock contains an unexpected absolute file reference')
  }
  const pnpmfileChecksums = normalized.match(/^pnpmfileChecksum: [^\n]+$/gm) ?? []
  if (pnpmfileChecksums.length !== 1) throw new Error('installed virtual-store lock pnpmfile checksum boundary drift')
  normalized = normalized
    .replaceAll(dshSourcePrefix, 'file:../dsh-artifacts/')
    .replaceAll('file:.verification/artifacts/dsh-v0.1.2-alpha.1/', 'file:../dsh-artifacts/')
    .replaceAll(`${scdpSourcePrefix}${SCDP_ARCHIVE}`, `file:../scdp-artifact/${SCDP_ARCHIVE}`)
    .replaceAll(`file:.verification/artifacts/${SCDP_ARCHIVE}`, `file:../scdp-artifact/${SCDP_ARCHIVE}`)
    .replace(/^pnpmfileChecksum: [^\n]+\n\n?/m, '')
  const scdpPackageKey = `  session-coordinator-dsh@file:../scdp-artifact/${SCDP_ARCHIVE}:\n`
  const scdpPackageStart = normalized.indexOf(scdpPackageKey)
  const scdpPackageEnd = normalized.indexOf('\n\n', scdpPackageStart + scdpPackageKey.length)
  if (scdpPackageStart === -1 || scdpPackageEnd === -1) {
    throw new Error('normalized installed virtual-store lock has no bounded scdp package block')
  }
  const scdpPackageBlock = normalized.slice(scdpPackageStart, scdpPackageEnd)
  const integrityMatches = scdpPackageBlock.match(/integrity: sha512-[A-Za-z0-9+/=]+/g) ?? []
  if (integrityMatches.length !== 1) throw new Error('normalized installed virtual-store lock scdp integrity drift')
  const publishedIntegrity = `integrity: sha512-${Buffer.from(SCDP_SHA512, 'hex').toString('base64')}`
  normalized = normalized.slice(0, scdpPackageStart)
    + scdpPackageBlock.replace(integrityMatches[0], publishedIntegrity)
    + normalized.slice(scdpPackageEnd)
  auditText(normalized, 'normalized installed virtual-store lock')
  if (normalized.includes('file:.verification/artifacts/') || normalized.includes(dshSourcePrefix)
    || normalized.includes(scdpSourcePrefix)) {
    throw new Error('normalized installed virtual-store lock retained a source artifact root')
  }
  if (!normalized.endsWith('\n')) normalized += '\n'
  return normalized
}

export function dshDescriptorsFromProducerLock(lockText, dshDescriptors) {
  const descriptorByName = new Map(validateDshArtifactDescriptors(dshDescriptors)
    .map(descriptor => [descriptor.name, descriptor]))
  const overridesStart = lockText.indexOf('\noverrides:\n')
  const importersStart = lockText.indexOf('\nimporters:\n', overridesStart + 1)
  if (overridesStart === -1 || importersStart === -1) throw new Error('producer lock has no bounded overrides section')
  const names = lockText.slice(overridesStart, importersStart).split('\n')
    .map(line => line.match(/^  '(@deepseek-ai\/dsh[^']*)': /)?.[1])
    .filter(Boolean)
  if (names.length !== DSH_INSTALLED_OVERRIDE_COUNT || new Set(names).size !== names.length) {
    throw new Error('producer lock DSH override identity drift')
  }
  return names.sort().map(name => {
    const descriptor = descriptorByName.get(name)
    if (!descriptor) throw new Error(`producer lock references unknown DSH artifact ${name}`)
    return descriptor
  })
}

export function createInstalledLockCompatibleManifest(manifest, lockText, dshDescriptors) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('source package manifest is invalid')
  const descriptors = validateDshArtifactDescriptors(dshDescriptors)
  const descriptorByName = new Map(descriptors.map(descriptor => [descriptor.name, descriptor]))
  const lines = lockText.replaceAll('\r\n', '\n').split('\n')
  const rootStart = lines.indexOf('  .:')
  if (rootStart === -1) throw new Error('producer lock has no root importer')
  const readImporterSection = section => {
    const sectionStart = lines.indexOf(`    ${section}:`, rootStart + 1)
    if (sectionStart === -1) throw new Error(`producer lock has no root ${section}`)
    const dependencies = new Map()
    let currentName
    for (let index = sectionStart + 1; index < lines.length; index += 1) {
      const line = lines[index]
      if (/^    \S/.test(line)) break
      const nameMatch = line.match(/^      (?:'([^']+)'|([^:]+)):\s*$/)
      if (nameMatch) {
        currentName = nameMatch[1] ?? nameMatch[2]
        continue
      }
      const specifierMatch = line.match(/^        specifier: (.+)$/)
      if (currentName && specifierMatch) {
        dependencies.set(currentName, specifierMatch[1])
        currentName = undefined
      }
    }
    return dependencies
  }
  const lockDependencies = readImporterSection('dependencies')
  const lockDevDependencies = readImporterSection('devDependencies')
  for (const name of Object.keys(manifest.devDependencies ?? {})) {
    if (!lockDevDependencies.has(name) && !lockDependencies.has(name)) {
      throw new Error(`producer lock is missing source devDependency ${name}`)
    }
  }
  const addedDevDependencies = [...lockDevDependencies.keys()]
    .filter(name => !Object.hasOwn(manifest.devDependencies ?? {}, name))
    .sort()
  if (addedDevDependencies.length === 0) throw new Error('installed virtual-store lock has no bounded install-only dependencies')
  const result = structuredClone(manifest)
  result.devDependencies ??= {}
  for (const name of addedDevDependencies) {
    const descriptor = descriptorByName.get(name)
    if (!descriptor) throw new Error(`installed virtual-store lock added a non-DSH dependency: ${name}`)
    const expectedSpecifier = `file:../dsh-artifacts/${descriptor.file}`
    if (lockDevDependencies.get(name) !== expectedSpecifier) {
      throw new Error(`installed virtual-store lock install-only specifier drift for ${name}`)
    }
    result.devDependencies[name] = DSH_VERSION
  }
  return { manifest: result, addedDevDependencies }
}

async function inspectDshArtifactSet(root) {
  const publishOrderBytes = await readFile(join(root, 'publish-order.txt'))
  const orderedFiles = publishOrderBytes.toString('utf8').replaceAll('\r\n', '\n').split('\n').filter(Boolean)
  if (orderedFiles.length !== DSH_ARTIFACT_COUNT || new Set(orderedFiles).size !== orderedFiles.length) {
    throw new Error(`expected ${DSH_ARTIFACT_COUNT} unique DSH tarballs in publish-order.txt`)
  }
  const entries = await readdir(root, { withFileTypes: true })
  if (entries.some(entry => !entry.isFile())) throw new Error('DSH artifact root contains a non-file entry')
  const expectedFiles = ['publish-order.txt', ...orderedFiles].sort()
  const actualFiles = entries.map(entry => entry.name).sort()
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error('DSH artifact root file set drift')

  const descriptors = []
  for (const file of orderedFiles) {
    const bytes = await readFile(join(root, file))
    const archiveEntries = parseTar(gunzipSync(bytes))
    const manifestBytes = archiveEntries.get('package/package.json')
    if (!manifestBytes) throw new Error(`DSH artifact ${file} has no package/package.json`)
    const manifest = JSON.parse(manifestBytes.toString('utf8'))
    descriptors.push({
      name: manifest.name,
      version: manifest.version,
      file,
      sha256: hash(bytes, 'sha256'),
      bytes: bytes.length,
    })
  }
  const validated = validateDshArtifactDescriptors(descriptors)
  if (validated.length !== DSH_ARTIFACT_COUNT) throw new Error('DSH artifact descriptor count drift')
  const rootDescriptor = validated.find(descriptor => descriptor.name === '@deepseek-ai/dsh')
  if (!rootDescriptor || rootDescriptor.file !== DSH_ROOT_ARCHIVE || rootDescriptor.sha256 !== DSH_ROOT_SHA256) {
    throw new Error('DSH root artifact identity mismatch')
  }
  const artifactManifest = [
    { path: 'publish-order.txt', sha256: hash(publishOrderBytes, 'sha256'), bytes: publishOrderBytes.length },
    ...validated.map(({ file, sha256, bytes }) => ({ path: file, sha256, bytes })),
  ]
  const validatedManifest = validateDshArtifactManifest(artifactManifest)
  return {
    descriptors: validated,
    artifactManifest: validatedManifest.rows,
    artifactManifestSha256: validatedManifest.sha256,
    rootArtifact: { path: rootDescriptor.file, sha256: rootDescriptor.sha256, bytes: rootDescriptor.bytes },
  }
}

async function inspectScdpArtifact(root) {
  const path = join(root, SCDP_ARCHIVE)
  const bytes = await readFile(path)
  const entries = parseTar(gunzipSync(bytes))
  const manifestBytes = entries.get('package/package.json')
  if (!manifestBytes) throw new Error('scdp artifact has no package/package.json')
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const descriptor = {
    name: manifest.name,
    version: manifest.version,
    file: SCDP_ARCHIVE,
    bytes: bytes.length,
    sha256: hash(bytes, 'sha256'),
    sha512: hash(bytes, 'sha512'),
    private: manifest.private,
    license: manifest.license,
  }
  validateScdpArtifactDescriptor(descriptor)
  return descriptor
}

async function snapshotReleaseInputs(attemptRoot) {
  const dshSource = await inspectDshArtifactSet(dshArtifactSourceRoot)
  const dshRoot = join(attemptRoot, 'dsh-artifacts')
  await mkdir(dshRoot, { recursive: true })
  await cp(join(dshArtifactSourceRoot, 'publish-order.txt'), join(dshRoot, 'publish-order.txt'))
  for (const descriptor of dshSource.descriptors) {
    await cp(join(dshArtifactSourceRoot, descriptor.file), join(dshRoot, descriptor.file))
  }
  const dshSnapshot = await inspectDshArtifactSet(dshRoot)
  if (JSON.stringify(dshSnapshot.artifactManifest) !== JSON.stringify(dshSource.artifactManifest)) {
    throw new Error('snapshotted DSH artifact manifest drift')
  }

  const scdpSource = await inspectScdpArtifact(scdpArtifactSourceRoot)
  const scdpRoot = join(attemptRoot, 'scdp-artifact')
  await mkdir(scdpRoot, { recursive: true })
  await cp(join(scdpArtifactSourceRoot, SCDP_ARCHIVE), join(scdpRoot, SCDP_ARCHIVE))
  const scdpSnapshot = await inspectScdpArtifact(scdpRoot)
  if (JSON.stringify(scdpSnapshot) !== JSON.stringify(scdpSource)) throw new Error('snapshotted scdp artifact drift')
  return { dsh: dshSnapshot, scdp: scdpSnapshot }
}

export function validateProvenance(
  provenance,
  artifact,
  expectedSourceManifest,
  expectedDshArtifactManifestSha256 = DSH_ARTIFACT_MANIFEST_SHA256,
) {
  if (provenance.schema !== 'work-charter-dsh/local-unsigned-provenance/v1') {
    throw new Error('unexpected provenance schema')
  }
  if (provenance.unsigned !== true || Object.hasOwn(provenance, 'commit')) {
    throw new Error('provenance must be unsigned and must not self-reference a future commit')
  }
  assertExactRecord(provenance.artifact, artifact, 'provenance artifact identity')
  assertExactRecord(
    provenance.package,
    { name: 'work-charter-dsh', version: '0.1.0-alpha.1', private: true, license: 'MIT' },
    'provenance package identity',
  )
  assertExactRecord(
    provenance.toolchain,
    { node: process.version, packageManager: 'pnpm@11.7.0', typescript: '6.0.3', tsdown: '0.22.2' },
    'provenance toolchain',
  )
  if (provenance.dsh?.head !== DSH_HEAD || provenance.dsh?.exactTag !== DSH_TAG) {
    throw new Error('provenance DSH identity mismatch')
  }
  const dshArtifacts = provenance.dsh?.artifacts
  if (dshArtifacts?.count !== DSH_ARTIFACT_COUNT) throw new Error('provenance DSH artifact count mismatch')
  const validatedDshManifest = validateDshArtifactManifest(
    dshArtifacts.manifest,
    expectedDshArtifactManifestSha256,
  )
  if (dshArtifacts.manifestSha256 !== validatedDshManifest.sha256) {
    throw new Error('provenance DSH artifact manifest digest mismatch')
  }
  const dshArtifactPaths = validatedDshManifest.rows.map(row => row.path)
  if (dshArtifactPaths.length !== DSH_ARTIFACT_COUNT + 1
    || !dshArtifactPaths.includes('publish-order.txt')
    || dshArtifactPaths.filter(path => path.endsWith(`-${DSH_VERSION}.tgz`)).length !== DSH_ARTIFACT_COUNT) {
    throw new Error('provenance DSH artifact manifest path set drift')
  }
  const rootRow = validatedDshManifest.rows.find(row => row.path === DSH_ROOT_ARCHIVE)
  if (JSON.stringify(rootRow) !== JSON.stringify(dshArtifacts.root)) {
    throw new Error('provenance DSH root artifact row mismatch')
  }
  validateScdpArtifactDescriptor(provenance.sessionCoordinator)
  validateEvidenceRows(provenance.sourceManifest, undefined, 'provenance source manifest')
  if (expectedSourceManifest
    && JSON.stringify(provenance.sourceManifest) !== JSON.stringify(expectedSourceManifest)) {
    throw new Error('provenance source manifest does not match the current release source snapshot')
  }
  validateEvidenceRows(provenance.packageFiles, EXPECTED_PACKAGE_FILES, 'provenance package files')
  if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0
    || !/^[0-9a-f]{64}$/.test(artifact.sha256)
    || !/^[0-9a-f]{128}$/.test(artifact.sha512)) {
    throw new Error('provenance artifact hash or byte length is invalid')
  }

  const inputs = provenance.producerInputs
  if (inputs?.mode !== 'exact-local-dsh-and-published-scdp-tarballs') {
    throw new Error('provenance producer input mode mismatch')
  }
  if (inputs.lockResolution !== 'verified-installed-virtual-store-lock-with-published-scdp-integrity'
    || inputs.dshOverrideCount !== DSH_INSTALLED_OVERRIDE_COUNT) {
    throw new Error('provenance producer lock-resolution boundary mismatch')
  }
  validateEvidenceRows([inputs.generatedLock], ['pnpm-lock.yaml'], 'provenance generated lock')
  if (typeof inputs.generatedLock.content !== 'string') throw new Error('provenance generated lock content is missing')
  const lockBytes = Buffer.from(inputs.generatedLock.content, 'utf8')
  if (lockBytes.length !== inputs.generatedLock.bytes || hash(lockBytes, 'sha256') !== inputs.generatedLock.sha256) {
    throw new Error('provenance generated lock content mismatch')
  }
  validateProducerLock(inputs.generatedLock.content, provenance.sessionCoordinator)
  validateEvidenceRows(
    [inputs.pnpmExecutable],
    ['.verification/corepack/v1/pnpm/11.7.0/bin/pnpm.cjs'],
    'provenance pnpm executable',
  )
  validateEvidenceRows(
    [inputs.installedVirtualStoreLock],
    ['node_modules/.pnpm/lock.yaml'],
    'provenance installed virtual-store lock',
  )
  const augmentation = inputs.installManifestAugmentation
  if (!Array.isArray(augmentation?.addedDevDependencies)
    || augmentation.addedDevDependencies.length === 0
    || JSON.stringify([...augmentation.addedDevDependencies].sort())
      !== JSON.stringify(augmentation.addedDevDependencies)
    || new Set(augmentation.addedDevDependencies).size !== augmentation.addedDevDependencies.length
    || augmentation.addedDevDependencies.some(name => !/^@deepseek-ai\/dsh(?:-|$)/.test(name))
    || augmentation.sourcePackageManifestRestoredBeforeBuild !== true) {
    throw new Error('provenance install-manifest augmentation mismatch')
  }
  const store = inputs.producerStore
  if (store?.mode !== 'attempt-local-prepared-from-prequalified-store'
    || store.pnpmStoreVersion !== 'v11'
    || !Number.isSafeInteger(store.contentFilesHardlinked) || store.contentFilesHardlinked <= 0
    || !Number.isSafeInteger(store.contentFilesCopied) || store.contentFilesCopied < 0
    || !/^[0-9a-f]{64}$/.test(store.sourceIndexSha256)
    || !Number.isSafeInteger(store.sourceIndexBytes) || store.sourceIndexBytes <= 0
    || store.offlinePreparation !== true || store.frozenProducerAccess !== true) {
    throw new Error('provenance producer store drift')
  }
  const reproducibility = provenance.reproducibility
  if (reproducibility?.builds !== 2
    || reproducibility.byteIdenticalTarballs !== true
    || reproducibility.identicalPackageFileManifests !== true
    || reproducibility.sharedGeneratedLockInput !== true
    || reproducibility.frozenProducerInstalls !== true
    || reproducibility.offlineProducerInstalls !== true
    || reproducibility.offlineLockGeneration !== true
    || reproducibility.offlineStorePreparation !== true) {
    throw new Error('provenance reproducibility evidence is incomplete')
  }
}

export async function auditFinalEvidence(layout, expectedSourceManifest) {
  const archive = await readFile(layout.finalArchive)
  const artifact = {
    name: layout.archiveName,
    bytes: archive.length,
    sha256: hash(archive, 'sha256'),
    sha512: hash(archive, 'sha512'),
  }
  if (await readFile(layout.sha256File, 'utf8') !== `${artifact.sha256}  ${artifact.name}\n`) {
    throw new Error('persisted SHA-256 sidecar does not match the final artifact')
  }
  if (await readFile(layout.sha512File, 'utf8') !== `${artifact.sha512}  ${artifact.name}\n`) {
    throw new Error('persisted SHA-512 sidecar does not match the final artifact')
  }
  const provenance = JSON.parse(await readFile(layout.provenanceFile, 'utf8'))
  validateProvenance(provenance, artifact, expectedSourceManifest)
  const tarball = await auditTarball(layout.finalArchive)
  if (JSON.stringify(tarball.files) !== JSON.stringify(provenance.packageFiles)) {
    throw new Error('persisted provenance package files do not match the final artifact')
  }
  return { artifact, files: tarball.files.length }
}

export async function withReleaseEvidenceLock(operation) {
  await mkdir(releaseRoot, { recursive: true })
  try {
    await mkdir(releaseEvidenceLock)
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('release evidence publication or inspection is already in progress', { cause: error })
    throw error
  }
  try {
    return await operation()
  } finally {
    await rm(releaseEvidenceLock, { recursive: true, force: true })
  }
}

function assertExactRecord(actual, expected, label) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error(`${label} drift`)
  const normalize = value => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
  if (JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected))) throw new Error(`${label} drift`)
}

function validateEvidenceRows(rows, expectedPaths, label) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${label} is missing`)
  const paths = []
  for (const row of rows) {
    if (typeof row?.path !== 'string' || row.path.length === 0 || isAbsoluteLike(row.path) || hasUriScheme(row.path)) {
      throw new Error(`${label} contains an invalid path`)
    }
    if (!/^[0-9a-f]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.bytes) || row.bytes < 0) {
      throw new Error(`${label} contains an invalid hash or byte length`)
    }
    paths.push(row.path)
  }
  if (new Set(paths).size !== paths.length) throw new Error(`${label} contains duplicate paths`)
  if (expectedPaths && JSON.stringify([...paths].sort()) !== JSON.stringify([...expectedPaths].sort())) {
    throw new Error(`${label} path set drift`)
  }
}

export async function auditCurrentBuild(root = repositoryRoot) {
  const manifest = validateReleaseMetadata(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')))
  for (const file of REQUIRED_RELEASE_FILES) await assertFile(join(root, file))
  await auditLicense(join(root, 'LICENSE'))
  await auditPublicReleaseDocuments({
    readme: await readFile(join(root, 'README.md'), 'utf8'),
    notices: await readFile(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'),
    skill: await readFile(join(root, 'assets', 'work-charter-dsh.md'), 'utf8'),
  })
  const maps = await listFiles(join(root, 'lib'), path => path.endsWith('.map'))
  if (maps.length === 0) throw new Error('no distributed source maps were built')
  for (const path of maps) auditSourceMapObject(JSON.parse(await readFile(path, 'utf8')), relative(root, path))
  const client = await readFile(join(root, 'lib', 'client.js'), 'utf8')
  const notices = await readFile(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  if (client.includes('node_modules/.pnpm/zod@4.4.3') && !/Zod 4\.4\.3[\s\S]*MIT License/.test(notices)) {
    throw new Error('bundled Zod notice is incomplete')
  }
  return { package: `${manifest.name}@${manifest.version}`, maps: maps.length }
}

async function normalizeGeneratedSourceMaps(root = repositoryRoot) {
  const maps = await listFiles(join(root, 'lib'), path => path.endsWith('.map'))
  if (maps.length === 0) throw new Error('no generated source maps were found to normalize')
  for (const path of maps) {
    const map = JSON.parse(await readFile(path, 'utf8'))
    if (map.sourceRoot === '') delete map.sourceRoot
    await writeFile(path, JSON.stringify(map), 'utf8')
  }
}

export async function auditTarball(path) {
  const entries = parseTar(gunzipSync(await readFile(path)))
  const files = [...entries.keys()].filter(name => !name.endsWith('/')).sort()
  validatePackageFileList(files.map(name => name.startsWith('package/') ? name.slice('package/'.length) : name))
  for (const required of REQUIRED_RELEASE_FILES.map(file => `package/${file}`)) {
    if (!entries.has(required)) throw new Error(`archive is missing ${required}`)
  }
  if (!entries.has('package/package.json')) throw new Error('archive is missing package/package.json')
  await auditLicenseBytes(entries.get('package/LICENSE'))
  const manifest = validateReleaseMetadata(JSON.parse(entries.get('package/package.json').toString('utf8')))
  await auditPublicReleaseDocuments({
    readme: entries.get('package/README.md').toString('utf8'),
    notices: entries.get('package/THIRD_PARTY_NOTICES.md').toString('utf8'),
    skill: entries.get('package/assets/work-charter-dsh.md').toString('utf8'),
  })
  const perFile = []
  for (const name of files) {
    if (!name.startsWith('package/')) throw new Error(`archive entry escaped package root: ${name}`)
    const content = entries.get(name)
    const local = name.slice('package/'.length)
    if (local.endsWith('.map')) auditSourceMapObject(JSON.parse(content.toString('utf8')), local)
    if (/\.(?:js|json|map|md|d\.ts)$/.test(local)) auditText(content.toString('utf8'), local)
    perFile.push({ path: local, sha256: hash(content, 'sha256'), bytes: content.length })
  }
  const client = entries.get('package/lib/client.js')?.toString('utf8') ?? ''
  const notices = entries.get('package/THIRD_PARTY_NOTICES.md').toString('utf8')
  if (client.includes('node_modules/.pnpm/zod@4.4.3') && !/Zod 4\.4\.3[\s\S]*MIT License/.test(notices)) {
    throw new Error('archive notice does not cover bundled Zod 4.4.3')
  }
  return { manifest, files: perFile }
}

async function reproduceLocked() {
  const manifest = validateReleaseMetadata(JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8')))
  const layout = deriveReleaseLayout(manifest)
  await mkdir(releaseRoot, { recursive: true })
  if (!(await stat(join(prequalifiedPnpmStoreRoot, 'v11'))).isDirectory()) {
    throw new Error('prequalified pnpm v11 store is unavailable')
  }
  const pnpmVersion = runCapture(process.execPath, [exactPnpmPath, '--version'], repositoryRoot).trim()
  if (pnpmVersion !== '11.7.0') throw new Error(`exact pnpm version drift: ${pnpmVersion}`)
  const attemptRoot = await mkdtemp(join(releaseRoot, 'reproducibility-'))
  const sourceFiles = await releaseSourceFiles()
  const sourceSnapshotRoot = join(attemptRoot, 'source-snapshot')
  await mkdir(sourceSnapshotRoot, { recursive: true })
  await copyRelativeFiles(repositoryRoot, sourceSnapshotRoot, sourceFiles)
  const sourceManifest = await hashFiles(sourceSnapshotRoot, sourceFiles)
  const inputs = await snapshotReleaseInputs(attemptRoot)
  const preparedStore = await createAttemptPnpmStore(attemptRoot)
  const installedLockPath = join(repositoryRoot, 'node_modules', '.pnpm', 'lock.yaml')
  const installedLockBytes = await readFile(installedLockPath)
  const normalizedInstalledLock = normalizeInstalledVirtualStoreLock(
    installedLockBytes.toString('utf8'),
    inputs.dsh.descriptors,
    inputs.scdp,
  )
  const producerDshDescriptors = dshDescriptorsFromProducerLock(
    normalizedInstalledLock,
    inputs.dsh.descriptors,
  )
  const workspaceConfig = createProducerWorkspaceConfig(producerDshDescriptors, inputs.scdp)

  const lockInputRoot = join(attemptRoot, 'lock-input')
  await mkdir(lockInputRoot, { recursive: true })
  await copyRelativeFiles(sourceSnapshotRoot, lockInputRoot, sourceFiles)
  await writeFile(join(lockInputRoot, 'pnpm-workspace.yaml'), workspaceConfig, 'utf8')
  await writeFile(join(lockInputRoot, 'pnpm-lock.yaml'), normalizedInstalledLock, 'utf8')
  const sourcePackageBytes = await readFile(join(lockInputRoot, 'package.json'))
  const sourcePackage = validateReleaseMetadata(JSON.parse(sourcePackageBytes.toString('utf8')))
  const compatible = createInstalledLockCompatibleManifest(
    sourcePackage,
    normalizedInstalledLock,
    inputs.dsh.descriptors,
  )
  const generatedLockText = normalizedInstalledLock
  const generatedLockBytes = Buffer.from(generatedLockText, 'utf8')
  validateProducerLock(generatedLockText, inputs.scdp, producerDshDescriptors)
  const preparedAddedDevDependencies = await runSourceBoundPnpmInstall(
    lockInputRoot,
    join(attemptRoot, 'store-preparation-cache'),
    inputs.dsh.descriptors,
    generatedLockBytes,
    workspaceConfig,
    preparedStore.root,
    false,
  )
  if (JSON.stringify(preparedAddedDevDependencies) !== JSON.stringify(compatible.addedDevDependencies)) {
    throw new Error('prepared store install-only dependency set drift')
  }

  const results = []
  for (const name of ['build-a', 'build-b']) {
    const buildRoot = join(attemptRoot, name)
    await mkdir(buildRoot, { recursive: true })
    await copyRelativeFiles(sourceSnapshotRoot, buildRoot, sourceFiles)
    const addedDevDependencies = await runSourceBoundPnpmInstall(
      buildRoot,
      join(attemptRoot, `${name}-cache`),
      inputs.dsh.descriptors,
      generatedLockBytes,
      workspaceConfig,
      preparedStore.root,
      true,
    )
    if (JSON.stringify(addedDevDependencies) !== JSON.stringify(compatible.addedDevDependencies)) {
      throw new Error(`${name} install-only dependency set drift`)
    }
    runNpm(['run', 'build'], buildRoot)
    await auditCurrentBuild(buildRoot)
    const packRoot = join(attemptRoot, `${name}-pack`)
    await mkdir(packRoot, { recursive: true })
    runNpm([
      'pack', '--ignore-scripts', '--pack-destination', packRoot,
      '--cache', join(attemptRoot, `${name}-npm-cache`),
    ], buildRoot)
    const archive = join(packRoot, layout.archiveName)
    const audit = await auditTarball(archive)
    results.push({ name, audit, bytes: await readFile(archive) })
  }
  const [first, second] = results
  if (!first || !second) throw new Error('two reproducibility builds were not produced')
  if (!first.bytes.equals(second.bytes)) throw new Error('isolated build tarballs are not byte-identical')
  if (JSON.stringify(first.audit.files) !== JSON.stringify(second.audit.files)) {
    throw new Error('isolated package file manifests differ')
  }
  const artifact = {
    name: layout.archiveName,
    bytes: first.bytes.length,
    sha256: hash(first.bytes, 'sha256'),
    sha512: hash(first.bytes, 'sha512'),
  }
  const pnpmBytes = await readFile(exactPnpmPath)
  const provenance = {
    schema: 'work-charter-dsh/local-unsigned-provenance/v1',
    unsigned: true,
    package: { name: manifest.name, version: manifest.version, private: true, license: 'MIT' },
    toolchain: {
      node: process.version,
      packageManager: manifest.packageManager,
      typescript: manifest.devDependencies.typescript,
      tsdown: manifest.devDependencies.tsdown,
    },
    dsh: {
      head: DSH_HEAD,
      exactTag: DSH_TAG,
      artifacts: {
        count: inputs.dsh.descriptors.length,
        root: inputs.dsh.rootArtifact,
        manifestSha256: inputs.dsh.artifactManifestSha256,
        manifest: inputs.dsh.artifactManifest,
      },
    },
    sessionCoordinator: inputs.scdp,
    sourceManifest,
    packageFiles: first.audit.files,
    artifact,
    producerInputs: {
      mode: 'exact-local-dsh-and-published-scdp-tarballs',
      lockResolution: 'verified-installed-virtual-store-lock-with-published-scdp-integrity',
      dshOverrideCount: producerDshDescriptors.length,
      pnpmExecutable: {
        path: '.verification/corepack/v1/pnpm/11.7.0/bin/pnpm.cjs',
        sha256: hash(pnpmBytes, 'sha256'),
        bytes: pnpmBytes.length,
      },
      installedVirtualStoreLock: {
        path: 'node_modules/.pnpm/lock.yaml',
        sha256: hash(installedLockBytes, 'sha256'),
        bytes: installedLockBytes.length,
      },
      installManifestAugmentation: {
        addedDevDependencies: compatible.addedDevDependencies,
        sourcePackageManifestRestoredBeforeBuild: true,
      },
      producerStore: preparedStore.evidence,
      generatedLock: {
        path: 'pnpm-lock.yaml',
        sha256: hash(generatedLockBytes, 'sha256'),
        bytes: generatedLockBytes.length,
        content: generatedLockText,
      },
    },
    reproducibility: {
      builds: 2,
      byteIdenticalTarballs: true,
      identicalPackageFileManifests: true,
      sharedGeneratedLockInput: true,
      frozenProducerInstalls: true,
      offlineProducerInstalls: true,
      offlineLockGeneration: true,
      offlineStorePreparation: true,
    },
  }
  validateProvenance(provenance, artifact)
  await rm(layout.finalRoot, { recursive: true, force: true })
  await mkdir(layout.finalRoot, { recursive: true })
  await writeFile(layout.finalArchive, first.bytes)
  await writeFile(layout.sha256File, `${artifact.sha256}  ${artifact.name}\n`, 'utf8')
  await writeFile(layout.sha512File, `${artifact.sha512}  ${artifact.name}\n`, 'utf8')
  await writeFile(layout.provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8')
  const persisted = await auditFinalEvidence(layout, sourceManifest)
  process.stdout.write(`${JSON.stringify({ result: 'PASS', artifact: persisted.artifact, files: persisted.files, layout }, null, 2)}\n`)
}

export async function reproduce(operation = reproduceLocked) {
  return withReleaseEvidenceLock(operation)
}

async function packCurrent() {
  const manifest = validateReleaseMetadata(JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8')))
  const root = join(releaseRoot, 'current-pack')
  await rm(root, { recursive: true, force: true })
  await mkdir(root, { recursive: true })
  await auditCurrentBuild(repositoryRoot)
  runNpm([
    'pack', '--ignore-scripts', '--pack-destination', root,
    '--cache', join(releaseRoot, 'current-npm-cache'),
  ], repositoryRoot)
  const path = join(root, `${manifest.name}-${manifest.version}.tgz`)
  const audit = await auditTarball(path)
  process.stdout.write(`${JSON.stringify({ result: 'PASS', path, files: audit.files.length, sha256: hash(await readFile(path), 'sha256') })}\n`)
}

function validateProducerLock(lockText, scdpDescriptor, dshDescriptors) {
  if (typeof lockText !== 'string' || lockText.length === 0) throw new Error('generated producer lock is missing')
  auditText(lockText, 'generated producer lock')
  if (lockText.includes('file:.verification/') || lockText.includes('file:../artifacts/')) {
    throw new Error('generated producer lock retained a source artifact path')
  }
  const expectedScdp = `file:../scdp-artifact/${scdpDescriptor.file}`
  if (!lockText.includes(expectedScdp)) throw new Error('generated producer lock is not bound to published scdp')
  if (!lockText.includes(Buffer.from(SCDP_SHA512, 'hex').toString('base64'))) {
    throw new Error('generated producer lock does not contain the published scdp integrity')
  }
  if (dshDescriptors) {
    for (const descriptor of validateDshArtifactDescriptors(dshDescriptors)) {
      if (!lockText.includes(`file:../dsh-artifacts/${descriptor.file}`)) {
        throw new Error(`generated producer lock is missing DSH override ${descriptor.name}`)
      }
    }
  }
}

async function releaseSourceFiles() {
  const files = [...SOURCE_ROOT_FILES, ...SOURCE_SCRIPT_FILES]
  for (const root of ['src', 'assets']) {
    const sourceFiles = await listFiles(join(repositoryRoot, root), () => true)
    files.push(...sourceFiles.map(path => relative(repositoryRoot, path).split(sep).join('/')))
  }
  return [...new Set(files)].sort()
}

async function currentSourceManifest() {
  return hashFiles(repositoryRoot, await releaseSourceFiles())
}

async function copyRelativeFiles(from, to, files) {
  for (const file of files) {
    const target = join(to, file)
    await mkdir(dirname(target), { recursive: true })
    await cp(join(from, file), target)
  }
}

async function createAttemptPnpmStore(attemptRoot) {
  const sourceV11 = join(prequalifiedPnpmStoreRoot, 'v11')
  const targetRoot = join(attemptRoot, 'prepared-store')
  const targetV11 = join(targetRoot, 'v11')
  await mkdir(targetV11, { recursive: true })
  for (const entry of await readdir(sourceV11, { withFileTypes: true })) {
    if (entry.name === 'files' || entry.name === 'projects') continue
    await cp(join(sourceV11, entry.name), join(targetV11, entry.name), { recursive: true })
  }
  const sourceContentRoot = join(sourceV11, 'files')
  const targetContentRoot = join(targetV11, 'files')
  const contentFiles = await listFiles(sourceContentRoot, () => true)
  const parentDirectories = new Set(contentFiles.map(path => dirname(relative(sourceContentRoot, path))))
  for (const parent of parentDirectories) await mkdir(join(targetContentRoot, parent), { recursive: true })
  let contentFilesHardlinked = 0
  let contentFilesCopied = 0
  for (let offset = 0; offset < contentFiles.length; offset += 128) {
    await Promise.all(contentFiles.slice(offset, offset + 128).map(async source => {
      const target = join(targetContentRoot, relative(sourceContentRoot, source))
      try {
        await link(source, target)
        contentFilesHardlinked += 1
      } catch (error) {
        if (!['EMLINK', 'UNKNOWN'].includes(error?.code)) throw error
        await cp(source, target)
        contentFilesCopied += 1
      }
    }))
  }
  const indexBytes = await readFile(join(sourceV11, 'index.db'))
  return {
    root: targetRoot,
    evidence: {
      mode: 'attempt-local-prepared-from-prequalified-store',
      pnpmStoreVersion: 'v11',
      contentFilesHardlinked,
      contentFilesCopied,
      sourceIndexSha256: hash(indexBytes, 'sha256'),
      sourceIndexBytes: indexBytes.length,
      offlinePreparation: true,
      frozenProducerAccess: true,
    },
  }
}

async function runSourceBoundPnpmInstall(
  root,
  cache,
  dshDescriptors,
  lockBytes,
  workspaceConfig,
  storeRoot,
  frozenStore,
) {
  const sourcePackageBytes = await readFile(join(root, 'package.json'))
  const sourcePackage = validateReleaseMetadata(JSON.parse(sourcePackageBytes.toString('utf8')))
  const lockText = lockBytes.toString('utf8')
  const compatible = createInstalledLockCompatibleManifest(sourcePackage, lockText, dshDescriptors)
  await writeFile(join(root, 'pnpm-workspace.yaml'), workspaceConfig, 'utf8')
  await writeFile(join(root, 'pnpm-lock.yaml'), lockBytes)
  await writeFile(join(root, 'package.json'), `${JSON.stringify(compatible.manifest, null, 2)}\n`, 'utf8')
  try {
    runPnpm([
      'install', '--offline', '--frozen-lockfile', ...(frozenStore ? ['--frozen-store'] : []),
      '--ignore-scripts', '--no-runtime', '--trust-lockfile', '--store-dir', storeRoot,
      `--config.cache-dir=${cache}`,
    ], root)
  } finally {
    await writeFile(join(root, 'package.json'), sourcePackageBytes)
  }
  if (!(await readFile(join(root, 'package.json'))).equals(sourcePackageBytes)) {
    throw new Error('source package manifest was not restored after producer install')
  }
  return compatible.addedDevDependencies
}

function runPnpm(args, cwd) {
  run(process.execPath, [exactPnpmPath, ...args], cwd)
}

function runNpm(args, cwd) {
  const npmCli = process.env.npm_execpath
  if (typeof npmCli !== 'string' || npmCli.length === 0) {
    throw new Error('release audit must be launched through repository npm scripts')
  }
  run(process.execPath, [npmCli, ...args], cwd)
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${String(result.status)}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
}

function runCapture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with ${String(result.status)}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
  return result.stdout ?? ''
}

async function hashFiles(root, files) {
  const rows = []
  for (const path of files) {
    const content = await readFile(join(root, path))
    rows.push({ path: path.split(sep).join('/'), sha256: hash(content, 'sha256'), bytes: content.length })
  }
  return rows
}

function hash(content, algorithm) {
  return createHash(algorithm).update(content).digest('hex')
}

function parseTar(buffer) {
  const entries = new Map()
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const header = buffer.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = readTarText(header.subarray(0, 100))
    const prefix = readTarText(header.subarray(345, 500))
    const fullName = prefix ? `${prefix}/${name}` : name
    const sizeText = readTarText(header.subarray(124, 136)).trim()
    const size = Number.parseInt(sizeText || '0', 8)
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`invalid tar size for ${fullName}`)
    const type = header[156]
    const contentStart = offset + 512
    const contentEnd = contentStart + size
    if (contentEnd > buffer.length) throw new Error(`truncated tar entry ${fullName}`)
    if (type === 0 || type === 48) entries.set(fullName.replaceAll('\\', '/'), buffer.subarray(contentStart, contentEnd))
    offset = contentStart + Math.ceil(size / 512) * 512
  }
  return entries
}

function readTarText(buffer) {
  const end = buffer.indexOf(0)
  return buffer.subarray(0, end === -1 ? buffer.length : end).toString('utf8')
}

export function auditText(text, label) {
  const driveAbsolutePath = /(?:^|[\s"'`(=])[A-Za-z]:[\\/][^\s"']*/m
  const uncAbsolutePath = /(?:^|[\s"'`=])\\{2,}[^\\\s"'`]+\\+[^\\\s"'`]*/m
  const posixAbsolutePath = /(?:^|[\s"'`=])\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+(?:[/?#][^\s"'`]*)?/m
  const fileUri = /(?:^|[\s"'`(=])file:(?:\/{1,3}|\\{1,2})/im
  if (driveAbsolutePath.test(text) || uncAbsolutePath.test(text) || posixAbsolutePath.test(text) || fileUri.test(text)) {
    throw new Error(`${label} contains a machine-absolute path`)
  }
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bsk-[A-Za-z0-9]{20,}\b/,
  ]
  if (secretPatterns.some(pattern => pattern.test(text))) throw new Error(`${label} contains a secret-like value`)
}

function isAbsoluteLike(path) {
  return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\') || path.startsWith('/') || path.startsWith('file:')
}

function hasUriScheme(path) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)
}

async function listFiles(root, predicate) {
  const output = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) output.push(...await listFiles(path, predicate))
    else if (entry.isFile() && predicate(path)) output.push(path)
  }
  return output.sort()
}

async function assertFile(path) {
  if (!(await stat(path)).isFile()) throw new Error(`${path} is not a file`)
}

async function auditLicense(path) {
  await auditLicenseBytes(await readFile(path))
}

export async function auditLicenseBytes(bytes) {
  if (!bytes || bytes.length === 0) throw new Error('MIT LICENSE is missing')
  const normalizedText = bytes.toString('utf8').replaceAll('\r\n', '\n')
  if (normalizedText !== EXPECTED_MIT_LICENSE) {
    throw new Error('MIT LICENSE must match the complete expected text after CRLF normalization')
  }
}

async function auditPublicReleaseDocuments({ readme, notices, skill }) {
  if (!readme.includes('https://github.com/junwei529/work-charter-dsh')
    || !readme.includes('private')
    || !readme.includes('MIT License')) {
    throw new Error('README GitHub/private/license boundary is incomplete')
  }
  if (!/Zod 4\.4\.3[\s\S]*MIT License/.test(notices)) {
    throw new Error('THIRD_PARTY_NOTICES release boundary is incomplete')
  }
  if (!skill.startsWith('# Work Charter for DSH')
    || !skill.includes('A Charter never grants permissions.')) {
    throw new Error('packaged Work Charter Skill boundary is incomplete')
  }
}

const command = process.argv[2]
if (command === 'audit-current') {
  const result = await withReleaseEvidenceLock(async () => {
    const layout = deriveReleaseLayout(JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8')))
    const sourceManifest = await currentSourceManifest()
    const current = await auditCurrentBuild()
    const final = await auditFinalEvidence(layout, sourceManifest)
    return { ...current, final }
  })
  process.stdout.write(`${JSON.stringify({ result: 'PASS', ...result })}\n`)
} else if (command === 'pack-current') {
  await packCurrent()
} else if (command === 'reproduce') {
  await reproduce()
} else if (command === 'normalize-source-maps') {
  await normalizeGeneratedSourceMaps()
} else if (command !== undefined) {
  throw new Error(`unknown release-audit command: ${command}`)
}
