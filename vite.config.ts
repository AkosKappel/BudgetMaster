import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Messages in `messages/<locale>.json`; the language comes from the cookie the Settings
    // switch sets, else the browser's languages, else English. No locale prefix in URLs.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      emitTsDeclarations: true,
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      // Serves gzip and Brotli copies of the built assets (the server does not compress).
      compressPublicAssets: true,
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
