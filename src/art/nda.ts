/**
 * The pictures *Ninety Days After* is played WITH: six terrains, six resources, an emblem and a
 * wordmark.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A THIRD CATALOGUE AND NOT AN EXTENSION OF EITHER OTHER ONE
 *
 * `src/art/heraldry.ts` is a banner kit — sixteen interchangeable parts, one per name, generated
 * from a manifest. `src/art/titles.ts` is one COVER per registered game, shown to somebody who has
 * not started playing. Neither is this. These fourteen files are the game's own vocabulary: a
 * forest tile means *forest* to the rules engine as much as to the eye, and the six resource icons
 * name the six columns of every homestead's stock.
 *
 * ── THEY ARE COPIES, NOT RE-ENCODES, AND THAT IS THE STRONGER CLAIM ───────────────────────────
 *
 * The masters are 1024² PNGs of 2–3 MB each in `ninety-days-after/apps/game/art/`, and that repo's
 * own `art/build.mjs` already derives exactly what a browser should be sent: 160² tiles, 96² icons,
 * an alpha-keyed wordmark, all WebP. Re-deriving them here would produce a second set of pixels
 * with the same provenance and no way to tell which was current, so this repository takes the
 * DERIVED files byte for byte and `test/nda-art.test.ts` proves the bytes still match. That is the
 * `heraldry.ts` contract — byte-identity to a set held elsewhere — rather than the `titles.ts` one.
 *
 * The C2PA chunk and the invisible watermark were lost upstream, in that build, not here. The
 * manifest served beside the files says so, and records the MASTER each derived file came from,
 * because a checksum of a derivative is only a thread back to the original if somebody wrote the
 * original down.
 *
 * ── THE PATHS ARE SPELLED ONCE, HERE ──────────────────────────────────────────────────────────
 *
 * `test/heraldry.test.ts` forbids an `/art/` path anywhere in `src` outside this directory — a
 * hand-written one keeps working until the set is regenerated at another size, and then it 404s
 * with nothing to point at. `src/styles.css` is checked by that same rule, which is why the map's
 * six tile images are handed to the stylesheet as custom properties by `src/pages/world.tsx`
 * instead of being written into a `url()` there.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type { ResourceKey, Terrain } from '../lib/nda.ts'

export interface NdaArt {
  /** What this picture IS, in the game's own vocabulary. Unique across the set. */
  readonly key: string
  /** Absolute, browser-resolvable, served by nginx from `/art/nda/`. */
  readonly path: string
  /** `<w>x<h>` as copied and as served. */
  readonly size: string
  /** The file this was copied from, within the source repository, byte for byte. */
  readonly sourceFile: string
  /** That file's checksum. Byte-identity is asserted against it, not merely recorded. */
  readonly sha256: string
  /** The 1024² master the source repository derived it from, for the thread back to provenance. */
  readonly masterFile: string
}

/** The repository these were copied from, as it is checked out beside this one. */
export const NDA_ART_SET = 'ninety-days-after'

/** Where in that repository the derived files live. Every `sourceFile` is under it. */
export const NDA_ART_DIR = 'apps/game/public/assets'

/**
 * What produced the derived files — run THERE, not here, and quoted so the manifest can say it.
 * `art/build.mjs` in the source repository; `sips` for the resize, `cwebp` for the encode.
 */
export const NDA_ART_DERIVATION = 'ninety-days-after: node art/build.mjs (sips resize, cwebp encode)'

