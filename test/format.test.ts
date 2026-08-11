/**
 * Turning the platform's facts into words, checked against the facts.
 *
 * Three properties, and each of them is a rule this estate has written down somewhere other than
 * in a component:
 *
 *   1. **Every state the service can produce has a word.** A `switch` that fell through to
 *      "unknown" would tell a paying customer their purchase is in a state the site does not
 *      recognise. The enumerations are exported from src/lib/worlds.ts precisely so this file can
 *      iterate them rather than list them again.
 *   2. **State is never colour alone.** Every tone carries a glyph and a WORD; the tone class only
 *      tints them. The estate's reserved status hues sit ΔE 4.6 apart under protanopia.
 *   3. **Nothing purchasable is described as an advantage.**
 *      `docs/ecosystem/01-product-vision.md` principle 6.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  boundMeaning,
  capabilityMeaning,
  ember,
  kindMeaning,
  provisionTone,
  relative,
  seasonTone,
  shortId,
  shortUrn,
  slotName,
  sourceMeaning,
  timestamp,
  titleTone,
  type Tone,
} from '../src/lib/format.ts'
import {
  CAPABILITIES,
  ITEM_SOURCES,
  PROVISION_KINDS,
  PROVISION_STATES,
  SEASON_STATUSES,
  TITLE_STATUSES,
} from '../src/lib/worlds.ts'

const tones: ReadonlyArray<{ name: string; values: readonly string[]; of: (v: never) => Tone }> = [
  { name: 'provision state', values: PROVISION_STATES, of: provisionTone as (v: never) => Tone },
  { name: 'title status', values: TITLE_STATUSES, of: titleTone as (v: never) => Tone },
  { name: 'season status', values: SEASON_STATUSES, of: seasonTone as (v: never) => Tone },
]

describe('every state the service can produce has a word, a glyph and a sentence', () => {
  for (const group of tones) {
    it(`covers every ${group.name}`, () => {
      assert.ok(group.values.length > 0, `${group.name} has no values`)
      for (const value of group.values) {
        const tone = group.of(value as never)
        assert.ok(tone.word.length > 0, `${value} has no word`)
        assert.ok(tone.glyph.length > 0, `${value} has no glyph`)
        assert.ok(tone.meaning.length > 10, `${value} has no sentence`)
      }
    })

    it(`gives every ${group.name} a DISTINCT word, so two states never read the same`, () => {
      const words = group.values.map((v) => group.of(v as never).word)
      assert.equal(new Set(words).size, words.length, words.join(', '))
    })
  }
})

describe('unsupported is an answer, not a fault', () => {
  /**
   * `worlds/src/titleclient.ts`: "A title asked for something it does not sell answers 422,
   * and the bridge records `unsupported` and stops. Retrying is guaranteed to fail again."
   *
   * So it must not be spelled FAILED, and its sentence must point at a refund rather than at a
   * wait. This is the single most important string on the whole surface today: every private-world
   * purchase in the estate ends here, because no title serves `POST /v1/provision`.
   */
  it('is not called FAILED', () => {
    assert.notEqual(provisionTone('unsupported').word, provisionTone('failed').word)
  })

  it('says it will not be retried', () => {
    assert.match(provisionTone('unsupported').meaning, /nothing will try again/i)
  })

  it('names the remedy, which is a refund rather than patience', () => {
    assert.match(provisionTone('unsupported').meaning, /refund/i)
  })

  it('does not tell somebody to wait, or to come back', () => {
    for (const state of ['unsupported', 'failed'] as const) {
      assert.doesNotMatch(
        provisionTone(state).meaning,
        /(soon|shortly|any moment|check back|on its way)/i,
        `${state} implies something is coming`,
      )
    }
  })

  it('marks failed as an operator’s job, not the player’s', () => {
    assert.match(provisionTone('failed').meaning, /person at CloudsForge/i)
  })
})

