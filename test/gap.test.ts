/**
 * THE GAPS ARE STATED, AND THEY ARE STATED AS FINDINGS.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * This is the file that keeps the point of the surface.
 *
 * Two things about Forge Worlds are true and unwelcome:
 *
 *   1. No title serves `GET /v1/title` or `POST /v1/provision`, so the entitlement bridge has
 *      nothing on the other end of it and a private-world purchase ends as a row rather than a
 *      world.
 *   2. Nothing registers a title, so a fresh deployment has an empty registry.
 *
 * The tempting rendering of both is a spinner, a skeleton, or an empty state that implies
 * "loading". Each of those is a lie with a specific cost: a customer who paid for a private world
 * sits and waits for something that is never going to arrive.
 *
 * The model is `micro-admin-web`'s treatment of an action with no executor
 * (`admin-web/src/lib/catalogue.ts`): stated not hidden, no control that could exercise it —
 * not a disabled one — and the service's own words verbatim. The rules are asserted here rather
 * than trusted to a component, because a redesign undoes prose and cannot undo a test.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  EMPTY_REGISTRY_GAP,
  KNOWN_GAPS,
  TITLE_BRIDGE_GAP,
  isSellable,
  type KnownGap,
} from '../src/lib/worlds.ts'

const read = (file: string): string => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/**
 * A source file with its prose removed.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE FIRST RUN OF THIS FILE FAILED ON ITS OWN COMMENTS, WHICH IS THE ESTATE'S RECURRING BUG.
 *
 * `src/components/gap.tsx` explains at length why a gap gets no DISABLED button; a grep for
 * `disabled` over the raw text matched that sentence and failed a correct file. So did the grep for
 * `/retry` against `entitlements.tsx`, whose comment cites the route it declines, and the grep for
 * "belongs to somebody else", which appears only in the comment saying the app must never say it.
 *
 * It is exactly the shape of the nginx check that had to strip comments because nginx.conf quotes
 * the directive it forbids — and of `market/src/indexerclient.test.ts`, which strips first
 * because "a checker that cannot tell a request from a sentence about one is not a checker".
 * Recorded here rather than quietly fixed, because the reflex to grep raw source is what produces
 * a green check that is measuring the wrong text.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
function codeOf(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

const platform = read('src/pages/platform.tsx')
const platformCode = codeOf(platform)
const entitlementsCode = codeOf(read('src/pages/entitlements.tsx'))
const gapComponentCode = codeOf(read('src/components/gap.tsx'))

/** Language that promises something is on its way. None of it belongs on this surface. */
const IMPLIES_LOADING =
  /(coming soon|shortly|any moment|check back|under construction|we['’]re working on|in progress|stay tuned)/i

describe('the gaps are declared as data, so they can be checked', () => {
  it('declares both of them', () => {
    assert.equal(KNOWN_GAPS.length, 2)
    assert.ok(KNOWN_GAPS.includes(TITLE_BRIDGE_GAP))
    assert.ok(KNOWN_GAPS.includes(EMPTY_REGISTRY_GAP))
  })

  for (const gap of [TITLE_BRIDGE_GAP, EMPTY_REGISTRY_GAP]) {
    describe(gap.id, () => {
      it('states a finding long enough to be a real one', () => {
        // `admin-api` requires a blocked action's reason to exceed 80 characters so that whoever
        // unblocks it has something to act on (`admin-web/src/lib/catalogue.ts`). The same
        // floor applies here, and for the same reason.
        assert.ok(gap.finding.length > 80, `${gap.id} has a finding of ${gap.finding.length} chars`)
      })

      it('carries citations a reader can check', () => {
        // A claim nobody can check is worse than no claim, because it is believed.
        //
        // A citation is a repository-relative FILE, optionally followed by the symbol or route
        // inside it. It used to be required to end in `:<line>`, and that requirement is what this
        // shape now forbids: a line names a position in a file micro-worlds owns and edits freely,
        // so it went stale without anybody here touching anything — and these strings are RENDERED
        // TO A CUSTOMER, who would then check the wrong line and conclude the page was lying.
        assert.ok(gap.citations.length >= 3, `${gap.id} carries ${gap.citations.length} citations`)
        for (const cite of gap.citations) {
          assert.match(cite, /^[a-z-]+\/src\/[a-z]+\.ts(?: [^:]+)?$/, `${gap.id}: ${cite}`)
        }
        assert.equal(
          new Set(gap.citations).size,
          gap.citations.length,
          `${gap.id} cites the same place twice; name the symbol that tells them apart`,
        )
      })

      it('says what would close it, concretely', () => {
        assert.ok(gap.closes.length > 60, `${gap.id} does not say what would close it`)
      })

      it('never implies that something is on its way', () => {
        assertHonest(gap)
      })

      it('is written as a fact rather than as an apology', () => {
        assert.doesNotMatch(gap.finding, /(sorry|unfortunately|apolog)/i, gap.id)
      })
    })
  }
})

function assertHonest(gap: KnownGap): void {
  for (const text of [gap.title, gap.finding, gap.closes]) {
    assert.doesNotMatch(text, IMPLIES_LOADING, `${gap.id} implies something is coming: ${text}`)
  }
}

describe('the title-bridge gap says the specific true thing', () => {
  it('names both routes worlds calls into a title', () => {
    assert.match(TITLE_BRIDGE_GAP.finding, /GET \/v1\/title\b/)
    assert.match(TITLE_BRIDGE_GAP.finding, /POST \/v1\/provision\b/)
  })

  it('cites the two functions in worlds/src/titleclient.ts that make those calls', () => {
    // `test/worlds.test.ts` finds both functions in the real file and requires each to still
    // request its path. Here we only assert that the gap entry names them, so the two halves
    // cannot drift apart. They were line numbers until a service edit elsewhere in the estate
    // moved seven routes at once and broke every client that had cited one.
    assert.ok(TITLE_BRIDGE_GAP.citations.includes('worlds/src/titleclient.ts describe()'))
    assert.ok(TITLE_BRIDGE_GAP.citations.includes('worlds/src/titleclient.ts provision()'))
  })

  it('says the bridge is CORRECT, not broken — it checks capability before it calls', () => {
    // The distinction matters and is easy to lose. `worlds/src/provisioning.ts` asks the
    // title's declared capabilities BEFORE making the request, so the outcome is a readable
    // terminal row rather than a blind 404. Saying "the bridge is broken" would be false and would
    // point whoever fixes this at the wrong repository.
    assert.match(TITLE_BRIDGE_GAP.finding, /before it calls/i)
    assert.ok(TITLE_BRIDGE_GAP.citations.includes('worlds/src/provisioning.ts'))
  })

  it('still says the customer outcome plainly: a row, not a world', () => {
    // The honest bottom line. A gap entry that stopped at "the bridge handles it correctly" would
    // be technically true and would leave out the only part a customer cares about.
    assert.match(TITLE_BRIDGE_GAP.finding, /row and not as a world/i)
  })

  it('names both titles as the things that do not serve it', () => {
    assert.match(TITLE_BRIDGE_GAP.finding, /Ninety Days After/)
    assert.match(TITLE_BRIDGE_GAP.finding, /Emberkin/)
  })

  it('says which direction they DO integrate in, so the gap is not overstated', () => {
    assert.match(TITLE_BRIDGE_GAP.finding, /report achievements/i)
  })
})

describe('the empty-registry gap says an empty list is an ANSWER', () => {
  it('says so in as many words', () => {
    assert.match(EMPTY_REGISTRY_GAP.finding, /a 200 and\s+a true answer/i)
  })

  it('says explicitly that it is not a page still loading', () => {
    assert.match(EMPTY_REGISTRY_GAP.finding, /not.*finished loading/i)
  })

  it('names the route that would populate it and the authority it needs', () => {
    assert.match(EMPTY_REGISTRY_GAP.finding, /POST \/v1\/titles/)
    assert.match(EMPTY_REGISTRY_GAP.finding, /administrator/i)
  })

  it('points at the idempotency that makes self-registration the obvious fix', () => {
    // `worlds/src/titles.ts` — registerTitle is idempotent on the slug precisely so a
    // service can re-register on every boot.
    assert.match(EMPTY_REGISTRY_GAP.closes, /idempotent on the slug/i)
  })
})

describe('the front page states both gaps', () => {
  it('renders the empty-registry gap where the registry would be', () => {
    assert.match(platformCode, /gap=\{EMPTY_REGISTRY_GAP\}/)
  })

  it('renders the title-bridge gap ALWAYS, not only when the registry is empty', () => {
    // A registry with rows in it would make the platform look complete; the bridge would still
    // have nothing on the other end. The gap is a property of the estate, not of the response — so
    // the section that renders it must not be inside the `state === 'empty'` branch.
    //
    // The RENDER SITE is located, not the import: `indexOf` on the bare name finds the import at
    // the top of the file and would place the gap before every branch, passing this test for a
    // reason that has nothing to do with the rendering.
    const at = platformCode.indexOf('gap={TITLE_BRIDGE_GAP}')
    assert.ok(at > 0, 'the front page does not render the title-bridge gap')
    const emptyBranch = platformCode.indexOf("registry.state === 'empty'")
    const okBranch = platformCode.indexOf("registry.state === 'ok'")
    assert.ok(emptyBranch > 0 && okBranch > 0, 'the registry branches are not where this expects')
    assert.ok(
      at > emptyBranch && at > okBranch,
      'the title-bridge gap is rendered inside a registry-state branch; it must be unconditional',
    )
  })

  it('never draws the empty registry as a loading state', () => {
    // `useResource` already ranks failure above emptiness (`src/lib/resource.ts`). This is about
    // what emptiness renders AS.
    assert.doesNotMatch(platform, IMPLIES_LOADING)
    const empty = platformCode.slice(platformCode.indexOf("registry.state === 'empty'"))
    const section = empty.slice(0, empty.indexOf("registry.state === 'ok'"))
    assert.doesNotMatch(section, /<Loading/, 'the empty registry renders a spinner')
    assert.match(section, /Not loading/, 'the empty registry does not say it is not loading')
  })

  it('offers no call to action beside a gap, because a reader can do nothing about it', () => {
    assert.doesNotMatch(gapComponentCode, /<button/i, 'a gap must carry no control')
    assert.doesNotMatch(gapComponentCode, /disabled/i, 'a gap must carry no disabled control either')
  })

  it('leads with what the platform OWNS rather than with a list of games', () => {
    // The category error this estate has made twice. The index opens with the platform's own
    // responsibilities; the registry is a section within it, and it is read at runtime.
    const owns = platformCode.indexOf('const OWNS')
    const registry = platformCode.indexOf('The registry')
    assert.ok(owns > 0 && registry > owns, 'the registry section must come after what it owns')
    assert.match(platform, /Forge Worlds is not a game/)
  })

  it('builds the registry from the SERVICE, never from a list in source', () => {
    // ══════════════════════════════════════════════════════════════════════════════════════════
    // The two titles ARE named, once, in the lede — "Ninety Days After and Emberkin are titles
    // that run here." That sentence is not the category error; it is the correction of it, and
    // deleting it would leave a reader with no idea what a title is.
    //
    // What must never exist is a title as STRUCTURE: a card, a route, a nav entry, or an array in
    // source. Those would be this app asserting which games exist — the assertion the registry
    // exists to take out of source, and one that is false today anyway. So the check is about
    // shape, not about vocabulary.
    // ══════════════════════════════════════════════════════════════════════════════════════════
    assert.match(platformCode, /listTitles/, 'the registry must be read from the service')
    assert.match(platformCode, /registry\.data\.titles\.map/, 'the rows must come from the response')

    // A title may be NAMED in the lede, and nowhere else. Cut that one paragraph out and no title
    // name may remain anywhere in the executable file — not in an array, a route, a card, a label
    // or an attribute. That is the difference between explaining what a title is and asserting
    // which ones exist.
    const lede = /<p className="ww-head__lede">[\s\S]*?<\/p>/.exec(platformCode)
    assert.ok(lede, 'the front page has no lede')
    const withoutLede = platformCode.replace(lede[0], '')

    for (const title of ['Emberkin', 'Ninety Days', 'Kindred', 'emberkin', 'nda']) {
      assert.ok(
        !withoutLede.includes(title),
        `${title} appears outside the lede on the front page; the registry is data`,
      )
    }

    // And the lede is prose, not structure: it must not be built from a list.
    assert.doesNotMatch(lede[0], /\.map\(/, 'the lede renders a list of titles')
  })

  it('frames the two titles as things that RUN on the platform', () => {
    // The sentence that does the work. Asserted so a rewrite cannot drop it and leave the page
    // describing a platform with nothing to say about what a title is.
    assert.match(platform, /are titles that run here/i)
  })
})

describe('an undeliverable entitlement renders the service’s own refusal', () => {
  it('renders lastError verbatim through ServiceRefusal', () => {
    assert.match(entitlementsCode, /<ServiceRefusal/)
    assert.match(entitlementsCode, /provision\.lastError/)
  })

  it('offers NO retry control — not a disabled one', () => {
    // `POST /v1/provisions/:id/retry` demands `worlds:admin` or `role:admin`
    // (`worlds/src/server.ts`), so a control here could only ever 403. A disabled button
    // reads as "not yet, ask somebody" and gets clicked at.
    assert.ok(!entitlementsCode.includes('/retry'), 'the player app must not call the retry route')
    assert.doesNotMatch(entitlementsCode, /disabled=/, 'a terminal provision gets no control at all')
  })

  it('says something when the service recorded no reason, rather than rendering nothing', () => {
    // `lastError` is nullable. A terminal row with no reason is itself worth reporting, and a
    // blank space would hide it.
    assert.match(entitlementsCode, /provision\.lastError === null/)
  })

  it('does not translate the shared 404 into "that belongs to somebody else"', () => {
    // `worlds/src/server.ts`: "'Does not exist' and 'is not yours' are the same answer on
    // purpose" — a distinct answer for the second is an enumeration oracle. An app that invented
    // the distinction would undo the control in the one place a user can see it.
    assert.doesNotMatch(entitlementsCode, /(belongs to|another account|someone else['’]s)/i)
  })

  it('never tells somebody an undeliverable purchase is on its way', () => {
    assert.doesNotMatch(entitlementsCode, IMPLIES_LOADING)
  })
})

describe('a title that cannot be sold to is marked as such', () => {
  /**
   * `worlds/src/titles.ts` — only `beta` and `live` are sellable, because a purchase
   * scoped to a `draft` or `retired` title would never be delivered. That is the same failure mode
   * as the bridge gap, one step earlier, and the registry row says so.
   */
  it('agrees with the service about which statuses are sellable', () => {
    const of = (status: 'draft' | 'beta' | 'live' | 'sunset' | 'retired') =>
      isSellable({ id: 'x', slug: 'x', name: 'X', status, capabilities: [], assetScopes: [] })
    assert.equal(of('beta'), true)
    assert.equal(of('live'), true)
    assert.equal(of('draft'), false)
    assert.equal(of('sunset'), false)
    assert.equal(of('retired'), false)
  })

  it('is said on the registry row', () => {
    assert.match(platformCode, /isSellable/)
    assert.match(platformCode, /would never be delivered/)
  })

  it('says a title declaring no capabilities will not be asked for anything', () => {
    // The bridge checks capabilities before calling (`worlds/src/provisioning.ts`), so a
    // title with none is one whose every purchase ends undeliverable. Saying it on the row is
    // cheaper than saying it after somebody has paid.
    assert.match(platformCode, /declares no capabilities/)
  })
})
