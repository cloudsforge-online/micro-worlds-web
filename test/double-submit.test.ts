/**
 * Two events in one tick, against every write this app makes.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS WHEN `journeys.test.ts` ALREADY HAS A DOUBLE-SUBMIT SCENARIO
 *
 * `test/journeys.test.ts` presses the listing control twice and asserts one request. It
 * passed against a hook that could not stop a double submit, and it passed for one reason: there
 * is an `await s.settle(0)` BETWEEN the two presses.
 *
 * That await is the whole difference. It lets React re-render, which commits `disabled` onto the
 * DOM node and puts the new `busy` into the next render's closure — so the second press is stopped
 * by the ATTRIBUTE, and the hook's own guard is never asked a question it could get wrong. The
 * scenario is a true and useful statement about the disabled affordance. It is not a statement
 * about the guard, and it cannot fail when the guard is broken.
 *
 * The real shape is two events dispatched in the SAME TICK: a double click, an impatient user, a
 * trackpad that reports one press twice. Nothing has re-rendered between them. Both handlers run
 * before any render commits, both read `busy === false` out of their own render closure, and both
 * proceed. `disabled` cannot help either — the attribute is not on the node until the render
 * commits, and no render has committed.
 *
 * So every proof below dispatches both events with NO await between them. That is the only
 * arrangement in which the guard is the thing under test.
 *
 * ── Run twice, because a ref is exactly what StrictMode can change ────────────────────────────
 *
 * `src/main.tsx` mounts under `<StrictMode>` and this harness does not. StrictMode double-invokes
 * render and re-runs effects, and the fix for the defect above is a REF — the one guard whose
 * behaviour that could plausibly disturb. A sibling surface's mutation run recorded the hole by
 * name: "a StrictMode ref never exercised". `both()` therefore runs each proof in both mounts, and
 * names which one failed.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement as h, type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { withScreen, type Routes, type Screen } from './dom.ts'
import * as fx from './fixtures.ts'
import { AuthProvider } from '../src/lib/auth.tsx'
import { InventoryPage } from '../src/pages/inventory.tsx'
import { PlayerPage } from '../src/pages/player.tsx'

const ORIGIN = 'https://worlds.cloudsforge.online'

const page = (element: ReactElement, path: string): ReactElement =>
  h(MemoryRouter, { initialEntries: [path] }, h(AuthProvider, null, element) as ReactElement)

const signedIn = (routes: Routes): Routes => ({ 'GET /auth/me': { body: fx.ME }, ...routes })

/** Run one proof in the relaxed mount and again under StrictMode, saying which one failed. */
async function both(
  element: ReactElement,
  routes: Routes,
  url: string,
  body: (screen: Screen) => Promise<void>,
): Promise<void> {
  for (const strict of [false, true]) {
    try {
      await withScreen(element, { url, storage: fx.SIGNED_IN, routes, strict }, body)
    } catch (err) {
      const where = strict ? 'under <StrictMode>, as src/main.tsx really mounts' : 'without StrictMode'
      throw new Error(`${where}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

const LIST = `POST /v1/players/me/inventory/${fx.ITEM_ID}/list`
const UNLIST = `DELETE /v1/players/me/inventory/${fx.ITEM_ID}/list`

describe('two events in one tick — the guard, not the disabled attribute', () => {
  /*
   * THE MONEY ONE. `POST /v1/players/me/inventory/:id/list` puts a player's item on the market.
   *
   * A second call does NOT create a second listing — the service's UPDATE carries
   * `and listed_at is null` (`worlds/src/players.ts`), so the second one matches no row, reads
   * it back, and throws `InventoryError('this item is already listed')`
   * (`worlds/src/players.ts`), which the route turns into a 409 `inventory_state`
   * (`worlds/src/server.ts`).
   *
   * That is the finding, and it is worse than a duplicate would be: the listing SUCCEEDED, and the
   * second response makes this app render "Item … was not listed" over the top of it. The component
   * lies about the outcome of the user's own action, and the user withdraws a listing that was
   * doing exactly what they asked.
   */
  it('offering an item to the market sends ONE listing', async () => {
    await both(
      page(h(InventoryPage), '/inventory'),
      signedIn({
        'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: false })] } },
        [LIST]: (_w, n) =>
          n === 1
            ? {
                status: 201,
                body: { item: fx.item({ listedAt: '2026-08-03T09:00:00.000Z', listingUrn: 'urn:cf:market:1' }) },
                delayMs: 15,
              }
            : // The second call is answered the way the service really answers it, so a test that
              // stopped catching the duplicate would still have to explain the 409.
              { status: 409, body: fx.error('inventory_state', 'this item is already listed') },
      }),
      `${ORIGIN}/inventory`,
      async (s) => {
        await s.settle(20)
        const urn = s.allByRole('textbox')[0]
        assert.ok(urn, 'no listing-reference field')
        await s.type(urn, 'urn:cf:market:listing:1')
        const offer = s.byRole('button', 'Put it up for sale')

        s.clickNoFlush(offer)
        s.clickNoFlush(offer)
        await s.settle(60)

        assert.equal(
          s.api.matching(LIST).length,
          1,
          'a double click listed the same item twice: the second request is refused 409 by ' +
            'worlds/src/players.ts, so the player is told their listing failed while it is ' +
            'live on the market, and withdraws an offer that was working',
        )
      },
    )
  })

  /*
   * THE OTHER HALF OF THE LATCH: it must be RELEASED, and released on the failure path too.
   *
   * A latch is only a guard while it comes off. Released anywhere but a `finally` and a write that
   * throws leaves it set for the life of the component — so the control is wedged shut, silently,
   * and the failure path is exactly the one a user retries from. That trades a double submit for a
   * screen that has stopped working, which is the worse of the two.
   */
  it('a listing that failed can be tried again — the latch comes off on the error path', async () => {
    await both(
      page(h(InventoryPage), '/inventory'),
      signedIn({
        'GET /v1/players/me/inventory': { body: { items: [fx.item({ bound: false })] } },
        [LIST]: (_w, n) =>
          n === 1
            ? { status: 503, body: fx.error('unavailable', 'the market is unreachable') }
            : {
                status: 201,
                body: { item: fx.item({ listedAt: '2026-08-03T09:00:00.000Z', listingUrn: 'urn:cf:market:1' }) },
              },
      }),
      `${ORIGIN}/inventory`,
      async (s) => {
        await s.settle(20)
        const urn = s.allByRole('textbox')[0]
        assert.ok(urn, 'no listing-reference field')
        await s.type(urn, 'urn:cf:market:listing:1')

        await s.click(s.byRole('button', 'Put it up for sale'))
        await s.settle(20)
        assert.equal(s.api.matching(LIST).length, 1, 'the first attempt was not sent')

        // Same control, second press, after the failure has been rendered.
        await s.click(s.byRole('button', 'Put it up for sale'))
        await s.settle(20)
        assert.equal(
          s.api.matching(LIST).length,
          2,
          'the retry never left the browser: the latch was not released when the write threw, so ' +
            'the control is wedged shut and the player cannot list the item at all',
        )
      },
    )
  })

  /*
   * `DELETE .../list` is NOT idempotent, whatever the method implies. `unlist` updates
   * `where ... and listed_at is not null` (`worlds/src/players.ts`) and returns null when
   * nothing matched, and the route turns that null into a 404 (`worlds/src/server.ts`). So the
   * second withdrawal of a successful withdrawal is an error on screen.
   */
  it('withdrawing an offer sends ONE withdrawal', async () => {
    await both(
      page(h(InventoryPage), '/inventory'),
      signedIn({
        'GET /v1/players/me/inventory': {
          body: {
            items: [fx.item({ listedAt: '2026-08-01T09:00:00.000Z', listingUrn: 'urn:cf:market:1' })],
          },
        },
        [UNLIST]: (_w, n) =>
          n === 1
            ? { status: 200, body: { item: fx.item() }, delayMs: 15 }
            : { status: 404, body: fx.error('not_found', 'no such listing') },
      }),
      `${ORIGIN}/inventory`,
      async (s) => {
        await s.settle(20)
        const withdraw = s.byRole('button', 'Take it off sale')

        s.clickNoFlush(withdraw)
        s.clickNoFlush(withdraw)
        await s.settle(60)

        assert.equal(
          s.api.matching(UNLIST).length,
          1,
          'a double click sent two withdrawals: the second is a 404 from ' +
            'worlds/src/server.ts, so the player is told the withdrawal failed when it succeeded',
        )
      },
    )
  })

  /*
   * `PUT /v1/players/me` is an upsert (`on conflict (user_id) do update set`,
   * `worlds/src/players.ts`), so a duplicate writes the same document twice and is harmless.
   * The guard here is a nicety rather than a repair — but it is the SAME hook, so if this one can
   * send twice then so can the listing, and this is the cheapest place to see it.
   */
  it('saving the profile sends ONE write', async () => {
    await both(
      page(h(PlayerPage), '/player'),
      signedIn({
        'GET /v1/players/me': { body: fx.snapshot() },
        'PUT /v1/players/me': {
          status: 200,
          body: { profile: fx.snapshot().profile },
          delayMs: 15,
        },
      }),
      `${ORIGIN}/player`,
      async (s) => {
        await s.settle(20)
        const save = s.byRole('button', 'Save')

        s.clickNoFlush(save)
        s.clickNoFlush(save)
        await s.settle(60)

        assert.equal(
          s.api.matching('PUT /v1/players/me').filter((w) => w.path === '/v1/players/me').length,
          1,
          'a double click sent the profile twice',
        )
      },
    )
  })

  /*
   * `PUT /v1/players/me/cosmetics` clearing a slot: the handler skips the entitlement check for a
   * null urn (`worlds/src/server.ts`) and the write is a read-modify-write inside one
   * transaction (`worlds/src/players.ts`), so clearing an already-clear slot is harmless.
   * Same hook, so the same proof is owed.
   */
  it('taking a cosmetic off sends ONE write', async () => {
    const worn = fx.snapshot()
    const dressed = {
      ...worn,
      profile: { ...worn.profile!, equippedCosmetics: { '*': { head_frame: 'urn:cf:cosmetic:1' } } },
    }
    await both(
      page(h(PlayerPage), '/player'),
      signedIn({
        'GET /v1/players/me': { body: dressed },
        'PUT /v1/players/me/cosmetics': {
          status: 200,
          body: { profile: worn.profile },
          delayMs: 15,
        },
      }),
      `${ORIGIN}/player`,
      async (s) => {
        await s.settle(20)
        const off = s.byRole('button', 'Take it off')

        s.clickNoFlush(off)
        s.clickNoFlush(off)
        await s.settle(60)

        assert.equal(
          s.api.matching('PUT /v1/players/me/cosmetics').length,
          1,
          'a double click cleared the same slot twice',
        )
      },
    )
  })
})

/*
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE AFFORDANCE, WHICH IS A SEPARATE CLAIM FROM THE GUARD
 *
 * The ref stops the second request. It does not tell anybody it stopped it. A control that swallows
 * a press in silence reads as a control that did nothing, and the reader presses it again — so
 * `disabled` is not redundant with the latch, it is the half of the answer the user can see.
 *
 * These are asserted separately because a mutation run found them unasserted: dropping `disabled`
 * from three of the four buttons changed nothing in the suite. Only the listing control was covered
 * (`journeys.test.ts`).
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
describe('the disabled affordance — what the user can see while a write is in flight', () => {
  it('the withdraw control is disabled while its own request is in flight', async () => {
    await both(
      page(h(InventoryPage), '/inventory'),
      signedIn({
        'GET /v1/players/me/inventory': {
          body: {
            items: [fx.item({ listedAt: '2026-08-01T09:00:00.000Z', listingUrn: 'urn:cf:market:1' })],
          },
        },
        [UNLIST]: { status: 200, body: { item: fx.item() }, delayMs: 30 },
      }),
      `${ORIGIN}/inventory`,
      async (s) => {
        await s.settle(20)
        const withdraw = s.byRole('button', 'Take it off sale')
        s.clickNoFlush(withdraw)
        await s.settle(0)
        assert.ok(
          withdraw.hasAttribute('disabled'),
          'the withdraw control stayed live while its own request was in flight',
        )
        await s.settle(60)
      },
    )
  })

  it('the profile save control is disabled while its own request is in flight', async () => {
    await both(
      page(h(PlayerPage), '/player'),
      signedIn({
        'GET /v1/players/me': { body: fx.snapshot() },
        'PUT /v1/players/me': { status: 200, body: { profile: fx.snapshot().profile }, delayMs: 30 },
      }),
      `${ORIGIN}/player`,
      async (s) => {
        await s.settle(20)
        const save = s.byRole('button', 'Save')
        s.clickNoFlush(save)
        await s.settle(0)
        assert.ok(
          save.hasAttribute('disabled'),
          'the save control stayed live while its own request was in flight',
        )
        await s.settle(60)
      },
    )
  })

  it('the take-off control is disabled while its own request is in flight', async () => {
    const worn = fx.snapshot()
    const dressed = {
      ...worn,
      profile: { ...worn.profile!, equippedCosmetics: { '*': { head_frame: 'urn:cf:cosmetic:1' } } },
    }
    await both(
      page(h(PlayerPage), '/player'),
      signedIn({
        'GET /v1/players/me': { body: dressed },
        'PUT /v1/players/me/cosmetics': { status: 200, body: { profile: worn.profile }, delayMs: 30 },
      }),
      `${ORIGIN}/player`,
      async (s) => {
        await s.settle(20)
        const off = s.byRole('button', 'Take it off')
        s.clickNoFlush(off)
        await s.settle(0)
        assert.ok(
          off.hasAttribute('disabled'),
          'the take-off control stayed live while its own request was in flight',
        )
        await s.settle(60)
      },
    )
  })
})

/*
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * AND A CHECK ON THE CHECK: `strict: true` MUST REALLY MOUNT UNDER StrictMode
 *
 * Every proof above runs twice and claims one of the runs is the mount `src/main.tsx` really uses.
 * If `strict` were quietly ignored, all of that would be decoration — the suite would stay green
 * and the second run would prove nothing, which is precisely the "guards reported working against
 * a suite that never exercised them" failure this work exists to avoid.
 *
 * StrictMode's observable signature is that it double-invokes the render function. So: a component
 * that counts its own render calls, mounted both ways, must count more under `strict`.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
describe('the harness option itself', () => {
  it('strict: true really double-invokes render, so the runs above are not decoration', async () => {
    const renders: number[] = []
    for (const strict of [false, true]) {
      let n = 0
      const Counter = () => {
        n += 1
        return h('p', null, 'A paragraph long enough to satisfy the forty-character mount assertion.')
      }
      await withScreen(h(Counter), { url: `${ORIGIN}/`, strict }, async () => {
        renders.push(n)
      })
    }
    const [relaxed, underStrict] = renders as [number, number]
    assert.ok(
      underStrict > relaxed,
      `strict: true is not wrapping anything — render ran ${underStrict} time(s) under it and ` +
        `${relaxed} without, so every "under StrictMode" run in this file is the relaxed run again`,
    )
  })
})
