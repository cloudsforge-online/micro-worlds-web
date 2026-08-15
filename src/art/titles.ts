/**
 * The cover a registered title is shown by on the platform page.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THESE ARE DERIVATIVES, AND THE ENTRY SAYS SO
 *
 * `src/art/heraldry.ts` beside this file is a byte-identical copy of sixteen files from
 * `micro-aetherholm-assets`, and a test proves it. These three are NOT that. The source is each
 * game's own key art — between 800 kB and 2 MB of PNG apiece — and a register that lists every
 * game on the platform would carry several megabytes of pictures before it said a word. So each
 * one is re-encoded down to a 900px JPEG, which is 65–100 kB, and the derivation is recorded here
 * rather than being a thing somebody did once on a laptop.
 *
 * The re-encode DROPS the C2PA chunk and the invisible watermark — every source set says in its
 * own manifest that a derivative loses them. That is why `sourceSha256` is here: the provenance
 * of these three files is the provenance of the file they came from, and this is the only thread
 * back to it. `public/art/titles/MANIFEST.json` carries the same facts beside the pictures, so
 * the disclosure travels with the images the way it does for the heraldry set.
 *
 * ── WHY IT IS NOT GENERATED ───────────────────────────────────────────────────────────────────
 *
 * There is no `tools/sync-titles.mjs` because there is nothing to sync FROM: no source set
 * publishes a platform cover, and picking `title/og` as the one to use is this repository's
 * editorial choice about its own register, not a fact any set knows. `test/titles.test.ts`
 * keeps the choice honest — every path exists, every source still exists and still has the
 * checksum recorded here, and nothing is served that nothing names.
 *
 * ── THIS IS THE COVER, NOT THE GAME'S ART ─────────────────────────────────────────────────────
 *
 * One picture per title, for the register. The pictures *Ninety Days After* is PLAYED with — six
 * terrains, six resources, the sign over the world list — are a different set with a different
 * contract, and they are catalogued in `src/art/nda.ts`: copied byte for byte rather than
 * re-encoded, because that game's own repository already derives exactly what a browser should be
 * sent.
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
  /**
   * How this one was derived, when the shared recipe was not enough.
   *
   * Two of the three sources are 1200x630 key art and a resize is the whole derivation, which is
   * what `TITLE_ART_DERIVATION` describes. The third is 1024x1024 — the only picture that game
   * has of a survivor in front of a homestead — and a square cannot be resized into a register
   * card. It is cropped first, and the crop is a decision about WHICH 1024x538 of it, so it is
   * recorded here rather than being a thing somebody did once on a laptop.
   */
  readonly derivation?: string
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
  {
    slug: 'ninety-days-after',
    path: '/art/titles/ninety-days-after.jpg',
    size: '900x473',
    // NOT an `-assets` repository. *Ninety Days After* keeps its art inside the game repository,
    // in `apps/game/art/`, and the estate's other two games keep theirs in a set of their own; the
    // catalogue records where a picture IS rather than where a convention says it should be.
    sourceRepo: 'ninety-days-after',
    sourceFile: 'apps/game/art/avatar-homestead.png',
    sourceSha256: '1d64955aed55db500b630a2cf907dbf310269b9683b5af4f57d9a28cf5aef70f',
    // The dusk in the master, read off the sky behind the homestead. Art direction, never a token.
    accent: '#c8863a',
    // The crop is the decision: 1024x538 taken 150px down, which keeps the survivor's face and the
    // whole silhouette of the stockade. A centred crop cuts the top of her head.
    derivation:
      'sips -c 538 1024 --cropOffset 150 0, then -Z 900 -s format jpeg -s formatOptions 62',
  },
]

/** The cover for a registered slug, or null when that game has none drawn yet. */
export function titleArt(slug: string): TitleArt | null {
  return TITLE_ART.find((entry) => entry.slug === slug) ?? null
}
