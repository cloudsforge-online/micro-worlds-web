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
        meaning: 'Written down and waiting its turn. No title has been asked for anything yet.',
      }
    case 'provisioning':
      return {
        tone: 'busy',
        glyph: '◐',
        word: 'PROVISIONING',
        meaning: 'Being handled now — the platform is talking to the title about it.',
      }
    case 'provisioned':
      return {
        tone: 'good',
        glyph: '●',
        word: 'DELIVERED',
        meaning: 'The title made it and told the platform what it made.',
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
          'What you paid for is something no title is able to hand over. Nothing will try again, ' +
          'so the remedy here is a refund and not patience.',
      }
    case 'failed':
      return {
        tone: 'crit',
        glyph: '■',
        word: 'FAILED',
        meaning:
          'The attempt was made and it did not work. Only a person at CloudsForge can start it ' +
          'again; nothing in the background will, on purpose.',
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
        meaning: 'On the register, but nothing can be sold against it — a purchase would go undelivered.',
      }
    case 'beta':
      return { tone: 'warn', glyph: '◑', word: 'BETA', meaning: 'Open to play, and open to buy things for.' }
    case 'live':
      return { tone: 'good', glyph: '●', word: 'LIVE', meaning: 'Open to play, and open to buy things for.' }
    case 'sunset':
      return {
        tone: 'warn',
        glyph: '◷',
        word: 'SUNSET',
        meaning: 'Winding down. Still on the register, and your account carries on after it.',
      }
    case 'retired':
      return {
        tone: 'mute',
        glyph: '⊙',
        word: 'RETIRED',
        meaning: 'Finished. Left off the register unless you name it directly.',
      }
  }
}

/** `worlds/src/rewards.ts`. */
export function seasonTone(status: SeasonStatus): Tone {
  switch (status) {
    case 'upcoming':
      return { tone: 'mute', glyph: '○', word: 'UPCOMING', meaning: 'Not started yet.' }
    case 'active':
      return { tone: 'good', glyph: '●', word: 'ACTIVE', meaning: 'Under way right now.' }
    case 'ended':
      return { tone: 'warn', glyph: '◷', word: 'ENDED', meaning: 'Finished, with every reward paid out.' }
    case 'archived':
      return { tone: 'mute', glyph: '⊙', word: 'ARCHIVED', meaning: 'Shut and filed away.' }
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
      return 'Declares it will set up a private world when the platform asks for one'
    case 'cosmetics':
      return 'Draws the cosmetics your account carries'
    case 'achievements':
      return 'Tells the platform what you have earned'
    case 'seasons':
      return 'Runs seasons against money the platform sets aside'
    case 'inventory':
      return 'Reads what your account is carrying'
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
      return 'You bought it'
    case 'reward':
      return 'A season paid it out'
    case 'craft':
      return 'You made it inside a title'
    case 'market':
      return 'You traded for it'
    case 'grant':
      return 'The platform handed it to you'
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
    ? 'Tied to your account. Anything capable of giving you an edge is tied down like this and can never reach a market.'
    : 'Appearance or convenience only, so you are free to trade it.'
}

/** What a SKU resolved to — `worlds/src/provisioning.ts`. */
export function kindMeaning(kind: ProvisionKind): string {
  switch (kind) {
    case 'private_world':
      return 'A world of your own, set up by the title'
    case 'cosmetic':
      return 'Something to wear, handed over by the platform'
    case 'season_pass':
      return 'Entry to a season'
    case 'convenience':
      return 'A convenience, handed over by the platform'
    case 'unknown':
      // `worlds/src/provisioning.ts`: falls back to `unknown` rather than to a guess,
      // because a guess would deliver the wrong thing silently.
      return 'The platform has never been taught what this product code means, so it cannot deliver it'
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
 * EMBER's exponent. 10^18 — `contracts/packages/chain/src/index.ts`.
 *
 * A named constant rather than `10n ** 18n` inline, so that the one place this surface commits to
 * an exponent is greppable. `micro-network-site` takes `decimals` as a parameter for a reason it
 * spells out at length: Hearth's own `params.js` still defines `SPARKS_PER_EMBER = 1e8` and the
 * project's README records the disagreement as open. Here there is exactly one caller and exactly
 * one asset, so the choice is made once, at the top, where a reader will find it — not defaulted
 * quietly inside a helper.
 */
const WEI_PER_EMBER = 1_000_000_000_000_000_000n

/**
 * A wei amount as whole EMBER, with `BigInt` only.
 *
 * ── THIS FUNCTION USED TO BE `shards()`, AND THAT IS THE DEFECT, NOT THE NAME ──────────────────
 *
 * It arrives as a decimal STRING and stays one — `worlds/src/server.ts` ("A budget is money") and
 * `worlds/src/env.ts` ("an approximate cap is a cap that is either slightly too generous or
 * refuses a legitimate grant"). Never put through `Number`: the point of the string is that some of
 * these do not survive it.
 *
 * The old version grouped digits and stopped. That was right when a season budget was an integer
 * count of Shards with no sub-unit. `micro-worlds` re-denominated to wei on 2026-08-10
 * (micro-org#226) and this file did not follow, so it was grouping a wei figure as though it were a
 * whole-unit one — which, had any reward been non-zero, would have printed a number 10^18 times too
 * large under a currency name that no longer existed. Every reward on mainnet is `0`, which is the
 * only reason nobody read a wrong figure.
 *
 * Nothing is rounded and no digit is invented: the fraction is the remainder, padded to the
 * exponent and then trimmed from the right. Shape-checked before `BigInt`, because **`BigInt('')`
 * is `0n` rather than a throw** — an absent field stringifies to `''`, and a confident `0` is the
 * plausible default this whole surface exists to refuse. `micro-network-site`'s `weiToEmber` found
 * that by driving itself with `''`; the check is here for the same reason and not by copying.
 */
export function ember(value: string): string {
  const trimmed = value.trim()
  if (!/^-?\d+$/.test(trimmed)) return trimmed
  const raw = BigInt(trimmed)
  const negative = raw < 0n
  const magnitude = negative ? -raw : raw
  const whole = (magnitude / WEI_PER_EMBER).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = (magnitude % WEI_PER_EMBER).toString().padStart(18, '0').replace(/0+$/, '')
  const sign = negative ? '-' : ''
  return fraction.length === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`
}

/** A cosmetic slot key, as a person reads it: `head_frame` → `Head frame`. */
export function slotName(slot: string): string {
  const spaced = slot.replace(/[_-]+/g, ' ').trim()
  return spaced.length === 0 ? slot : spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
