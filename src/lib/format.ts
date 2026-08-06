/**
 * Turning the platform's facts into words, without inventing any.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THREE RULES, AND THEY ARE ALL ABOUT THE SAME THING: NOT LETTING AN INTENT READ AS AN OBSERVATION.
 *
 * **1. Never colour alone.** The estate's reserved status hues sit ΔE 4.6 apart under protanopia
 * (measured in micro-ui). Every state below carries a word and a glyph; the tone is third.
 *
 * **2. `unsupported` is an ANSWER, not a fault, and it must not read as one.**
 * `worlds/src/titleclient.ts` is explicit: "A title asked for something it does not sell
 * answers 422, and the bridge records `unsupported` and stops. Retrying is guaranteed to fail
 * again." So its word is not "FAILED" and its meaning is not "try again" — it is a customer who
 * paid for something undeliverable (`worlds/src/server.ts`), which is a catalogue mistake and
 * a refund.
 *
 * **3. NOTHING PURCHASABLE MAY BE DESCRIBED AS AN ADVANTAGE.**
 * `docs/ecosystem/01-product-vision.md` principle 6: purchasable means cosmetic, convenience or
 * access — never power. `sourceMeaning` and `boundMeaning` below therefore say what an item IS and
 * where it may go, and never what it is worth or what it lets somebody do. `bound` in particular
 * is described as the control it is (`worlds/src/players.ts`) rather than as a downside of
 * a purchase, because the direction of that sentence is the whole principle: an item is bound
 * BECAUSE it would confer power, and the platform's answer is that it never enters a market.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type {
  ItemSource,
  ProvisionKind,
  ProvisionState,
  SeasonStatus,
  TitleStatus,
} from './worlds.ts'

/* ══════════════════════════════ time ══════════════════════════════ */

/**
 * An ISO timestamp from the service, as a full local date and time.
 *
 * An unparseable value is returned VERBATIM rather than replaced with "Invalid Date": if a service
 * ever puts something unexpected on the wire, a player seeing the actual string can report it, and
 * one seeing "Invalid Date" can only report that the site is broken.
 */
export function timestamp(iso: string | null): string {
  if (iso === null || iso.length === 0) return '—'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  return at.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "just now", "12 seconds ago", "3 minutes ago", "in 2 hours". Never a bare number. */
export function relative(at: Date, now: Date): string {
  const ms = at.getTime() - now.getTime()
  const abs = Math.abs(ms)
  if (abs < 5_000) return 'just now'
  const [value, unit] = pick(abs)
  const plural = value === 1 ? unit : `${unit}s`
  return ms < 0 ? `${value} ${plural} ago` : `in ${value} ${plural}`
}

function pick(ms: number): [number, string] {
  const seconds = Math.round(ms / 1000)
  if (seconds < 90) return [seconds, 'second']
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) return [minutes, 'minute']
  const hours = Math.round(minutes / 60)
  if (hours < 36) return [hours, 'hour']
  return [Math.round(hours / 24), 'day']
}

/* ══════════════════════════════ state, never by colour alone ══════════════════════════════ */

export interface Tone {
  readonly tone: 'good' | 'warn' | 'crit' | 'mute' | 'busy'
  readonly glyph: string
  readonly word: string
  /** What this state means for the reader, in one sentence. Rendered, not just typed. */
  readonly meaning: string
}

/**
 * The five provision states — `worlds/src/provisioning.ts`.
 *
 * All five, including the two nobody wants to see. A screen that fell through to "unknown" for
 * `unsupported` would be telling a paying customer that their purchase is in a state the site does
 * not recognise, which is the opposite of what this surface is for.
 */
export function provisionTone(state: ProvisionState): Tone {
  switch (state) {
    case 'pending':
      return {
        tone: 'warn',
        glyph: '◷',
        word: 'PENDING',
        meaning: 'Recorded and queued. Nothing has been asked of a title yet.',
      }
    case 'provisioning':
      return {
        tone: 'busy',
        glyph: '◐',
        word: 'PROVISIONING',
        meaning: 'A job holds this and is talking to the title.',
      }
    case 'provisioned':
      return {
        tone: 'good',
        glyph: '●',
        word: 'DELIVERED',
        meaning: 'The title raised it and named what it made.',
      }
    case 'unsupported':
      // NOT a failure word. `worlds/src/titleclient.ts`: an answer, and terminal. The
      // sentence points at the refund rather than at a retry, because retrying is guaranteed to
      // produce the same answer and burning an attempt on it hides the case an operator needs.
      return {
        tone: 'crit',
        glyph: '⊘',
        word: 'UNDELIVERABLE',
        meaning:
          'You paid for something no title can deliver. This will not be retried, and it is a ' +
          'refund rather than a wait.',
      }
    case 'failed':
      return {
        tone: 'crit',
        glyph: '■',
        word: 'FAILED',
        meaning:
          'Delivery was attempted and did not succeed. Only an operator can reopen this; a ' +
          'background poll deliberately never does.',
      }
  }
}

/** `worlds/src/titles.ts`. Five statuses; two of them can be sold to (`titles.ts`). */
export function titleTone(status: TitleStatus): Tone {
  switch (status) {
    case 'draft':
      return {
        tone: 'mute',
        glyph: '○',
        word: 'DRAFT',
        meaning: 'Registered, not sellable. A purchase would never be delivered.',
      }
    case 'beta':
      return { tone: 'warn', glyph: '◑', word: 'BETA', meaning: 'Playable and sellable to.' }
    case 'live':
      return { tone: 'good', glyph: '●', word: 'LIVE', meaning: 'Playable and sellable to.' }
    case 'sunset':
      return {
        tone: 'warn',
        glyph: '◷',
        word: 'SUNSET',
        meaning: 'Winding down. Still registered, and your account outlives it.',
      }
    case 'retired':
      return {
        tone: 'mute',
        glyph: '⊙',
        word: 'RETIRED',
        meaning: 'Closed. Hidden from the registry unless asked for by name.',
      }
  }
}