export const NDA_ART: readonly NdaArt[] = [
  /* ── The six terrains. `TERRAINS` in nda/src/rules.ts, one picture each, no gaps. ─────────── */
  {
    key: 'terrain:wilderness',
    path: '/art/nda/tile-wilderness.webp',
    size: '160x160',
    sourceFile: 'tile-wilderness.webp',
    sha256: '080c1739e711b4a3b72937b5a23845fce93c8643e8d84ed5a247c9a2bb5fbdfa',
    masterFile: 'apps/game/art/tile-wilderness.png',
  },
  {
    key: 'terrain:forest',
    path: '/art/nda/tile-forest.webp',
    size: '160x160',
    sourceFile: 'tile-forest.webp',
    sha256: 'a392bdbe1da3b1d44e1f53a8ba0d13898ca9928dc111d8c747c4b0d8b2928d55',
    masterFile: 'apps/game/art/tile-forest.png',
  },
  {
    key: 'terrain:ruins',
    path: '/art/nda/tile-ruins.webp',
    size: '160x160',
    sourceFile: 'tile-ruins.webp',
    sha256: '41f0295a2d00871edd3c8d98d5cabf1ac4b517100638177e639631e35c0f8adf',
    masterFile: 'apps/game/art/tile-ruins.png',
  },
  {
    key: 'terrain:water',
    path: '/art/nda/tile-water.webp',
    size: '160x160',
    sourceFile: 'tile-water.webp',
    sha256: 'bb5b40a8f1f9acf65cfac18b9a5dc456de3a1acacbb54e0218c95ac335214ba0',
    masterFile: 'apps/game/art/tile-water.png',
  },
  {
    key: 'terrain:road',
    path: '/art/nda/tile-road.webp',
    size: '160x160',
    sourceFile: 'tile-road.webp',
    sha256: '62400c12a14da225cb08196a22b3a2ac5c6f1844a83d9fee3a0241b6964f87fd',
    masterFile: 'apps/game/art/tile-road.png',
  },
  {
    key: 'terrain:homestead',
    path: '/art/nda/tile-homestead.webp',
    size: '160x160',
    sourceFile: 'tile-homestead.webp',
    sha256: '7aab83c452b09fc7104735aba29d24dfa95cd44ab7d0ef2a5a5147e30fb845af',
    masterFile: 'apps/game/art/tile-homestead.png',
  },

  /* ── The six resources. `RESOURCE_KEYS` in nda/src/rules.ts. The upstream files are `icon-*`; ─
       they are served as `resource-*` here because this repository already serves an icon set
       under `/icons/` that means something else entirely. ────────────────────────────────────── */
  {
    key: 'resource:food',
    path: '/art/nda/resource-food.webp',
    size: '96x96',
    sourceFile: 'icon-food.webp',
    sha256: 'd50b4bf7d65cf9f80b6e09a3b1cf2b042513192848310ca856d426b0fad32bf3',
    masterFile: 'apps/game/art/icon-food.png',
  },
  {
    key: 'resource:water',
    path: '/art/nda/resource-water.webp',
    size: '96x96',
    sourceFile: 'icon-water.webp',
    sha256: 'ccb46326a60f5d402d71395092ef5ff85482f1029a18ebe99b7134ffcb0563de',
    masterFile: 'apps/game/art/icon-water.png',
  },
  {
    key: 'resource:materials',
    path: '/art/nda/resource-materials.webp',
    size: '96x96',
    sourceFile: 'icon-materials.webp',
    sha256: '23a892d4dd1779d9f8fa673a005e5f7546e63b5099ebddcacdcfd7d1b002eca7',
    masterFile: 'apps/game/art/icon-materials.png',
  },
  {
    key: 'resource:fuel',
    path: '/art/nda/resource-fuel.webp',
    size: '96x96',
    sourceFile: 'icon-fuel.webp',
    sha256: 'accf256581030962e32ecdf515532c1fbf442637f9bc70ece049ae10e4564561',
    masterFile: 'apps/game/art/icon-fuel.png',
  },
  {
    key: 'resource:medicine',
    path: '/art/nda/resource-medicine.webp',
    size: '96x96',
    sourceFile: 'icon-medicine.webp',
    sha256: 'b1e12714d1284b044f452d24ec53cd832b088c54e8d8476a12329e14ef0825e1',
    masterFile: 'apps/game/art/icon-medicine.png',
  },
  {
    key: 'resource:seeds',
    path: '/art/nda/resource-seeds.webp',
    size: '96x96',
    sourceFile: 'icon-seeds.webp',
    sha256: '3e042a9d6cfc333f99ade9cd895dc892d3faf23d4f1bde23cabcf41626dfdc9d',
    masterFile: 'apps/game/art/icon-seeds.png',
  },

  /* ── The two marks. The wordmark is the game's own sign; the emblem is the roundel on it. ─── */
  {
    key: 'emblem',
    path: '/art/nda/emblem.webp',
    size: '256x256',
    sourceFile: 'logo.webp',
    sha256: 'a65b6d17d9fcdf416c5cd2c72831bb5ddbdd450b83daef9bebd73969dcba3f15',
    masterFile: 'apps/game/art/logo.png',
  },
  {
    key: 'wordmark',
    path: '/art/nda/wordmark.webp',
    size: '768x209',
    sourceFile: 'wordmark.webp',
    sha256: 'bf0f0df4dca1ea1eb1876da89b9b0f6c374cc01cb0df4c2aab3efa1d1bfdf320',
    masterFile: 'apps/game/art/wordmark.png',
  },
]

/** Every path, by key, resolved once. A miss is a programming error, not a runtime state. */
const BY_KEY: ReadonlyMap<string, string> = new Map(NDA_ART.map((e) => [e.key, e.path]))

/**
 * The picture for a terrain.
 *
 * Total over `Terrain`, and the type is what makes it so: adding a seventh terrain to
 * `src/lib/nda.ts` without adding a picture here is a compile error rather than a hole in the map.
 */
export function terrainArt(terrain: Terrain): string {
  return BY_KEY.get(`terrain:${terrain}`) as string
}

/** The picture for one of the six resources. Total over `ResourceKey`, for the same reason. */
export function resourceArt(resource: ResourceKey): string {
  return BY_KEY.get(`resource:${resource}`) as string
}

/** The game's sign, alpha-keyed. Used once, at the top of the world list. */
export const NDA_WORDMARK = BY_KEY.get('wordmark') as string

/** The roundel from the sign, on its own. Small enough to sit beside a heading. */
export const NDA_EMBLEM = BY_KEY.get('emblem') as string
