import { defineConfig, type UserConfig } from 'tsdown'

const PACKAGE_ID = 'work-charter-dsh'
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
] as const

function hostConfig(): UserConfig {
  return {
    name: PACKAGE_ID,
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  }
}

function clientConfig(): UserConfig {
  return {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'lib/types/client/index.js' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...CLIENT_EXTERNALS],
    noExternal: (id: string) => CLIENT_EXTERNALS.includes(id as typeof CLIENT_EXTERNALS[number]) ? undefined : true,
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapExcludeSources: true,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }
}

export default defineConfig(({ env }) => {
  const rawEnv: unknown = env
  const face = typeof rawEnv === 'object' && rawEnv !== null
    ? (rawEnv as Record<string, unknown>).DSH_BUILD_FACE
    : undefined
  if (face === 'host') return hostConfig()
  if (face === 'client') return clientConfig()
  throw new Error(`DSH_BUILD_FACE must be host or client, received ${String(face)}`)
})
