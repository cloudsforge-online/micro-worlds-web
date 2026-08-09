/**
 * Copy the sixteen heraldry pieces out of `micro-aetherholm-assets`, and write the catalogue.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY SIXTEEN FILES OF ANOTHER TITLE'S ART LIVE IN THE PLATFORM'S CLIENT.
 *
 * They are not Aetherholm's. They were generated FOR `worlds/src/heraldry.ts`, which mints one
 * URN per rank on a sealed season — `cf:aetherholm:heraldry:<seasonId>:rank:<n>` — and whose
 * header says the artwork is "decided by the asset pipeline later". The set's README §5 is that
 * decision. They live in the Aetherholm asset repository because that is the run that produced
 * them and where the provenance is; the consumer is this bundle, because heraldry is
 * `titleScope: '*'` — cross-title cosmetics on the shared player profile, which is a platform
 * screen and not a game screen.
 *
 * `micro-aetherholm-web` names all sixteen in its own `UNSHIPPED` table with the reason: "worlds'
 * rank banner components; no rank exists in this client". This tool is the other half of that
 * sentence.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * TWO OUTPUTS, AND THE SECOND ONE IS NOT OPTIONAL.
 *
 *   1. `src/art/heraldry.ts` — set, slug, name, path, size, accent. About 3 kB. The FLUX prompt
 *      of every image is roughly 2.5 kB on its own and belongs nowhere near the bundle.
 *   2. `public/art/heraldry/MANIFEST.json` — the sixteen manifest entries VERBATIM, plus the AI
 *      disclosure and the licence, served beside the pictures. The art is AI-generated; the
 *      disclosure travels with it rather than being summarised by the code that displays it, and
 *      a README is not a place a person looking at a picture will find it. This is
 *      `micro-aetherholm-web`'s arrangement, which serves its whole 480 kB manifest at
 *      `/art/MANIFEST.json` for the same reason.
 *
 * The PNGs themselves are copied too, and `test/heraldry.test.ts` compares them byte for byte
 * against the set — "copied once" is not a property that stays true.
 *
 *   node tools/sync-heraldry.mjs            copy and regenerate
 *   node tools/sync-heraldry.mjs --check    exit 1 if the committed files are stale
 *
 * A run needs `micro-aetherholm-assets` checked out beside this repository. `--check` needs it
 * too; without it the tool says so and exits 0, because a developer who has cloned one repository
 * must still be able to run the suite. CI checks it out and the suite's own assertion goes from
 * UNCHECKED to measured there.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const SET_ROOT = new URL('../aetherholm-assets/', root)
const OUT_CATALOGUE = new URL('src/art/heraldry.ts', root)
const OUT_DIR = new URL('public/art/heraldry/', root)

/** The one set in the Aetherholm manifest this bundle takes, named once. */
export const HERALDRY_SET = 'heraldry'

/**
 * The sixteen. Not a hand-written list: the manifest is the set's own record of what it produced,
 * so a seventeenth piece appears here by being generated rather than by being remembered.
 */
export function heraldryAssets(manifest) {
  return manifest.assets
    .filter((a) => a.set === HERALDRY_SET)
    .sort((a, b) => String(a.path).localeCompare(String(b.path)))
}

/** Fields kept per asset. Everything else — prompt, attempts, checksum, cost — stays in the served manifest. */
export function entryFrom(asset) {
  return {
    set: asset.set,
    slug: asset.slug,
    name: asset.name,
    // Served from /art/heraldry/, so the manifest's repo-relative "assets/heraldry/" prefix is
    // swapped for the public one. Doing it here rather than at every call site means one place
    // can be wrong.
    path: `/art/heraldry/${String(asset.path).split('/').pop()}`,
    size: asset.deliveredSize ?? asset.declaredSize,
    accent: asset.accent ?? null,
  }
}

export function catalogueFrom(manifest) {
  return heraldryAssets(manifest).map(entryFrom)
}

