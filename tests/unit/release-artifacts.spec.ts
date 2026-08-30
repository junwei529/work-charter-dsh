import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

interface EvidenceRow {
  path: string
  sha256: string
  bytes: number
}

interface DshArtifactDescriptor {
  name: string
  version: string
  file: string
  sha256: string
  bytes: number
}

interface ScdpArtifactDescriptor {
  name: string
  version: string
  file: string
  bytes: number
  sha256: string
  sha512: string
  private: boolean
  license: string
}

interface ReleaseAuditModule {
  deriveReleaseLayout: (manifest: Record<string, unknown>, root?: string) => {
    archiveName: string
    finalArchive: string
    sha256File: string
    sha512File: string
    provenanceFile: string
  }
  validateReleaseMetadata: (manifest: Record<string, unknown>) => Record<string, unknown>
  auditSourceMapObject: (map: Record<string, unknown>, label: string) => void
  auditLicenseBytes: (bytes: Buffer) => Promise<void>
  validateBundlePatchBytes: (bytes: Buffer) => void
  auditText: (text: string, label: string) => void
  validatePackageFileList: (files: string[]) => string[]
  validateDshArtifactDescriptors: (descriptors: DshArtifactDescriptor[]) => DshArtifactDescriptor[]
  validateDshArtifactManifest: (
    rows: EvidenceRow[],
    expectedSha256?: string,
  ) => { rows: EvidenceRow[]; sha256: string }
  validateScdpArtifactDescriptor: (descriptor: ScdpArtifactDescriptor) => ScdpArtifactDescriptor
  createProducerWorkspaceConfig: (
    dshDescriptors: DshArtifactDescriptor[],
    scdpDescriptor: ScdpArtifactDescriptor,
  ) => string
  normalizeInstalledVirtualStoreLock: (
    lock: string,
    dshDescriptors: DshArtifactDescriptor[],
    scdpDescriptor: ScdpArtifactDescriptor,
    dshRoot?: string,
    scdpRoot?: string,
  ) => string
  dshDescriptorsFromProducerLock: (
    lock: string,
    descriptors: DshArtifactDescriptor[],
  ) => DshArtifactDescriptor[]
  createInstalledLockCompatibleManifest: (
    manifest: Record<string, unknown>,
    lock: string,
    dshDescriptors: DshArtifactDescriptor[],
  ) => { manifest: Record<string, unknown>; addedDevDependencies: string[] }
  validateProvenance: (
    provenance: Record<string, unknown>,
    artifact: Record<string, unknown>,
    expectedSourceManifest?: EvidenceRow[],
    expectedDshArtifactManifestSha256?: string,
  ) => void
  auditCurrentBuild: (root?: string) => Promise<{ package: string; maps: number }>
  withReleaseEvidenceLock: <T>(operation: () => Promise<T>) => Promise<T>
  reproduce: <T>(operation?: () => Promise<T>) => Promise<T>
}