describe('nothing purchasable is described as an advantage', () => {
  /**
   * `docs/ecosystem/01-product-vision.md` principle 6: purchasable means cosmetic, convenience or
   * access — never power. Every sentence this app puts beside an item is checked here.
   */
  const FORBIDDEN =
    /(stronger|more powerful|advantage over|edge over|win|dominate|outclass|superior|overpowered)/i

  it('never appears in a source description', () => {
    for (const source of ITEM_SOURCES) {
      assert.doesNotMatch(sourceMeaning(source), FORBIDDEN, source)
    }
  })

  it('never appears in a kind description', () => {
    for (const kind of PROVISION_KINDS) {
      assert.doesNotMatch(kindMeaning(kind), FORBIDDEN, kind)
    }
  })

  it('never appears in a capability description', () => {
    for (const capability of CAPABILITIES) {
      assert.doesNotMatch(capabilityMeaning(capability), FORBIDDEN, capability)
    }
  })

  it('describes `bound` as the CONTROL rather than as a restriction somebody suffered', () => {
    // `worlds/src/players.ts`, quoting 04-domain-model §7.3: "anything conferring power is
    // bound and cannot enter the market". The direction of that sentence is the whole principle —
    // an item is bound BECAUSE it would confer power, and the platform's answer is that it never
    // enters a market. A sentence phrased the other way round ("you cannot sell this one") turns
    // the control into a downside of a purchase.
    const bound = boundMeaning(true)
    assert.match(bound, /can never reach a market/i)
    assert.match(bound, /giving you an edge/i)
  })

  it('does not imply a tradeable item is worth more than a bound one', () => {
    const free = boundMeaning(false)
    assert.doesNotMatch(free, /(valuable|worth|rare|better)/i)
    assert.match(free, /appearance or convenience/i)
  })

  it('describes a capability as a fact about the TITLE, not a benefit to the buyer', () => {
    // "Declares it can raise a private world when the platform asks" is a fact about a service.
    // "Unlock private worlds!" would be marketing — and, on this surface today, false for every
    // title in the estate.
    assert.match(capabilityMeaning('private_world'), /declares/i)
    for (const capability of CAPABILITIES) {
      assert.doesNotMatch(capabilityMeaning(capability), /^(unlock|get|enjoy)/i, capability)
    }
  })

  it('names an unknown capability rather than guessing at one', () => {
    // The service validates against a CLOSED set (`worlds/src/server.ts`), so an unknown
    // value here means the set grew and this file has not been re-read. Inventing a sentence for
    // it would hide that.
    assert.equal(capabilityMeaning('teleportation'), 'teleportation')
  })
})

describe('an unknown SKU is named rather than guessed at', () => {
  it('says the platform does not know what to deliver', () => {
    // `worlds/src/provisioning.ts` falls back to `unknown` rather than to a guess, because
    // a guess would deliver the wrong thing silently.
    assert.match(kindMeaning('unknown'), /never been taught/i)
  })
})

describe('money is text, never a number', () => {
  /**
   * `worlds/src/server.ts` — "A budget is money." — and `worlds/src/env.ts`: reading a
   * budget through `Number()` makes a large one approximate, "and an approximate cap is a cap that
   * is either slightly too generous or refuses a legitimate grant".
   *
   * These assertions used to drive `shards()`, which grouped digits and stopped. Every one of them
   * still passed on 2026-08-11, on a page rendering a currency the service had stopped speaking
   * eight months earlier — because grouping a decimal string is true of a Shard count and true of a
   * wei figure and says nothing about which one arrived. So the exponent is now asserted too.
   */
  it('groups the whole part of a wei amount', () => {
    assert.equal(ember('100000000000000000000000'), '100,000')
    assert.equal(ember('0'), '0')
    assert.equal(ember('999000000000000000000'), '999')
  })

  it('places the point at 18 and invents no digit either side of it', () => {
    // Half an EMBER, and one wei. The second is the one that a double would round away, and it is
    // exactly the figure a reader would use to check that nothing here is approximate.
    assert.equal(ember('500000000000000000'), '0.5')
    assert.equal(ember('1'), '0.000000000000000001')
    // A whole number keeps no point, and no trailing zero survives.
    assert.equal(ember('2000000000000000000'), '2')
  })

  it('survives a value no JSON number could carry', () => {
    const huge = '123456789012345678901234567890'
    assert.equal(ember(huge), '123,456,789,012.34567890123456789')
  })

  it('returns anything that is not all digits VERBATIM rather than mangling it to NaN', () => {
    assert.equal(ember('not-a-number'), 'not-a-number')
    // `BigInt('')` is 0n, not a throw. An absent field stringifies to this, and a confident '0'
    // under a money label is the plausible default this surface refuses.
    assert.equal(ember(''), '')
  })
})

