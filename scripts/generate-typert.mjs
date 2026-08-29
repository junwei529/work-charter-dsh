import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator'

const packageId = 'work-charter-dsh'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = join(repositoryRoot, '.verification', 'typert-workspace')
const mirrorRoot = join(workspaceRoot, 'packages', packageId)
const protocolRoot = join(workspaceRoot, 'packages', 'dsh-typert-protocol')
const scdpRoot = join(workspaceRoot, 'packages', 'session-coordinator-dsh')
const outputRoot = join(repositoryRoot, 'lib')

await rm(workspaceRoot, { recursive: true, force: true })
await mkdir(mirrorRoot, { recursive: true })

try {
  await cp(join(repositoryRoot, 'src'), join(mirrorRoot, 'src'), { recursive: true })
  await mkdir(join(protocolRoot, 'src'), { recursive: true })
  await mkdir(join(scdpRoot, 'src'), { recursive: true })
  await cp(
    join(repositoryRoot, 'node_modules', '@deepseek-ai', 'dsh-typert-protocol', 'lib', 'types', 'index.d.ts'),
    join(protocolRoot, 'src', 'index.ts'),
  )
  await cp(
    join(repositoryRoot, 'node_modules', '@deepseek-ai', 'dsh-typert-protocol', 'lib', 'types', 'types.d.ts'),
    join(protocolRoot, 'src', 'types.ts'),
  )
  await cp(
    join(repositoryRoot, 'node_modules', 'session-coordinator-dsh', 'lib', 'types', 'index.d.ts'),
    join(scdpRoot, 'src', 'index.ts'),
  )
  await cp(
    join(repositoryRoot, 'node_modules', 'session-coordinator-dsh', 'lib', 'types', 'types.d.ts'),
    join(scdpRoot, 'src', 'types.ts'),
  )
  await cp(
    join(repositoryRoot, 'node_modules', 'session-coordinator-dsh', 'lib', 'types', 'storage.d.ts'),
    join(scdpRoot, 'src', 'storage.ts'),
  )
  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'package.json'), 'utf8'))
  const protocolManifest = JSON.parse(await readFile(
    join(repositoryRoot, 'node_modules', '@deepseek-ai', 'dsh-typert-protocol', 'package.json'),
    'utf8',
  ))
  const scdpManifest = JSON.parse(await readFile(
    join(repositoryRoot, 'node_modules', 'session-coordinator-dsh', 'package.json'),
    'utf8',
  ))
  await writeFile(join(mirrorRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(join(protocolRoot, 'package.json'), `${JSON.stringify(protocolManifest, null, 2)}\n`)
  await writeFile(join(scdpRoot, 'package.json'), `${JSON.stringify(scdpManifest, null, 2)}\n`)
  await writeJson(join(workspaceRoot, 'tsconfig.host.json'), {
    files: [],
    compilerOptions: {
      target: 'ES2024',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      baseUrl: '.',
      ignoreDeprecations: '6.0',
      paths: {
        '@deepseek-ai/dsh-typert-protocol': ['packages/dsh-typert-protocol/src/index.ts'],
        'session-coordinator-dsh': ['packages/session-coordinator-dsh/src/index.ts'],
      },
      strict: true,
      skipLibCheck: true,
      allowImportingTsExtensions: true,
      noEmit: true,
    },
    references: [
      { path: `./packages/${packageId}` },
      { path: './packages/dsh-typert-protocol' },
      { path: './packages/session-coordinator-dsh' },
    ],
  })
  await writeJson(join(mirrorRoot, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2024',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2024', 'DOM', 'DOM.Iterable'],
      strict: true,
      noImplicitAny: true,
      skipLibCheck: true,
      types: ['node'],
      jsx: 'react-jsx',
      allowImportingTsExtensions: true,
      baseUrl: '.',
      ignoreDeprecations: '6.0',
      paths: {
        '@deepseek-ai/dsh-typert-protocol': ['../dsh-typert-protocol/src/index.ts'],
        'session-coordinator-dsh': ['../session-coordinator-dsh/src/index.ts'],
      },
      composite: true,
      noEmit: true,
    },
    include: ['src/*.ts'],
  })
  await writeJson(join(protocolRoot, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2024', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
      skipLibCheck: true, allowImportingTsExtensions: true, composite: true, noEmit: true,
    },
    include: ['src'],
  })
  await writeJson(join(scdpRoot, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2024', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
      skipLibCheck: true, allowImportingTsExtensions: true, composite: true, noEmit: true,
      baseUrl: '.',
      ignoreDeprecations: '6.0',
      paths: { 'session-coordinator-dsh': ['./src/index.ts'] },
    },
    include: ['src'],
  })

  const generated = new WorkspaceTypertGenerator(workspaceRoot).generate([packageId], ['host'])
  const artifact = generated.find(candidate => candidate.package === packageId && candidate.face === 'host')
  if (artifact === undefined || artifact.remote === undefined) {
    throw new Error('Typert did not generate the required Host and Remote artifacts')
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, 'typert.host.js'), artifact.js)
  await writeFile(join(outputRoot, 'typert.host.d.ts'), artifact.dts)
  await writeFile(join(outputRoot, 'typert.remote-client.js'), hardenRemoteObjectSchemas(artifact.remote.js))
  await writeFile(join(outputRoot, 'typert.remote-client.d.ts'), artifact.remote.dts)
  await writeFile(join(outputRoot, 'typert.remote-client.d.ts.map'), stripSourcesContent(artifact.remote.dtsMap))
} finally {
  await rm(workspaceRoot, { recursive: true, force: true })
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

function hardenRemoteObjectSchemas(source) {
  const hardened = source.replaceAll('z.object({', 'z.strictObject({')
  if (hardened === source || hardened.includes('z.object({')) {
    throw new Error('Typert Remote object schemas were not hardened to strict object codecs')
  }
  return hardened
}

function stripSourcesContent(sourceMap) {
  const parsed = JSON.parse(sourceMap)
  delete parsed.sourcesContent
  return JSON.stringify(parsed)
}
