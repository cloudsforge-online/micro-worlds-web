/**
 * The cover a registered title is shown by on the platform page.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THESE ARE DERIVATIVES, AND THE ENTRY SAYS SO
 *
 * `src/art/heraldry.ts` beside this file is a byte-identical copy of sixteen files from
 * `micro-aetherholm-assets`, and a test proves it. These two are NOT that. The source is each
 * game's own 1200x630 key art — 800 kB of PNG apiece — and a register that lists every game on
 * the platform would carry 1.6 MB of pictures before it said a word. So each one is re-encoded
 * down to a 900px JPEG, which is about 65 kB, and the derivation is recorded here rather than
 * being a thing somebody did once on a laptop.
 *
 * The re-encode DROPS the C2PA chunk and the invisible watermark — both asset sets say in their
 * own manifest that a derivative loses them. That is why `sourceSha256` is here: the provenance
 * of these two files is the provenance of the file they came from, and this is the only thread
 * back to it. `public/art/titles/MANIFEST.json` carries the same facts beside the pictures, so
 * the disclosure travels with the images the way it does for the heraldry set.
 *
 * ── WHY IT IS NOT GENERATED ───────────────────────────────────────────────────────────────────
 *
 * There is no `tools/sync-titles.mjs` because there is nothing to sync FROM: neither asset set
 * publishes a platform cover, and picking `title/og` as the one to use is this repository's
 * editorial choice about its own register, not a fact either set knows. `test/titles.test.ts`
 * keeps the choice honest — every path exists, every source still exists and still has the
 * checksum recorded here, and nothing is served that nothing names.
 *
 * ── IT LIVES UNDER src/art/ ON PURPOSE ────────────────────────────────────────────────────────
 *
 * `test/heraldry.test.ts` forbids spelling an `/art/` path by hand anywhere in `src` except this
 * directory. Every module that wants a cover asks `titleArt(slug)`; the strings exist once.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

export interface TitleArt {
  /** The registered title slug this cover belongs to. */
  readonly slug: string
  /** Absolute, browser-resolvable, served by nginx from `/art/titles/`. */
  readonly path: string
  /** `<w>x<h>` as re-encoded and as served. */
  readonly size: string
  /** The asset set the source came from, as it is checked out beside this repository. */
  readonly sourceRepo: string
  /** The file within that set, from its own MANIFEST.json. */
  readonly sourceFile: string
  /** The source's checksum. The only thread back to its C2PA provenance, which the re-encode lost. */
  readonly sourceSha256: string
  /** The hue the source was PAINTED around, from the set's manifest. Art direction, never a UI palette. */
  readonly accent: string
}

/** `sips -Z 900 -s format jpeg -s formatOptions 78 <source> --out <path>`, on the delivered PNG. */
export const TITLE_ART_DERIVATION = 'sips -Z 900 -s format jpeg -s formatOptions 78'

export const TITLE_ART: readonly TitleArt[] = [
  {
    slug: 'emberkin',
    path: '/art/titles/emberkin.jpg',
    size: '900x472',
    sourceRepo: 'micro-emberkin-assets',
    sourceFile: 'assets/title/og-1200x630.png',
    sourceSha256: '0838fe73eee99699d4dba2f0831b3d691176eff40ccd71451f4f58a27d84c552',
    accent: '#e8622c',
  },
  {
    slug: 'aetherholm',
    path: '/art/titles/aetherholm.jpg',
    size: '900x472',
    sourceRepo: 'micro-aetherholm-assets',
    sourceFile: 'assets/title/og-1200x630.png',
    sourceSha256: 'e936631f422c0d3b809342eba72e42afe3f1793c50f7ae824526f871da9f822c',
    accent: '#8f7ae8',
  },
]

/** The cover for a registered slug, or null when that game has none drawn yet. */
export function titleArt(slug: string): TitleArt | null {
  return TITLE_ART.find((entry) => entry.slug === slug) ?? null
}
