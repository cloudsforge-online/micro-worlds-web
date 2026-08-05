import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * There is deliberately no `define`, no `envPrefix` and no `.env` file in this repository.
 *
 * A build-time constant is an environment baked into an image, and an image with an environment
 * baked into it has to be rebuilt to be promoted — which means the artefact that reaches
 * production is not the artefact that passed CI. Every host this app talks to is resolved at
 * RUNTIME from `window.location.hostname` by `cloudsforgeHosts()`, so one image serves localhost,
 * staging, a preview deployment and production. `test/no-build-time-config.test.ts` fails the
 * build if `import.meta.env.VITE_` ever reappears, and the `rules` job in CI greps for it again
 * so deleting the test does not delete the rule.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @cloudsforge/ui is a `link:` dependency, so its own node_modules holds a second copy of
    // React. Two copies means two dispatchers, and the shared bar would throw on its first
    // useState.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // The linked package now ships BUILT output — its entry points name a committed `dist` — so
    // the old reason for this line ("shipped as TypeScript source until it is published") is no
    // longer why it is here. The setting is still right, for the reason that outlives it: `link:`
    // resolves to a working tree edited beside this one, and pre-bundling copies it into
    // node_modules/.vite, where it stays until the dep hash changes. A rebuild in micro-ui does
    // not change this repository's lockfile, so `pnpm dev` would keep serving yesterday's `dist`.
    exclude: ['@cloudsforge/ui'],
  },
  build: {
    // Named chunks and a real manifest of hashes: the assets are immutable-cached by nginx, and
    // that is only safe when every rebuild produces a new filename.
    sourcemap: true,
  },
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // 3001 IS THE REGISTRY'S OWN NUMBER FOR THIS BUNDLE, AND IT IS NOT THE API'S PORT.
  //
  // `ui/packages/ui/src/surfaces.ts:245` gives the `worlds` surface devPort **3001**, and that is
  // where this app is SERVED. It is used here rather than invented, because the surface registry
  // is the estate's one list of where things live and a second number in this file would be a
  // second, unversioned copy of it.
  //
  // The API is a DIFFERENT surface: `api`, devPort **4020**, and `micro-worlds` binds **4000**
  // (`worlds/src/env.ts:171` defaults `PORT` to 4000, `worlds/.env.example:38` sets it to 4000).
  // So under `pnpm dev` this bundle resolves `http://localhost:4020` and a `worlds` started from
  // its own example environment is not there. That is NOT papered over with a literal host in
  // src/lib/hosts.ts — a hard-coded host is a second copy of the registry and the copy is the one
  // that goes stale. Run worlds with `PORT=4020`; the README says so in one line.
  //
  // This used to read `worlds-api`, devPort 4002. That row is DELETED — the hostname was folded
  // into `api.` and never had a DNS record — so the number here changed with it. See the long note
  // at the top of src/lib/hosts.ts.
  // ════════════════════════════════════════════════════════════════════════════════════════════
  server: { port: 3001 },
  preview: { port: 3001 },
})