const audit = await import(new URL('../../scripts/release-audit.mjs', import.meta.url).href) as ReleaseAuditModule
const expectedPackageFiles = [
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'assets/work-charter-dsh.md',
  'cordis.patch.yml',
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
const scdpDescriptor: ScdpArtifactDescriptor = {
  name: 'session-coordinator-dsh',
  version: '0.1.1-alpha.1',
  file: 'session-coordinator-dsh-0.1.1-alpha.1.tgz',
  bytes: 97138,
  sha256: '9575d1edf782f16b2d87b49bc27e290ecf841fa607a7d4a4468a41de2389b269',
  sha512: '2cffe633734aea39989dd28d70e811536dd54aace5038b87ece3416013809fabf1394e053559e2f6c9b61c67f35ecd22a10972621cb3bdf79b097dd0bc2df2df',
  private: true,
  license: 'MIT',
}

function fixtureDshDescriptors(): DshArtifactDescriptor[] {
  return Array.from({ length: 78 }, (_, index) => {
    const suffix = `fixture-${String(index).padStart(3, '0')}`
    return {
      name: `@deepseek-ai/dsh-${suffix}`,
      version: '0.1.2-alpha.1',
      file: `deepseek-ai-dsh-${suffix}-0.1.2-alpha.1.tgz`,
      sha256: String(index % 10).repeat(64),
      bytes: index + 1,
    }
  })
}

function fixtureInstalledLock(descriptors: DshArtifactDescriptor[]): string {
  const oldIntegrity = 'a'.repeat(88)
  return [
    "lockfileVersion: '9.0'",
    '',
    'overrides:',
    ...descriptors.map(descriptor => `  '${descriptor.name}': file:D:/dsh/${descriptor.file}`),
    '  session-coordinator-dsh: file:D:/scdp/session-coordinator-dsh-0.1.1-alpha.1.tgz',
    '',
    'pnpmfileChecksum: sha256-fixture',
    '',
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    '      zod:',
    '        specifier: 4.4.3',
    '        version: 4.4.3',
    '    devDependencies:',
    ...descriptors.flatMap(descriptor => [
      `      '${descriptor.name}':`,
      `        specifier: file:D:/dsh/${descriptor.file}`,
      '        version: fixture',
    ]),
    '',
    'packages:',
    '',
    '  session-coordinator-dsh@file:.verification/artifacts/session-coordinator-dsh-0.1.1-alpha.1.tgz:',
    `    resolution: {integrity: sha512-${oldIntegrity}, tarball: file:.verification/artifacts/session-coordinator-dsh-0.1.1-alpha.1.tgz}`,
    '    version: 0.1.1-alpha.1',
    '',
    '',
  ].join('\n')
}

describe('release-readiness artifacts', () => {
  it('derives the exact private GitHub Pre-release artifact paths', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as Record<string, unknown>
    expect(audit.validateReleaseMetadata(manifest)).toBe(manifest)
    const layout = audit.deriveReleaseLayout(manifest, join('root', 'release'))
    expect(layout.archiveName).toBe('work-charter-dsh-0.1.0-alpha.1.tgz')
    expect(layout.finalArchive).toBe(join('root', 'release', 'final', layout.archiveName))
    expect(layout.sha256File).toBe(`${layout.finalArchive}.sha256`)
    expect(layout.sha512File).toBe(`${layout.finalArchive}.sha512`)
    expect(layout.provenanceFile).toBe(`${layout.finalArchive}.provenance.json`)
  })

  it('fails closed on release metadata, package files, source paths, source contents, and license drift', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as Record<string, unknown>
    expect(() => audit.validateReleaseMetadata({ ...manifest, private: false })).toThrow(/private/)
    expect(() => audit.validateReleaseMetadata({ ...manifest, repository: { type: 'git', url: 'https://example.test' } })).toThrow(/repository/)
    expect(() => audit.validateReleaseMetadata({ ...manifest, peerDependencies: {} })).toThrow(/peer dependency/)
    expect(() => audit.validateReleaseMetadata({ ...manifest, dsh: { ...(manifest.dsh as object), bundle: undefined } })).toThrow(/bundle patch/)
    expect(() => audit.validateReleaseMetadata({ ...manifest, publishConfig: {} })).toThrow(/publishConfig/)
    expect(audit.validatePackageFileList(expectedPackageFiles)).toEqual(expectedPackageFiles)
    expect(() => audit.validatePackageFileList(expectedPackageFiles.slice(1))).toThrow(/missing=LICENSE/)
    expect(() => audit.validatePackageFileList([...expectedPackageFiles, 'lib/unreviewed.js'])).toThrow(/extra=lib\/unreviewed\.js/)
    expect(() => { audit.auditSourceMapObject({ sources: ['D:\\source.ts'] }, 'map'); }).toThrow(/absolute/)
    expect(() => { audit.auditSourceMapObject({ sources: ['../source.ts'], sourcesContent: ['private'] }, 'map'); }).toThrow(/sourcesContent/)
    expect(() => { audit.auditSourceMapObject({ sourceRoot: '../src', sources: ['../source.ts'] }, 'map'); }).not.toThrow()
    expect(() => { audit.auditText(String.raw`asset = "\\server\share\client.js"`, 'bundle'); }).toThrow(/machine-absolute/)
    expect(() => { audit.auditText(String.raw`pattern = /foo\/bar/`, 'bundle'); }).not.toThrow()
    const licenseText = (await readFile('LICENSE', 'utf8')).replaceAll('\r\n', '\n')
    await expect(audit.auditLicenseBytes(Buffer.from(licenseText))).resolves.toBeUndefined()
    await expect(audit.auditLicenseBytes(Buffer.from(`${licenseText}\nAdditional terms.\n`))).rejects.toThrow(/complete expected text/)
    const bundlePatch = await readFile('cordis.patch.yml')
    expect(() => { audit.validateBundlePatchBytes(bundlePatch); }).not.toThrow()
    expect(() => {
      audit.validateBundlePatchBytes(Buffer.from('- insert:\n    - id: work-charter\n      name: work-charter-dsh\n'))
    }).toThrow(/session-coordinator-dsh before/)
  })

  it('normalizes only the installed DSH/scdp boundary and binds published scdp integrity', () => {
    const descriptors = fixtureDshDescriptors()
    const installedLock = fixtureInstalledLock(descriptors)
    const normalized = audit.normalizeInstalledVirtualStoreLock(
      installedLock,
      descriptors,
      scdpDescriptor,
      'D:/dsh',
      'D:/scdp',
    )
    const publishedIntegrity = Buffer.from(scdpDescriptor.sha512, 'hex').toString('base64')
    expect(normalized).toContain(`integrity: sha512-${publishedIntegrity}`)
    expect(normalized).toContain('file:../scdp-artifact/session-coordinator-dsh-0.1.1-alpha.1.tgz')
    expect(normalized).not.toContain('D:/dsh')
    expect(normalized).not.toContain('D:/scdp')
    expect(normalized).not.toContain('file:.verification/artifacts/')
    expect(normalized).not.toContain('pnpmfileChecksum')
    expect(audit.dshDescriptorsFromProducerLock(normalized, descriptors)).toEqual(
      [...descriptors].sort((left, right) => left.name.localeCompare(right.name)),
    )
    const workspace = JSON.parse(audit.createProducerWorkspaceConfig(descriptors, scdpDescriptor)) as {
      packages: string[]
      overrides: Record<string, string>
    }
    expect(workspace.packages).toEqual(['.'])
    expect(Object.keys(workspace.overrides)).toHaveLength(79)
    expect(workspace.overrides['session-coordinator-dsh']).toBe(
      'file:../scdp-artifact/session-coordinator-dsh-0.1.1-alpha.1.tgz',
    )
    const firstDescriptor = descriptors[0]
    if (!firstDescriptor) {
      throw new Error('fixture requires at least one DSH descriptor')
    }
    const compatible = audit.createInstalledLockCompatibleManifest(
      { devDependencies: { [firstDescriptor.name]: '0.1.2-alpha.1' } },
      normalized,
      descriptors,
    )
    expect(compatible.addedDevDependencies).toHaveLength(77)
    expect(() => audit.normalizeInstalledVirtualStoreLock(
      installedLock.replace('file:D:/dsh/', 'file:E:/other/'),
      descriptors,
      scdpDescriptor,
      'D:/dsh',
      'D:/scdp',
    )).toThrow(/override drift|unexpected absolute/)
    expect(() => audit.validateScdpArtifactDescriptor({ ...scdpDescriptor, sha256: '0'.repeat(64) })).toThrow(/published artifact/)
  })

  it('validates complete non-self-referential provenance and its exact external inputs', () => {
    const artifact = {
      name: 'work-charter-dsh-0.1.0-alpha.1.tgz',
      bytes: 1,
      sha256: 'a'.repeat(64),
      sha512: 'b'.repeat(128),
    }
    const sourceManifest: EvidenceRow[] = [{ path: 'package.json', sha256: 'c'.repeat(64), bytes: 1 }]
    const dshManifest: EvidenceRow[] = [
      { path: 'publish-order.txt', sha256: 'd'.repeat(64), bytes: 1 },
      {
        path: 'deepseek-ai-dsh-0.1.2-alpha.1.tgz',
        sha256: '95d12c190d169c99db15d8958b034004489b6b43a0cb50879f885102bb18ed32',
        bytes: 2,
      },
      ...Array.from({ length: 240 }, (_, index) => ({
        path: `deepseek-ai-dsh-fixture-${String(index).padStart(3, '0')}-0.1.2-alpha.1.tgz`,
        sha256: 'e'.repeat(64),
        bytes: 1,
      })),
    ]
    const dshManifestSha256 = createHash('sha256').update(Buffer.from(JSON.stringify(
      [...dshManifest].sort((left, right) => left.path.localeCompare(right.path)),
    ))).digest('hex')
    const publishedIntegrity = Buffer.from(scdpDescriptor.sha512, 'hex').toString('base64')
    const generatedLockContent = [
      "lockfileVersion: '9.0'",
      '  session-coordinator-dsh: file:../scdp-artifact/session-coordinator-dsh-0.1.1-alpha.1.tgz',
      `    resolution: {integrity: sha512-${publishedIntegrity}}`,
      '',
    ].join('\n')
    const generatedLockBytes = Buffer.from(generatedLockContent)
    const provenance = {
      schema: 'work-charter-dsh/local-unsigned-provenance/v1',
      unsigned: true,
      package: { name: 'work-charter-dsh', version: '0.1.0-alpha.1', private: true, license: 'MIT' },
      toolchain: { node: process.version, packageManager: 'pnpm@11.7.0', typescript: '6.0.3', tsdown: '0.22.2' },
      dsh: {
        head: 'cd5ef8148158c3a752a658978873241fdf8e2bbc',
        exactTag: 'dsh-v0.1.2-alpha.1',
        artifacts: {
          count: 241,
          root: dshManifest[1],
          manifestSha256: dshManifestSha256,
          manifest: dshManifest,
        },
      },
      sessionCoordinator: scdpDescriptor,
      sourceManifest,
      packageFiles: expectedPackageFiles.map(path => ({ path, sha256: 'f'.repeat(64), bytes: 1 })),
      artifact,
      producerInputs: {
        mode: 'exact-local-dsh-and-published-scdp-tarballs',
        lockResolution: 'verified-installed-virtual-store-lock-with-published-scdp-integrity',
        dshOverrideCount: 78,
        pnpmExecutable: {
          path: '.verification/corepack/v1/pnpm/11.7.0/bin/pnpm.cjs',
          sha256: '1'.repeat(64),
          bytes: 1,
        },
        installedVirtualStoreLock: {
          path: 'node_modules/.pnpm/lock.yaml',
          sha256: '2'.repeat(64),
          bytes: 1,
        },
        installManifestAugmentation: {
          addedDevDependencies: ['@deepseek-ai/dsh-fixture'],
          sourcePackageManifestRestoredBeforeBuild: true,
        },
        producerStore: {
          mode: 'attempt-local-prepared-from-prequalified-store',
          pnpmStoreVersion: 'v11',
          contentFilesHardlinked: 1,
          contentFilesCopied: 0,
          sourceIndexSha256: '3'.repeat(64),
          sourceIndexBytes: 1,
          offlinePreparation: true,
          frozenProducerAccess: true,
        },
        generatedLock: {
          path: 'pnpm-lock.yaml',
          sha256: createHash('sha256').update(generatedLockBytes).digest('hex'),
          bytes: generatedLockBytes.length,
          content: generatedLockContent,
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
    const validate = (value: Record<string, unknown>, expected = sourceManifest): void => {
      audit.validateProvenance(value, artifact, expected, dshManifestSha256)
    }
    expect(() => { validate(provenance); }).not.toThrow()
    expect(() => { validate({ ...provenance, commit: 'future' }); }).toThrow(/future commit/)
    expect(() => { validate({ ...provenance, sessionCoordinator: { ...scdpDescriptor, bytes: 2 } }); }).toThrow(/published artifact/)
    expect(() => { validate({ ...provenance, sourceManifest: undefined }); }).toThrow(/source manifest/)
    expect(() => { validate({ ...provenance, packageFiles: [] }); }).toThrow(/package files/)
    expect(() => { validate({
      ...provenance,
      dsh: {
        ...provenance.dsh,
        artifacts: { ...(provenance.dsh as { artifacts: Record<string, unknown> }).artifacts, manifest: dshManifest.slice(0, 2) },
      },
    }); }).toThrow(/exact-source build|path set/)
    expect(() => { validate(provenance, [{ path: 'package.json', sha256: '0'.repeat(64), bytes: 1 }]); }).toThrow(/current release source snapshot/)
  })

  it('audits the current build and fails concurrent final-evidence access closed', async () => {
    const built = await audit.auditCurrentBuild()
    expect(built.package).toBe('work-charter-dsh@0.1.0-alpha.1')
    expect(built.maps).toBeGreaterThan(0)
    const entered = Promise.withResolvers<undefined>()
    const release = Promise.withResolvers<undefined>()
    const first = audit.reproduce(async () => {
      entered.resolve(undefined)
      await release.promise
    })
    await entered.promise
    await expect(audit.withReleaseEvidenceLock(() => Promise.resolve(undefined))).rejects.toThrow(/already in progress/)
    await expect(audit.reproduce(() => Promise.resolve(undefined))).rejects.toThrow(/already in progress/)
    release.resolve(undefined)
    await first
    await expect(audit.withReleaseEvidenceLock(() => Promise.resolve('released'))).resolves.toBe('released')
  })
})