describe('ids and urns are shortened, never silently', () => {
  it('takes the first eight characters of a uuid', () => {
    assert.equal(shortId('5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'), '5c1d2e3f')
  })

  it('marks a truncated urn with an ellipsis, so two prefixes are never read as one value', () => {
    const long = 'cf:emberkin:world:5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f-and-more'
    assert.match(shortUrn(long), /…/)
    assert.ok(shortUrn(long).length < long.length)
  })

  it('leaves a short urn alone', () => {
    assert.equal(shortUrn('cf:x:y:1'), 'cf:x:y:1')
  })

  it('renders a missing urn as an em dash, which the caller replaces with a sentence', () => {
    assert.equal(shortUrn(null), '—')
    assert.equal(shortUrn(''), '—')
  })
})

describe('timestamps', () => {
  it('renders a missing one as an em dash', () => {
    assert.equal(timestamp(null), '—')
    assert.equal(timestamp(''), '—')
  })

  it('returns an unparseable one VERBATIM rather than as "Invalid Date"', () => {
    // A customer seeing the actual string can report it; one seeing "Invalid Date" can only report
    // that the site is broken.
    assert.equal(timestamp('the day before yesterday'), 'the day before yesterday')
  })

  it('renders a real one as something a person reads', () => {
    assert.notEqual(timestamp('2026-07-31T12:00:00.000Z'), '2026-07-31T12:00:00.000Z')
  })
})

describe('relative time is always a phrase, never a bare number', () => {
  const now = new Date('2026-07-31T12:00:00.000Z')

  it('says "just now" inside five seconds', () => {
    assert.equal(relative(new Date(now.getTime() - 1000), now), 'just now')
  })

  it('says how long ago, with a unit', () => {
    // The unit only changes at 90, not at 60: a minute ago reads "60 seconds ago", which is the
    // inherited behaviour and is deliberately not rounded up. Pinned at the boundary rather than
    // around it, because a test that only checks 5 minutes would not notice the rule changing.
    assert.equal(relative(new Date(now.getTime() - 60_000), now), '60 seconds ago')
    assert.equal(relative(new Date(now.getTime() - 120_000), now), '2 minutes ago')
    assert.equal(relative(new Date(now.getTime() - 300_000), now), '5 minutes ago')
  })

  it('crosses to the next unit at 90, not at 60', () => {
    // An hour ago is "60 minutes ago"; two hours is "2 hours ago". Pinned in both directions.
    assert.equal(relative(new Date(now.getTime() - 3_600_000), now), '60 minutes ago')
    assert.equal(relative(new Date(now.getTime() - 7_200_000), now), '2 hours ago')
  })

  /**
   * A FINDING ABOUT THE INHERITED HELPER, RECORDED RATHER THAN ASSERTED AWAY.
   *
   * `pick` switches unit only above 90 of the smaller one, and then ROUNDS. So a value of exactly
   * 1 is unreachable in every unit — 60 seconds reads "60 seconds", 60 minutes reads "60 minutes",
   * and by the time minutes exceed 90 the rounded hour count is already 2. The singular branch in
   * `relative` (`value === 1 ? unit : ...`) is therefore dead code.
   *
   * It is harmless — no string is wrong, only never singular — so it is NOT worked around here,
   * and the function is not "fixed" in a client repository when the same helper is in five others.
   * It is written down so the next person does not spend an afternoon proving it, and reported
   * with the rest of the findings. The test asserts the behaviour that EXISTS.
   */
  it('never produces a singular unit, which is a known quirk of the shared helper', () => {
    const samples = [5_001, 60_000, 120_000, 3_600_000, 7_200_000, 86_400_000, 172_800_000]
    for (const ms of samples) {
      const phrase = relative(new Date(now.getTime() - ms), now)
      assert.doesNotMatch(phrase, /\b1 (second|minute|hour|day) ago\b/, `${ms}ms produced ${phrase}`)
    }
  })

  it('says how long until, for something in the future', () => {
    assert.equal(relative(new Date(now.getTime() + 7_200_000), now), 'in 2 hours')
  })
})

describe('slot names', () => {
  it('reads a snake_case key as a sentence', () => {
    assert.equal(slotName('head_frame'), 'Head frame')
  })

  it('leaves an already-readable one alone', () => {
    assert.equal(slotName('Banner'), 'Banner')
  })

  it('returns an empty key unchanged rather than producing a blank label', () => {
    assert.equal(slotName(''), '')
  })
})