export function render(manifest) {
  const entries = catalogueFrom(manifest)
  const lines = entries.map((e) => `  ${JSON.stringify(e)},`).join('\n')
  return `/**
 * The sixteen pieces a sealed season's rank banner is composed from. GENERATED — do not edit.
 *
 * Written by \`tools/sync-heraldry.mjs\` from \`micro-aetherholm-assets/MANIFEST.json\`. Run
 * \`pnpm sync-heraldry\` after a new asset set lands beside this repository;
 * \`test/heraldry.test.ts\` fails if this file and the set disagree.
 *
 * Four fields, eight charges and four rank crests. A banner is field + charge + crest — the crest
 * carries the rank, and \`src/lib/heraldry.ts\` is the only thing that composes them.
 *
 * The provenance is deliberately NOT copied here: the FLUX prompt, the model, the checksum, the
 * C2PA state, the licence and the AI disclosure are served whole beside the pictures at
 * \`/art/heraldry/MANIFEST.json\`, so the disclosure travels with the images rather than with the
 * code that displays them.
 *
 * Generator: ${manifest.generator}
 * Provider: ${manifest.providerLabel}
 * Updated: ${manifest.updatedAt}
 */

export interface HeraldryEntry {
  /** Always \`heraldry\`. Kept so the shape matches the estate's other art catalogues. */
  readonly set: string
  /** \`field-<name>\`, \`charge-<name>\` or \`crest-rank<n>\`. */
  readonly slug: string
  readonly name: string
  /** Absolute, browser-resolvable, served by nginx from \`/art/heraldry/\`. */
  readonly path: string
  /** \`<w>x<h>\` as delivered. */
  readonly size: string
  /** The hue the picture was PAINTED around, from the manifest. Art direction, never a UI palette. */
  readonly accent: string | null
}

export const HERALDRY: readonly HeraldryEntry[] = [
${lines}
]
`
}

/** The manifest served beside the pictures: the sixteen entries verbatim, and the disclosure. */
export function servedManifest(manifest) {
  const assets = heraldryAssets(manifest)
  return {
    $comment:
      'The provenance of the sixteen heraldry pieces micro-worlds-web serves, copied VERBATIM from ' +
      'micro-aetherholm-assets/MANIFEST.json by tools/sync-heraldry.mjs. Entries are unaltered, ' +
      'including their repository-relative `path` — a provenance record that has been rewritten is ' +
      'not one. This bundle serves each file at /art/heraldry/<basename>.',
    source: 'micro-aetherholm-assets',
    generator: manifest.generator,
    provider: manifest.provider,
    providerLabel: manifest.providerLabel,
    endpoint: manifest.endpoint,
    disclosure: manifest.disclosure,
    licence: manifest.licence,
    assetCount: assets.length,
    updatedAt: manifest.updatedAt,
    assets,
  }
}

export function renderServedManifest(manifest) {
  return `${JSON.stringify(servedManifest(manifest), null, 2)}\n`
}

/* ---- the run ---------------------------------------------------------- */

const setManifest = fileURLToPath(new URL('MANIFEST.json', SET_ROOT))
if (!existsSync(setManifest)) {
  console.log('micro-aetherholm-assets is not checked out beside this repository; nothing to sync')
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(setManifest, 'utf8'))
const catalogue = render(manifest)
const served = renderServedManifest(manifest)
const check = process.argv.includes('--check')

const stale = []
const read = (url) => (existsSync(fileURLToPath(url)) ? readFileSync(fileURLToPath(url), 'utf8') : null)

if (check) {
  if (read(OUT_CATALOGUE) !== catalogue) stale.push('src/art/heraldry.ts')
  if (read(new URL('MANIFEST.json', OUT_DIR)) !== served) stale.push('public/art/heraldry/MANIFEST.json')
  for (const asset of heraldryAssets(manifest)) {
    const name = String(asset.path).split('/').pop()
    const here = new URL(name, OUT_DIR)
    if (!existsSync(fileURLToPath(here))) stale.push(`public/art/heraldry/${name}`)
  }
  if (stale.length > 0) {
    console.error(`stale — run \`pnpm sync-heraldry\`:\n  ${stale.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`ok: the heraldry catalogue matches the asset set — ${catalogueFrom(manifest).length} pieces`)
} else {
  mkdirSync(fileURLToPath(OUT_DIR), { recursive: true })
  mkdirSync(fileURLToPath(new URL('src/art/', root)), { recursive: true })
  const wanted = new Set()
  for (const asset of heraldryAssets(manifest)) {
    const name = String(asset.path).split('/').pop()
    wanted.add(name)
    copyFileSync(fileURLToPath(new URL(asset.path, SET_ROOT)), fileURLToPath(new URL(name, OUT_DIR)))
  }
  // A file the set no longer holds is dead weight in the image and — worse — indistinguishable
  // from one that works. It goes out with the same run that brings the others in.
  for (const name of readdirSync(fileURLToPath(OUT_DIR))) {
    if (name !== 'MANIFEST.json' && !wanted.has(name)) {
      console.log(`stray, not in the set: public/art/heraldry/${name}`)
    }
  }
  writeFileSync(fileURLToPath(OUT_CATALOGUE), catalogue)
  writeFileSync(fileURLToPath(new URL('MANIFEST.json', OUT_DIR)), served)
  console.log(`wrote src/art/heraldry.ts and ${wanted.size} pictures into public/art/heraldry/`)
}