/** `worlds/src/rewards.ts`. */
export function seasonTone(status: SeasonStatus): Tone {
  switch (status) {
    case 'upcoming':
      return { tone: 'mute', glyph: '○', word: 'UPCOMING', meaning: 'Not started.' }
    case 'active':
      return { tone: 'good', glyph: '●', word: 'ACTIVE', meaning: 'Running now.' }
    case 'ended':
      return { tone: 'warn', glyph: '◷', word: 'ENDED', meaning: 'Over. Its rewards are settled.' }
    case 'archived':
      return { tone: 'mute', glyph: '⊙', word: 'ARCHIVED', meaning: 'Closed and put away.' }
  }
}

/* ══════════════════════════════ what a thing IS, never what it is worth ══════════════════════ */

/**
 * What a title can be asked to do — `worlds/src/titles.ts`.
 *
 * Phrased as a capability of the TITLE, not as a benefit to the buyer. "Can raise a private world
 * for you" is a fact about a service; "unlock private worlds" would be marketing, and on this
 * surface it would also be false for every title in the estate today. See `TITLE_BRIDGE_GAP`.
 */
export function capabilityMeaning(capability: string): string {
  switch (capability) {
    case 'private_world':
      return 'Declares it can raise a private world when the platform asks'
    case 'cosmetics':
      return 'Renders the cosmetics your account carries'
    case 'achievements':
      return 'Reports achievements to the platform'
    case 'seasons':
      return 'Runs seasons the platform budgets'
    case 'inventory':
      return 'Reads the inventory your account carries'
    default:
      // Never a guess. A capability this bundle has not heard of is shown by name, because the
      // service validates against a CLOSED set (`worlds/src/server.ts`) — so an unknown
      // one here means the set grew and this file has not been re-read.
      return capability
  }
}

/**
 * How an item arrived — `worlds/src/players.ts`.
 *
 * Provenance, not value. None of these sentences says an item is good, rare or strong.
 */
export function sourceMeaning(source: ItemSource): string {
  switch (source) {
    case 'purchase':
      return 'Bought'
    case 'reward':
      return 'Awarded by a season'
    case 'craft':
      return 'Made in a title'
    case 'market':
      return 'Traded for'
    case 'grant':
      return 'Granted by the platform'
  }
}

/**
 * What `bound` means, in the direction the rule actually runs.
 *
 * `worlds/src/players.ts`, quoting 04-domain-model §7.3: "`bound` is the anti-pay-to-win
 * control: anything conferring power is bound and cannot enter the market." So the sentence for a
 * bound item is about the CONTROL, not about a restriction the owner suffered — and the sentence
 * for a tradeable one must not imply the opposite ("this one is worth something"), which is how a
 * cosmetic economy learns to talk like a power economy.
 */
export function boundMeaning(bound: boolean): string {
  return bound
    ? 'Bound to your account. Anything that could confer an advantage is bound and never enters a market.'
    : 'Cosmetic or convenience, so it may be traded.'
}

/** What a SKU resolved to — `worlds/src/provisioning.ts`. */
export function kindMeaning(kind: ProvisionKind): string {
  switch (kind) {
    case 'private_world':
      return 'A private world, raised by a title'
    case 'cosmetic':
      return 'A cosmetic, delivered by the platform itself'
    case 'season_pass':
      return 'Access to a season'
    case 'convenience':
      return 'A convenience, delivered by the platform itself'
    case 'unknown':
      // `worlds/src/provisioning.ts`: falls back to `unknown` rather than to a guess,
      // because a guess would deliver the wrong thing silently.
      return 'The platform does not recognise this SKU, so it does not know what to deliver'
  }
}

/* ══════════════════════════════ ids and amounts ══════════════════════════════ */

/** The first eight characters of a uuid — what a table shows and what a phrase names. */
export function shortId(id: string): string {
  return id.slice(0, 8)
}

/**
 * A URN, shortened for a table but never silently.
 *
 * The full value is always in a `title` and on the detail row; this is the reading form. A
 * truncated urn rendered without the ellipsis is how somebody comes to compare two prefixes and
 * conclude two different items are the same item.
 */
export function shortUrn(urn: string | null): string {
  if (urn === null || urn.length === 0) return '—'
  return urn.length <= 34 ? urn : `${urn.slice(0, 20)}…${urn.slice(-10)}`
}

/**
 * A Shard amount, as text.
 *
 * It arrives as a decimal STRING and stays one — `worlds/src/server.ts` ("A budget is money")
 * and `worlds/src/env.ts` ("an approximate cap is a cap that is either slightly too generous
 * or refuses a legitimate grant"). Never put through `Number`: the point of the string is that
 * some of these do not survive it. A value that is not all digits is returned verbatim rather than
 * mangled into `NaN`.
 */
export function shards(value: string): string {
  return /^[0-9]+$/.test(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : value
}

/** A cosmetic slot key, as a person reads it: `head_frame` → `Head frame`. */
export function slotName(slot: string): string {
  const spaced = slot.replace(/[_-]+/g, ' ').trim()
  return spaced.length === 0 ? slot : spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
