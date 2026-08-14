/**
 * The browser journeys of `docs/ecosystem/22-browser-journeys.md`, tiers 1 and 2, for this surface.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE ONE RULE. Doc 22 §3: **a browser scenario may never assert a business rule.**
 *
 * A game client once withheld four SKUs from its UI while the payment routes stayed live and
 * chargeable (14 §11); a client-side test of the hidden catalogue would have passed, green,
 * against the defect. So every scenario below asserts one of exactly three things (§3.1): what a
 * human can see relative to what the API returned in the SAME run, what the client SENT, or where
 * the browser ended up.
 *
 * ── Where that bites hardest here, and it is BJ-WLD-03 ─────────────────────────────────────────
 *
 * `bound` is the anti-pay-to-win control. The refusal is enforced three times over inside
 * micro-worlds — `and bound = false` in the UPDATE, a CHECK constraint behind it, and a 403 with
 * its own code. This scenario does NOT assert that a bound item cannot be sold; that is
 * `worlds/src/players.ts`'s test and is cited in `ownedBy`. What it asserts is the sentence the
 * user is shown, and the ABSENCE OF A DISABLED BUTTON — because a disabled button reads as "not
 * yet, ask somebody", and this is never.
 *
 * The layer boundary is exactly the incident's shape: hiding the control is not the control.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { createElement as h, type ReactElement } from 'react'
import { MemoryRouter, Route, Routes as RouterRoutes } from 'react-router-dom'

import { withScreen, type Routes } from './dom.ts'
import * as fx from './fixtures.ts'
import { DOC22_IDS, SCENARIOS } from './journeys.ts'
import { App } from '../src/app.tsx'
import { AuthProvider } from '../src/lib/auth.tsx'
import { ROUTES } from '../src/lib/routes.ts'
import { EntitlementsPage } from '../src/pages/entitlements.tsx'
import { InventoryPage } from '../src/pages/inventory.tsx'
import { PlatformPage } from '../src/pages/platform.tsx'
import { PlayerPage } from '../src/pages/player.tsx'
import { TitlePage } from '../src/pages/title.tsx'

const ORIGIN = 'https://worlds.cloudsforge.online'
const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

const page = (element: ReactElement, path: string): ReactElement =>
  h(MemoryRouter, { initialEntries: [path] }, h(AuthProvider, null, element) as ReactElement)

const atRoute = (pattern: string, element: ReactElement, path: string): ReactElement =>
  h(
    MemoryRouter,
    { initialEntries: [path] },
    h(AuthProvider, null, h(RouterRoutes, null, h(Route, { path: pattern, element }))) as ReactElement,
  )

const signedIn = (routes: Routes): Routes => ({ 'GET /auth/me': { body: fx.ME }, ...routes })

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   6.7 Group G — Forge Worlds
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('BJ-WLD — Forge Worlds', () => {
  it('BJ-WLD-01 ★ T2: an empty registry is a stated finding, not a spinner', async () => {
    await withScreen(
      page(h(PlatformPage), '/'),
      { url: `${ORIGIN}/`, routes: { 'GET /v1/titles': { body: { titles: [] } } } },
      async (s) => {
        // An empty list is a true answer. It is rendered as the finding it is.
        const gap = s.document.querySelector('.ww-gap')
        assert.ok(gap, 'an empty registry rendered no finding at all')
        // In a sentence a reader can act on. This used to require a `⊘ NOT BUILT` badge and at
        // least one `<code>` naming a repository file — an audit rendered at a customer, which is
        // what that reader is. The provenance moved to `src/lib/worlds.ts`; what has to survive
        // here is that the emptiness is EXPLAINED rather than merely displayed.
        assert.match(s.textOf(gap), /administrator/i)
        assert.match(s.textOf(gap), /not finished loading/i)
        assert.equal(
          gap.querySelectorAll('code').length,
          0,
          'the finding prints a repository path at a customer again',
        )
        // And never a spinner, a skeleton or an empty state implying something is on its way.
        assert.equal(
          s.document.querySelector('[role="status"] .ww-spinner, .ww-skeleton'),
          null,
          'an answered request is still rendering a loading state',
        )
        assert.doesNotMatch(
          s.text(),
          /coming soon|on its way|check back/i,
          'the empty registry implies something is arriving. Nothing registers a title.',
        )
        s.clean('BJ-WLD-01')
      },
    )
  })

  it('BJ-WLD-01 ★ T2: a registry with titles renders one row per title in the response', async () => {
    const titles = [
      fx.title({ id: 't-1', name: 'Ninety Days After', slug: 'nda' }),
      fx.title({ id: 't-2', name: 'Emberkin', slug: 'emberkin', status: 'beta' }),
    ]
    await withScreen(
      page(h(PlatformPage), '/'),
      { url: `${ORIGIN}/`, routes: { 'GET /v1/titles': { body: { titles } } } },
      async (s) => {
        for (const t of titles) assert.ok(s.text().includes(t.name), `${t.name} has no row`)
        // And the empty-register finding is gone, because the register is no longer empty. Matched
        // on the aria-label this app actually sets — `*="registry"` matched nothing after the
        // heading was rewritten, so it passed without measuring anything.
        assert.equal(s.document.querySelector('.ww-gap[aria-label*="no titles in the register" i]'), null)
      },
    )
  })

  it('BJ-WLD-02 T1: the heading names the platform, and the register is read before the plumbing', async () => {
    await withScreen(
      page(h(PlatformPage), '/'),
      {
        url: `${ORIGIN}/`,
        // `emberkin`, not the fixture's default `ninety-days-after`: this scenario is about a game
        // a reader can REACH, and Ninety Days After is the one registered title with no client in
        // the estate to reach. Its own case — a registered game that renders nowhere — is
        // BJ-WLD-02b below.
        routes: {
          'GET /v1/titles': {
            body: { titles: [fx.title({ slug: 'emberkin', name: 'Emberkin' })] },
          },
        },
      },
      async (s) => {
        await s.settle(20)
        const h1 = s.allByRole('heading').find((el) => el.tagName === 'H1')
        assert.ok(h1)
        // UNCHANGED, AND THE HALF OF THE ORIGINAL ARGUMENT THAT SURVIVED. The platform is named
        // as the platform: a front page whose headline is a game says the platform IS that game,
        // which is the category error the registry exists to end.
        assert.doesNotMatch(
          s.textOf(h1),
          /ninety days after|emberkin/i,
          'the front page leads with a title rather than with the platform',
        )

        // ── AND THE HALF THAT WAS OVERRULED, RECORDED RATHER THAN DELETED ──────────────────
        //
        // This assertion used to be `owns < registry`: what the platform owns came first and the
        // register was a section beneath it. That was written when the register was EMPTY, so the
        // ordering cost nothing. With three titles registered the owner reported the consequence —
        // "we suppose to have 3 games but no one is visible or accessible on forge worlds" — and
        // the order is now the other way round. Somebody arriving at Forge Worlds is asking what
        // they can play; the six panels about entitlements and seasons answer a question they have
        // not asked yet.
        // The two headings were "The games on the platform" and "What it looks after". Both were
        // cut in the redesign — the shelf lost its four-sentence preamble and its panel chrome so
        // the first cover art starts within a screen of the top, and the six paragraphs became six
        // one-line facts. What this assertion is FOR survives the rename: the games come first.
        const registry = s.orderOf(/The games/)
        const owns = s.orderOf(/what the platform holds for you/i)
        assert.ok(registry > 0, 'there is no registry section')
        assert.ok(owns > 0, 'the platform no longer says what it owns')
        assert.ok(registry < owns, 'the register is below the platform panels again')

        // A REGISTERED TITLE MUST BE REACHABLE, which is the other half of the same report. The
        // fixture title is `emberkin` at `live`, and `lib/catalogue.ts` gives that slug a surface,
        // so the entry carries a link a person can follow and not only the platform's file on it.
        const play = s.allByRole('link').find((el) => /^play /i.test(s.textOf(el)))
        assert.ok(play, 'a live registered title offers no way into the game')
        assert.match(play.getAttribute('href') ?? '', /^https?:\/\//, 'the play link goes nowhere')
      },
    )
  })

  it('BJ-WLD-02b T1: a registered game with no client says so, and offers no Play button', async () => {
    await withScreen(
      page(h(PlatformPage), '/'),
      // The fixture's own default. `micro-nda` serves the whole game — worlds, tiles, homesteads,
      // the day-resolution engine — and nothing in the estate renders it, so `lib/catalogue.ts`
      // gives the slug `surface: null`.
      { url: `${ORIGIN}/`, routes: { 'GET /v1/titles': { body: { titles: [fx.title()] } } } },
      async (s) => {
        await s.settle(20)
        // The register still lists it. Invisibility was the reported defect; a game with no client
        // is not a game to hide.
        assert.ok(s.text().includes('Ninety Days After'), 'the title is missing from the register')
        // But no way in, because there is none. A Play button opening a 404 is worse than the
        // sentence beside it.
        const play = s.allByRole('link').find((el) => /^play /i.test(s.textOf(el)))
        assert.equal(play, undefined, 'a game with no client is offering a way into it')
        assert.match(
          s.text(),
          /no screen yet/i,
          'nothing on the page says why this game cannot be opened',
        )
      },
    )
  })

  it('BJ-WLD-03 ★ T1: a bound item has no sell control at all — not a disabled one', async () => {
    await withScreen(
      page(h(InventoryPage), '/inventory'),
      {
        url: `${ORIGIN}/inventory`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: true })] } },
        }),
      },
      async (s) => {
        await s.settle(20)
        assert.ok(s.text().includes('urn:cf:nda:item:lantern'), 'the item has no row')

        // No sell control, and no DISABLED sell control either. Both are asserted, because the
        // second is the one a well-meaning change introduces.
        const sell = s
          .allByRole('button')
          .filter((el) => /offer it to the market|withdraw the offer|list/i.test(s.textOf(el)))
        assert.deepEqual(
          sell.map((el) => `${s.textOf(el)}${el.hasAttribute('disabled') ? ' (disabled)' : ''}`),
          [],
          'a bound item was offered a sell control. A disabled button reads as "not yet, ask ' +
            'somebody", and this is never.',
        )
        // And the sentence in its place says so. This is the assertion — not that the sale would
        // be refused, which is worlds/src/players.ts’s test and is cited in ownedBy.
        assert.match(s.text(), /bound/i)
        assert.doesNotMatch(
          s.text(),
          /not yet|for now|currently cannot/i,
          'the sentence implies the item might become sellable',
        )
      },
    )
  })

  it('BJ-WLD-04 T1: an unbound item offers the control, described as what it is', async () => {
    await withScreen(
      page(h(InventoryPage), '/inventory'),
      {
        url: `${ORIGIN}/inventory`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: false })] } },
        }),
      },
      async (s) => {
        await s.settle(20)
        const sell = s
          .allByRole('button')
          .filter((el) => /put it up for sale/i.test(s.textOf(el)))
        assert.ok(sell.length > 0, 'an unbound item was offered no way to sell it')

        // 01-product-vision principle 6 runs the other way too: nothing here may describe an item
        // as an advantage.
        assert.doesNotMatch(
          s.text(),
          /\b(stronger|faster|more powerful|advantage over|beat other players|win more)\b/i,
          'an inventory row described an item as an advantage',
        )
      },
    )
  })

  it('BJ-WLD-05 ★ T1: an unsupported provision is UNDELIVERABLE, verbatim, with no retry', async () => {
    const said = 'Ninety Days After does not support private worlds.'
    await withScreen(
      page(h(EntitlementsPage), '/entitlements'),
      {
        url: `${ORIGIN}/entitlements`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/provisions': {
            body: {
              provisions: [
                fx.provision({
                  state: 'unsupported',
                  kind: 'private_world',
                  lastError: said,
                  provisionedUrn: null,
                  provisionedAt: null,
                  attempts: 1,
                }),
              ],
            },
          },
        }),
      },
      async (s) => {
        await s.settle(20)
        // The service's OWN sentence, verbatim — so this app and the service cannot drift.
        assert.ok(s.text().includes(said), 'the service’s sentence was paraphrased or dropped')
        // The word is UNDELIVERABLE rather than "failed": it is an ANSWER, and terminal.
        assert.match(s.text(), /UNDELIVERABLE/)
        assert.match(s.text(), /refund/i, 'a customer who paid for something undeliverable is not pointed at a refund')
        // And no retry control, not even a disabled one — the retry route demands admin and could
        // only 403. That refusal is worlds/src/server.ts’s test; this is the absence of the button.
        const retry = s.allByRole('button').filter((el) => /retry|try again/i.test(s.textOf(el)))
        assert.deepEqual(
          retry.map((el) => s.textOf(el)),
          [],
          'a retry control was offered on a route that demands admin and could only 403',
        )
      },
    )
  })

  it('BJ-WLD-06 T1: a null profile is a new player, not an error and not a spinner', async () => {
    await withScreen(
      page(h(PlayerPage), '/player'),
      {
        url: `${ORIGIN}/player`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me': { body: { profile: null, inventory: [], achievements: [] } },
        }),
      },
      async (s) => {
        await s.settle(20)
        assert.match(s.text(), /no Forge Worlds profile attached to it/i)
        assert.match(s.text(), /your CloudsForge account exists/i)
        // Not an error…
        assert.equal(
          s.document.querySelector('[role="alert"]'),
          null,
          'a new player was rendered as a failure',
        )
        // …and not a loading state.
        assert.doesNotMatch(s.text(), /loading|reading your/i, 'a settled answer is still loading')
      },
    )
  })

  it('BJ-WLD-07 T2: a title page renders anonymously, with no credential attached', async () => {
    await withScreen(
      atRoute('/titles/:id', h(TitlePage), `/titles/${fx.TITLE_ID}`),
      {
        url: `${ORIGIN}/titles/${fx.TITLE_ID}`,
        routes: {
          'GET /v1/titles': { body: { titles: [fx.title()] } },
          [`GET /v1/titles/${fx.TITLE_ID}/achievements`]: {
            body: {
              achievements: [
                {
                  id: 'ach-1',
                  titleId: fx.TITLE_ID,
                  key: 'first-light',
                  name: 'First light',
                  description: 'Arrive.',
                  points: 10,
                  // WEI, as a decimal STRING: `worlds/src/server.ts` calls `.toString()` on a
                  // bigint, and a JSON number cannot hold what a bigint can. 25 EMBER, so the
                  // assertion below is about a figure a reader would recognise rather than about
                  // twenty-five of the smallest unit there is.
                  rewardWei: '25000000000000000000',
                },
              ],
            },
          },
          [`GET /v1/titles/${fx.TITLE_ID}/seasons`]: { body: { seasons: [] } },
        },
      },
      async (s) => {
        await s.settle(20)
        assert.ok(s.text().includes('First light'), 'the achievements did not render')
        /*
          THE REWARD, AS A READER SEES IT, AND THE CURRENCY IT IS IN.

          This journey mounted the page and asserted the achievement's NAME. That passed for eight
          months over a payout clause rendering "· pays  Shards out of the season's budget" — the
          amount blank, because the fixture and the page agreed on a field name (`rewardShards`)
          that `micro-worlds` had stopped sending. Asserting the name of a row says nothing about
          the money on it, so the money is asserted here: the figure at the exponent the wire uses,
          and the absence of the retired word.
        */
        assert.ok(s.text().includes('25 EMBER'), 'the reward figure is not on the page')
        assert.doesNotMatch(s.text(), /shard/i, 'a retired currency is named on the title page')
        // Both routes are public. Sending a credential to a route that does not read one is the
        // defect; not sending it is the assertion.
        for (const w of s.api.wire) {
          assert.equal(w.headers.authorization, undefined, `${w.path} carried a credential`)
        }
        assert.doesNotMatch(s.text(), /sign in to see/i, 'a public title page asks for a session')
      },
    )
  })
})

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   6.19 Group S — the adversarial matrix
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('BJ-ADV — the adversarial matrix', () => {
  it('BJ-ADV-09-H1 T1: double-submitting a listing produces one listing', async () => {
    await withScreen(
      page(h(InventoryPage), '/inventory'),
      {
        url: `${ORIGIN}/inventory`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: false })] } },
          [`POST /v1/players/me/inventory/${fx.ITEM_ID}/list`]: {
            status: 200,
            body: { item: fx.item({ listedAt: '2026-08-03T09:00:00.000Z', listingUrn: 'urn:cf:market:1' }) },
            delayMs: 15,
          },
        }),
      },
      async (s) => {
        await s.settle(20)
        const urn = s.allByRole('textbox')[0]
        if (urn) await s.type(urn, 'urn:cf:market:listing:1')
        const list = s.allByRole('button').find((el) => /put it up for sale/i.test(s.textOf(el)))
        assert.ok(list, 'no listing control')
        s.clickNoFlush(list)
        // THIS AWAIT IS LOAD-BEARING, AND IT IS ALSO THIS SCENARIO'S LIMIT. It lets the render
        // commit, which is what puts `disabled` on the node — so what is asserted below is the
        // AFFORDANCE, and the second press is stopped by the attribute rather than by the hook.
        // The same-tick case, where nothing has re-rendered between the two events and the
        // attribute cannot help, is `test/double-submit.test.ts`. This scenario passed while that
        // one failed; do not read it as covering the guard.
        await s.settle(0)
        assert.ok(
          list.hasAttribute('disabled'),
          'the listing control stayed live while its own request was in flight',
        )
        s.clickNoFlush(list)
        await s.settle(60)
        assert.equal(
          s.api.matching(`POST /v1/players/me/inventory/${fx.ITEM_ID}/list`).length,
          1,
          'two presses sent two listings',
        )
      },
    )
  })

  it('BJ-ADV-09-H4 T1: a failed listing states the failure and leaves the row rendered', async () => {
    await withScreen(
      page(h(InventoryPage), '/inventory'),
      {
        url: `${ORIGIN}/inventory`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: false })] } },
          [`POST /v1/players/me/inventory/${fx.ITEM_ID}/list`]: {
            status: 409,
            body: fx.error('already_listed', 'this item is already on the market'),
            requestId: 'req-list-409',
          },
        }),
      },
      async (s) => {
        await s.settle(20)
        const urn = s.allByRole('textbox')[0]
        if (urn) await s.type(urn, 'urn:cf:market:listing:1')
        const list = s.allByRole('button').find((el) => /put it up for sale/i.test(s.textOf(el)))
        assert.ok(list, 'no listing control')
        await s.click(list)
        await s.settle(30)
        assert.match(s.text(), /already on the market/i)
        assert.match(s.text(), /req-list-409/, 'no request id to quote')
        // The row survives its own failed write.
        assert.ok(s.text().includes('urn:cf:nda:item:lantern'), 'a failed listing blanked the row')
      },
    )
  })

  it('BJ-ADV-22 ★ T1: the page paints while its read is slow', async () => {
    await withScreen(
      page(h(PlatformPage), '/'),
      {
        url: `${ORIGIN}/`,
        routes: { 'GET /v1/titles': { body: { titles: [fx.title()] }, delayMs: 40 } },
      },
      async (s) => {
        // The platform half of the page does not wait on the registry read.
        assert.ok(s.text().length > 40, 'the page did not paint while its read was in flight')
        await s.settle(80)
        assert.ok(s.text().includes('Ninety Days After'), 'the slow read never landed')
      },
    )
  })

  it('BJ-ADV-23 ★ T1: every failure state offers a request id', async () => {
    const cases: ReadonlyArray<{ name: string; el: () => ReactElement; url: string; routes: Routes }> = [
      {
        name: 'the registry read',
        el: () => page(h(PlatformPage), '/'),
        url: `${ORIGIN}/`,
        routes: {
          'GET /v1/titles': { status: 500, body: fx.error('internal', 'it broke'), requestId: 'req-a' },
        },
      },
      {
        name: 'the inventory read',
        el: () => page(h(InventoryPage), '/inventory'),
        url: `${ORIGIN}/inventory`,
        routes: signedIn({
          'GET /v1/players/me/inventory': {
            status: 500,
            body: fx.error('internal', 'it broke'),
            requestId: 'req-b',
          },
        }),
      },
      {
        name: 'the entitlements read',
        el: () => page(h(EntitlementsPage), '/entitlements'),
        url: `${ORIGIN}/entitlements`,
        routes: signedIn({
          'GET /v1/provisions': {
            status: 500,
            body: fx.error('internal', 'it broke'),
            requestId: 'req-c',
          },
        }),
      },
    ]
    for (const c of cases) {
      await withScreen(c.el(), { url: c.url, storage: fx.SIGNED_IN, routes: c.routes }, async (s) => {
        await s.settle(20)
        assert.match(s.text(), /req-[abc]/, `${c.name} failed without the request id to quote`)
      })
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   6.20 Group T — accessibility
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('BJ-A11Y — accessibility', () => {
  it('BJ-A11Y-03 ★ T1: a failure is announced and is not colour-only', async () => {
    await withScreen(
      page(h(InventoryPage), '/inventory'),
      {
        url: `${ORIGIN}/inventory`,
        storage: fx.SIGNED_IN,
        routes: signedIn({
          'GET /v1/players/me/inventory': {
            status: 500,
            body: fx.error('internal', 'the inventory did not answer'),
            requestId: 'req-a11y',
          },
        }),
      },
      async (s) => {
        await s.settle(20)
        const alert = s.document.querySelector('[role="alert"]')
        assert.ok(alert, 'the failure is not a live region, so it is never announced')
        assert.ok(s.textOf(alert).length > 20, 'the failure has no sentence in it')
      },
    )
  })

  it('BJ-A11Y-10 T1: every state badge carries a word', async () => {
    await withScreen(
      page(h(PlatformPage), '/'),
      { url: `${ORIGIN}/`, routes: { 'GET /v1/titles': { body: { titles: [fx.title()] } } } },
      async (s) => {
        const badges = [...s.document.querySelectorAll('[class*="badge" i], [class*="ww-note" i]')]
        assert.ok(badges.length > 0, 'the page renders no state badges at all')
        for (const badge of badges) {
          if (badge.getAttribute('aria-hidden') === 'true') continue
          assert.ok(
            s.textOf(badge).length > 0,
            `a badge rendered with no text: ${badge.outerHTML.slice(0, 120)}`,
          )
        }
      },
    )
  })

  it('BJ-A11Y-12 T1: one main landmark, a reachable skip link, no skipped heading level', async () => {
    await withScreen(
      h(App),
      { url: `${ORIGIN}/`, routes: { 'GET /v1/titles': { body: { titles: [fx.title()] } } } },
      async (s) => {
        await s.settle(20)
        assert.equal(s.allByRole('main').length, 1)
        const skip = s.document.querySelector('a[href^="#"]')
        assert.ok(skip, 'no skip link')
        assert.ok(s.document.getElementById((skip.getAttribute('href') ?? '#').slice(1)))
        assert.equal(s.tabbables()[0], skip, 'the skip link is not first in the tab order')

        const levels = s.allByRole('heading').map((el) => Number(el.tagName.slice(1)))
        assert.equal(levels.filter((l) => l === 1).length, 1, 'a page has exactly one h1')
        let previous = 0
        for (const level of levels) {
          assert.ok(previous === 0 || level <= previous + 1, `heading order skips h${previous} → h${level}`)
          previous = level
        }
      },
    )
  })
})

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   5.1 — the universal per-surface property
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('BJ-WORLDS-404 — an unowned address answers 404', () => {
  const directives = readFileSync(at('nginx.conf'), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')

  it('BJ-WORLDS-404 T2: nginx serves the shell through error_page 404, never try_files', () => {
    assert.match(directives, /error_page\s+404\s+\/index\.html/)
    assert.doesNotMatch(directives, /try_files\s+\$uri\s+(\$uri\/\s+)?\/index\.html/)
  })

  it('BJ-WORLDS-404 T2: the not-found screen renders inside the shell', async () => {
    await withScreen(h(App), { url: `${ORIGIN}/nothing-here`, routes: {} }, async (s) => {
      assert.match(s.text(), /not found|nothing at this address|no page|does not exist/i)
      // And it says the STATUS was a 404 rather than a 200, which is nginx's doing and the whole
      // reason this repository enumerates its routes by hand.
      assert.match(s.text(), /404 rather than a 200/i)
      assert.ok(s.allByRole('link').length > 0, 'the not-found screen strands the reader')
      assert.ok(!ROUTES.map((r) => r.path).includes('nothing-here'))
    })
  })
})

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   The meta-test. Doc 22 §3.2.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('the catalogue and this file agree', () => {
  it('every id doc 22 assigns to this surface is accounted for exactly once', () => {
    const ids = SCENARIOS.map((s) => s.id)
    assert.deepEqual([...new Set(ids)].sort(), [...ids].sort(), 'an id appears twice')
    assert.deepEqual([...ids].sort(), [...DOC22_IDS].sort())
  })

  it('a scenario whose outcome depends on a server rule carries an ownedBy path', () => {
    const REFUSAL = /\b(refus|denie|denial|reject|bound|undeliverable|403|409|4xx)\w*/i
    for (const s of SCENARIOS) {
      if (s.blocked) continue
      if (!REFUSAL.test(s.what)) continue
      assert.ok(
        s.ownedBy,
        `${s.id} turns on a server-side refusal and names no test that owns it. Doc 22 §3.2.`,
      )
      assert.match(s.ownedBy.path, /^[a-z-]+\/src\/[\w./-]+\.ts$/)
    }
  })

  it('no scenario is marked implemented without a test named for it', () => {
    const source = readFileSync(at('test/journeys.test.ts'), 'utf8')
    for (const s of SCENARIOS) {
      if (s.blocked) continue
      assert.ok(
        new RegExp(`it\\('${s.id}[ ★]`).test(source),
        `${s.id} is in the catalogue as implemented and has no test named for it`,
      )
    }
  })

  it('every blocked scenario names its blocker and no blocker is a shrug', () => {
    for (const s of SCENARIOS) {
      if (!s.blocked) continue
      assert.ok(s.blocked.length > 60, `${s.id}'s blocker is too short to be a reason`)
      assert.ok(
        /doc 22|§|does not exist|no UI|tier 3|micro-beacon|not installed/i.test(s.blocked),
        `${s.id}'s blocker does not name a fact about the estate: ${s.blocked}`,
      )
    }
  })

  it('nothing here is tier 3 and implemented — tier 3 lives in micro-beacon', () => {
    for (const s of SCENARIOS) {
      if (s.tier !== 'T3') continue
      assert.ok(s.blocked, `${s.id} is tier 3 and not blocked; doc 22 §4 puts tier 3 in beacon`)
    }
  })
})
