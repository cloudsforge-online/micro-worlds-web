/**
 * What a registered title LOOKS like to somebody deciding whether to play it, and where they go.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS SEPARATELY FROM THE REGISTER
 *
 * `GET /v1/titles` answers with what the PLATFORM needs to know about a game: its slug, its
 * status, the capabilities it has declared, the asset scopes it owns. Not one of those fields is
 * an answer to "what is this game, and how do I play it" — the register has no room for a
 * sentence, a picture or an address a person can open, and it should not grow one. Where a title
 * SERVES ITS PLAYERS is a fact about the estate's surfaces, and the estate already has one
 * register of those: `surface()` in `@cloudsforge/ui`.
 *
 * So this module joins the two by slug, and it is the only place a game is described in words.
 *
 * ── A SLUG WITH NO ENTRY HERE STILL RENDERS ───────────────────────────────────────────────────
 *
 * `cardFor` answers null for an unknown slug and the register row falls back to what the service
 * said — name, status, capabilities. That direction matters: the register is the authority on
 * WHICH games exist, and a fourth title registered by an administrator must appear on this page
 * the moment it is registered, not the moment somebody remembers to edit this file. What it will
 * be missing is the blurb and the way in, which is a smaller failure than being invisible.
 *
 * ── AND A CARD WITH NO SURFACE IS NOT A BROKEN LINK ───────────────────────────────────────────
 *
 * `surface: null` says this game has no web client in the estate. *Ninety Days After* is that
 * today: `micro-nda` serves the whole game — worlds, tiles, homesteads, the day-resolution engine,
 * communes, reports — and nothing renders it. The entry says so in those words and offers what it
 * does have. A "Play" button that opened a 404 would be worse than the sentence.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type { SurfaceKey } from '@cloudsforge/ui'
import { titleArt } from '../art/titles.ts'

export interface TitleCard {
  /** The kind of game, in three or four words — the first thing a visitor wants. */
  readonly kind: string
  /** What it is, in a sentence a player can act on. Never a feature list. */
  readonly blurb: string
  /**
   * The surface that serves this game's client, or null when nothing does.
   *
   * A KEY, not a URL. The address is composed by `viewedSurfaceUrl` so the link follows the
   * network the reader is viewing — a reader looking at testnet who opens a game gets the testnet
   * estate's copy of it, and a hard-coded address would silently take them back to mainnet.
   */
  readonly surface: SurfaceKey | null
  /**
   * The cover, joined from `src/art/titles.ts`, or null when the game has none drawn yet.
   *
   * Not written here. Every `/art/` path in this repository is spelled once, in the catalogue
   * under `src/art/`, with the asset set and checksum it was derived from beside it; a card that
   * repeated the string would fork that contract the first time the art was re-encoded.
   */
  readonly art: string | null
  /**
   * The alternative to art: a device drawn from the game's own premise.
   *
   * Only `ninety-days` today — ninety cells, one per day, because the game resolves exactly one
   * day at a time and ends after ninety of them. It is the game's rules, not a decoration standing
   * in for a picture, which is why it is named for what it means rather than for what it looks
   * like.
   */
  readonly motif: 'ninety-days' | null
}

/** A card as it is WRITTEN. The cover is joined on by slug, so it is absent here. */
type CardCopy = Omit<TitleCard, 'art'>

const CARDS: Readonly<Record<string, CardCopy>> = {
  emberkin: {
    kind: 'Monster-collecting RPG',
    blurb:
      'Find kin, bond with them and fight alongside them. A bond deepens with use and changes what ' +
      'the pair can do together, so the team you end with is one you made rather than one you ' +
      'picked.',
    surface: 'emberkin',
    motif: null,
  },
  aetherholm: {
    kind: 'Sky-island strategy',
    blurb:
      'Hold islands above the cloud, build them up and sail between them. The wind has a direction ' +
      'and it decides who your neighbours really are. Seasons run on a seed, so every one of them ' +
      'is a different map.',
    surface: 'aetherholm',
    motif: null,
  },
  'ninety-days-after': {
    kind: 'Survival strategy',
    blurb:
      'Ninety days after everything stopped. Hold a homestead, work the land around it and queue ' +
      'what your people will attempt tomorrow — then the day resolves for everyone at once and you ' +
      'read what it cost. Survivors band into communes or they do not last.',
    surface: null,
    motif: 'ninety-days',
  },
}

/** The card for a registered slug, or null when this page has nothing to add to the register. */
export function cardFor(slug: string): TitleCard | null {
  const copy = Object.prototype.hasOwnProperty.call(CARDS, slug) ? (CARDS[slug] ?? null) : null
  if (copy === null) return null
  return { ...copy, art: titleArt(slug)?.path ?? null }
}

/** Every slug this page can describe. Exported for the test that keeps it honest. */
export const DESCRIBED_SLUGS: readonly string[] = Object.freeze(Object.keys(CARDS))
