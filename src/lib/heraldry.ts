/**
 * Turning a sealed season's rank URN into the three pictures that make a banner.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE URN IS AN IDENTITY, NOT A FILE PATH — AND THIS FILE IS THE THING THAT KNEW THAT AND WAS
 * NEVER WRITTEN.
 *
 * `worlds/src/heraldry.ts` mints one item per victor member when Aetherholm seals a season:
 *
 *     itemUrn: `cf:aetherholm:heraldry:${input.seasonId}:rank:${rank}`
 *
 * bound, `titleScope: '*'`, source `reward`. Its header says why the urn carries the rank: "so
 * first place and fifth place are different artwork, decided by the asset pipeline later — the urn
 * is an identity, not a file path." The pipeline made that decision — sixteen FLUX 2 Pro pieces in
 * `micro-aetherholm-assets/assets/heraldry/`, README §5 — and nothing read it. A player holding a
 * rank-1 banner was shown `cf:aetherholm:heraldry:0d6a…rank:1` (micro-org#185, measured
 * 2026-08-10).
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── ONE LAYER IS DATA AND TWO ARE ART DIRECTION, AND THEY MUST NOT BE CONFLATED ───────────────
 *
 * A banner is **field + charge + crest**. The urn carries a season id and a rank and nothing else:
 *
 *   * **the crest is DATA.** The rank is on the urn, the service put it there, and the four crests
 *     step down through metal, silhouette complexity and coverage together so the tiers survive
 *     monochrome (README §5). Rank 1 gold closed laurel, rank 2 blued silver open wreath, rank 3
 *     bronze circlet, rank 4 and below the iron pennon bar.
 *   * **the field and the charge are ILLUSTRATION.** The set's README calls them "rank-neutral"
 *     and says they "combine freely" — no season carries a field on any wire in this estate. They
 *     are picked from the season's own id so that a banner is stable: the same season shows the
 *     same picture on every visit and to every player, which is the only property a decoration
 *     needs, and members of one alliance placed second and fourth can see they were in the same
 *     season.
 *
 * The caller LABELS the second half as art direction — `src/pages/inventory.tsx` says so in the
 * row, and `test/heraldry.test.ts` asserts that sentence rather than trusting it. This is exactly
 * the line `micro-aetherholm-web/src/lib/art.ts` draws around island biomes: the band is data, the
 * biome is illustration, and the map says which is which. If the caption is ever dropped, drop the
 * field and the charge with it and let the crest stand alone.
 *
 * ── `null`, NEVER A PLACEHOLDER ────────────────────────────────────────────────────────────────
 *
 * Every lookup here answers `null` when there is no picture, and the inventory row then renders
 * exactly as it did before this file existed. A generic "no image" file RENDERS AS ART: the page
 * looks finished, the gap is invisible, and nobody reports it. The rule and its reasoning are
 * `micro-emberkin-web/src/lib/art.ts`'s, inherited twice now.
 */
import { HERALDRY, type HeraldryEntry } from '../art/heraldry.ts'
import { publicPath } from './routes.ts'

/** Indexed once at module load. Sixteen entries, scanned per inventory row, is silly. */
const bySlug = new Map<string, HeraldryEntry>()
for (const entry of HERALDRY) {
  if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, entry)
}

/**
 * The four fields and the eight charges, in the order the set holds them.
 *
 * Derived from the catalogue rather than written out, so a ninth charge arrives by being generated
 * into the asset set rather than by being remembered here. Sorted for determinism: `HERALDRY` is
 * already sorted by path, and a banner that changed because an entry moved in a generated file
 * would be a picture that depends on the order of a build step.
 */
function slugsBeginning(prefix: string): readonly string[] {
  return HERALDRY.map((e) => e.slug)
    .filter((s) => s.startsWith(prefix))
    .sort()
}

export const FIELDS: readonly string[] = slugsBeginning('field-')
export const CHARGES: readonly string[] = slugsBeginning('charge-')

/** How many rank crests the set draws. Rank `CREST_TIERS` and below all share the last one. */
export const CREST_TIERS = slugsBeginning('crest-rank').length

/**
 * `cf:aetherholm:heraldry:<seasonId>:rank:<n>`, and nothing that merely looks like it.
 *
 * EVERY OTHER URN IN AN INVENTORY REACHES THIS FUNCTION. A cosmetic, an achievement, a crafted
 * item, a private world — the row calls it for all of them and takes `null` for an answer. A loose
 * match would hang a rank-1 laurel on something that is not a season reward at all, which is the
 * failure this estate keeps recording as worse than a missing picture: a confident lie nobody
 * reports.
 *
 * The season id is required to be a uuid because that is what is on the wire —
 * `aetherholm/src/sealing.ts` puts `season.id` on the sealed payload and `worlds` interpolates it
 * verbatim. The rank must be a positive whole number: `grantHeraldry` computes `rank = index + 1`
 * over the victor list, so there is no rank zero and no fractional rank, and a urn carrying one
 * did not come from the service.
 */
