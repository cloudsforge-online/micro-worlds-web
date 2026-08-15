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
 * `surface: null` says this game has no web client of its own in the estate. A "Play" button that
 * opened a 404 would be worse than the sentence beside it, so a card with neither `surface` nor
 * `play` offers no button at all and `platform.tsx` says which of the two reasons it is.
 *
 * ── A GAME CAN ALSO BE SERVED BY *THIS* BUNDLE, WHICH IS WHAT `play` IS FOR ────────────────────
 *
 * *Ninety Days After* was the `surface: null` case, and the entry used to say so: `micro-nda`
 * served the whole game — worlds, tiles, homesteads, the day-resolution engine, communes,
 * reports — and nothing rendered it. **That is no longer true.** `src/pages/play.tsx` and
 * `src/pages/world.tsx` render it, out of this bundle, against `micro-nda` through the public API
 * host. So the game has a client without having a SURFACE, and those are different facts: a
 * surface is a host in the estate's registry, and nda's client is two routes on the surface you
 * are already reading.
 *
 * `surface` could not express that. It is a `SurfaceKey`, resolved by `viewedSurfaceUrl` into an
 * absolute address on another host, and there is no key for "here". Hence a second, narrower
 * field: an in-app path, followed with `<Link>`, which needs no network resolution because a
 * reader looking at testnet is already reading testnet's copy of this bundle.
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
   * A route on THIS surface that plays this game, or null when nothing here does.
   *
   * A PATH, not a key and not a URL. It is followed with `<Link>`, so it stays inside the running
   * bundle: no reload, no host to compose, and no way for it to land a testnet reader back on
   * mainnet — the copy of this app they are reading is already the right one.
   *
   * `surface` and `play` are not two spellings of the same fact and a card may set either. A
   * surface says the estate has a whole host serving the game; `play` says these routes do. Only
   * *Ninety Days After* uses it today, and `src/lib/routes.ts` is the register that decides whether
   * the path resolves — `test/routes.test.ts` fails if this points at an address the app, the
   * router and nginx do not all agree exists.
   */
  readonly play: string | null
  /**
   * The cover, joined from `src/art/titles.ts`, or null when the game has none drawn yet.
   *
   * Not written here. Every `/art/` path in this repository is spelled once, in the catalogue
   * under `src/art/`, with the asset set and checksum it was derived from beside it; a card that
   * repeated the string would fork that contract the first time the art was re-encoded.
   */
  readonly art: string | null
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
    play: null,
  },
  aetherholm: {
    kind: 'Sky-island strategy',
    blurb:
      'Hold islands above the cloud, build them up and sail between them. The wind has a direction ' +
      'and it decides who your neighbours really are. Seasons run on a seed, so every one of them ' +
      'is a different map.',
    surface: 'aetherholm',
    play: null,
  },
  'ninety-days-after': {
    kind: 'Survival strategy',
    blurb:
      'Ninety days after everything stopped. Hold a homestead, work the land around it and queue ' +
      'what your people will attempt tomorrow — then the day resolves for everyone at once and you ' +
      'read what it cost. Survivors band into communes or they do not last.',
    // No surface: `micro-nda` is a service, not a host anybody visits. The client is `/play` here.
    surface: null,
    play: '/play',
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
