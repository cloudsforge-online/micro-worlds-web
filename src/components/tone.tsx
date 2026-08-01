/**
 * A state, rendered as a word, a glyph and a tone — in that order of importance.
 *
 * The word is never optional and the glyph is never the only non-colour channel. The estate's
 * reserved status hues sit ΔE 4.6 apart under protanopia, measured in micro-ui, which is why
 * status-web encodes every day three times. A badge that said what it meant only by being amber
 * would say nothing at all to a reader who cannot separate it from the green one.
 */
import type { ReactNode } from 'react'
import type { Tone } from '../lib/format.ts'

export function StateBadge({ tone, title }: { tone: Tone; title?: string | undefined }) {
  return (
    <span className={`ww-badge ww-badge--${tone.tone}`} title={title ?? tone.meaning}>
      <span className="ww-badge__glyph" aria-hidden="true">
        {tone.glyph}
      </span>
      <span className="ww-badge__word">{tone.word}</span>
    </span>
  )
}

/** A label and its value, as a definition pair. The value may be a node — an id, a link, a badge. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ww-fact">
      <dt className="ww-fact__label">{label}</dt>
      <dd className="ww-fact__value">{children}</dd>
    </div>
  )
}

/**
 * A value that may be absent, where absence is a real answer rather than a rendering problem.
 *
 * `missing` is the SENTENCE, not a dash. An item with no `entitlementId` was not bought, and a
 * provision with no `provisionedUrn` had nothing raised for it — two facts a reader is entitled to,
 * and both destroyed by rendering an em dash in their place.
 */
export function Maybe({ value, missing }: { value: string | null; missing: string }) {
  if (value === null || value.length === 0) {
    return <span className="ww-absent">{missing}</span>
  }
  return <span className="cf-num">{value}</span>
}
