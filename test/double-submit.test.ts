/**
 * Two events in one tick, against every write this app makes.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS WHEN `journeys.test.ts` ALREADY HAS A DOUBLE-SUBMIT SCENARIO
 *
 * `test/journeys.test.ts:336-343` presses the listing control twice and asserts one request. It
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
   * `and listed_at is null` (`worlds/src/players.ts:423`), so the second one matches no row, reads
   * it back, and throws `InventoryError('this item is already listed')`
   * (`worlds/src/players.ts:442`), which the route turns into a 409 `inventory_state`
   * (`worlds/src/server.ts:332-333`).
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
        const offer = s.byRole('button', 'Offer it to the market')

        s.clickNoFlush(offer)
        s.clickNoFlush(offer)
        await s.settle(60)

        assert.equal(
          s.api.matching(LIST).length,
          1,
          'a double click listed the same item twice: the second request is refused 409 by ' +
            'worlds/src/players.ts:442, so the player is told their listing failed while it is ' +
            'live on the market, and withdraws an offer that was working',
        )
      },
    )
  })

  /*
   * `DELETE .../list` is NOT idempotent, whatever the method implies. `unlist` updates
   * `where ... and listed_at is not null` (`worlds/src/players.ts:467`) and returns null when
   * nothing matched, and the route turns that null into a 404 (`worlds/src/server.ts:675`). So the
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
        const withdraw = s.byRole('button', 'Withdraw the offer')

        s.clickNoFlush(withdraw)
        s.clickNoFlush(withdraw)
        await s.settle(60)

        assert.equal(
          s.api.matching(UNLIST).length,
          1,
          'a double click sent two withdrawals: the second is a 404 from ' +
            'worlds/src/server.ts:675, so the player is told the withdrawal failed when it succeeded',
        )
      },
    )
  })

  /*
   * `PUT /v1/players/me` is an upsert (`on conflict (user_id) do update set`,
   * `worlds/src/players.ts:127`), so a duplicate writes the same document twice and is harmless.
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
   * null urn (`worlds/src/server.ts:585-590`) and the write is a read-modify-write inside one
   * transaction (`worlds/src/players.ts:168-194`), so clearing an already-clear slot is harmless.
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
        const off = s.byRole('button', 'Take off')

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