const HERALDRY_URN =
  /^cf:aetherholm:heraldry:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):rank:([0-9]{1,4})$/

export interface HeraldryUrn {
  readonly seasonId: string
  readonly rank: number
}

export function parseHeraldryUrn(urn: string | null | undefined): HeraldryUrn | null {
  if (typeof urn !== 'string') return null
  const m = HERALDRY_URN.exec(urn)
  if (m === null) return null
  const rank = Number(m[2])
  if (!Number.isInteger(rank) || rank < 1) return null
  return { seasonId: m[1] as string, rank }
}

/**
 * The crest slug for a rank, or `null` for a rank a season cannot mint.
 *
 * `grantHeraldry` walks `input.victors.entries()` and the list is UNBOUNDED — a season with forty
 * ranked victors mints rank 40. So this is a CLAMP and not a lookup: the set draws four tiers and
 * README §5's table ends at "rank 4+", which is the art's own answer to a rank with no floor.
 */
export function crestFor(rank: number): string | null {
  if (!Number.isInteger(rank) || rank < 1) return null
  return `crest-rank${Math.min(rank, CREST_TIERS)}`
}

/**
 * The picture for one named piece — a field, a charge or a crest. `null` if the set has none.
 *
 * MOUNTED here, not in `src/art/heraldry.ts`: that file is generated and re-rendered byte for byte
 * by `test/heraldry.test.ts`, and its paths are cross-referenced against the files under
 * `public/art/`. This is the boundary where a catalogue entry becomes a URL, so this is where
 * `<apex>/worlds` gets prepended. See the note on `BY_KEY` in `src/art/nda.ts`.
 */
export function heraldryPart(slug: string): string | null {
  const path = bySlug.get(slug)?.path
  return path === undefined ? null : publicPath(path)
}

/** The hue a piece was PAINTED around, from the manifest. Art direction, never a UI palette. */
export function accentFor(slug: string): string | null {
  return bySlug.get(slug)?.accent ?? null
}

/**
 * A stable, well-mixed number from a season id.
 *
 * FNV-1a, 32-bit, written out rather than pulled in: it is nine lines, it has no dependency, and
 * what is needed is only that two uuids that differ in one hex digit land on different fields. A
 * uuid's own bytes are NOT usable directly — v4 pins the version and variant nibbles, so slicing
 * fixed positions out of the string biases the choice toward a handful of values.
 *
 * It is not a hash for any security purpose and nothing here is a secret: it picks a picture.
 */
function mix(seasonId: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seasonId.length; i += 1) {
    h ^= seasonId.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export interface Banner {
  readonly seasonId: string
  readonly rank: number
  /** The field, the charge and the crest, in the order they stack. Absolute, browser-resolvable. */
  readonly field: string
  readonly charge: string
  readonly crest: string
  /** The crest's own slug, so a caller can name the tier without re-deriving it. */
  readonly crestSlug: string
  /** What the picture means, in one sentence, for the `alt` a screen reader gets. */
  readonly description: string
}

/**
 * The banner for an inventory item's urn, or `null` if the item is not sealed-season heraldry.
 *
 * ALL THREE LAYERS OR NONE. A banner missing its crest is a picture of a rank that is not there,
 * and a banner missing its field is a crest floating on the page — both read as a rendering fault
 * rather than as the honest "this bundle predates that piece of art". So a partial resolution
 * answers `null` and the row falls back to the urn it showed before, which is a state a player can
 * report.
 */
export function bannerFor(urn: string | null | undefined): Banner | null {
  const parsed = parseHeraldryUrn(urn)
  if (parsed === null) return null

  const crestSlug = crestFor(parsed.rank)
  if (crestSlug === null) return null

  // One number, two draws. The charge takes the low bits and the field the high ones, so two
  // seasons that collide on one layer do not collide on both.
  const h = mix(parsed.seasonId)
  const field = FIELDS[h % FIELDS.length]
  const charge = CHARGES[(h >>> 8) % CHARGES.length]
  if (field === undefined || charge === undefined) return null

  const fieldPath = heraldryPart(field)
  const chargePath = heraldryPart(charge)
  const crestPath = heraldryPart(crestSlug)
  if (fieldPath === null || chargePath === null || crestPath === null) return null

  return {
    seasonId: parsed.seasonId,
    rank: parsed.rank,
    field: fieldPath,
    charge: chargePath,
    crest: crestPath,
    crestSlug,
    // The rank is the only thing stated as fact. The field and the charge are not named at all
    // here, because naming them in the accessible description would put decoration and data in
    // one sentence with nothing to tell them apart.
    description: `Rank ${parsed.rank} banner from a sealed Aetherholm season`,
  }
}
