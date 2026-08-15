/**
 * Running one write, and being honest about the three ways it can end.
 *
 * `useResource` covers reads. A write needs different answers: it is not running until somebody
 * asks, only one may be in flight at a time, and its failure belongs beside the control that
 * caused it rather than in place of the page.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE FOUR WRITES THIS APP MAKES, AND WHAT A SECOND ONE ACTUALLY DOES
 *
 * This file arrived as a verbatim copy from another surface, doc comment included, and that comment
 * described `POST /v1/tokens/:id/pay` and `POST /v1/tokens/:id/deploy` on `mint`. **This app calls
 * neither, and `worlds` serves neither.** Every claim below was re-read out of `worlds/src/` rather
 * than carried forward.
 *
 *   | Write                                     | Client            | A DUPLICATE DOES            |
 *   | ----------------------------------------- | ----------------- | --------------------------- |
 *   | `PUT /v1/players/me`                      | `putProfile`      | nothing — upsert            |
 *   | `PUT /v1/players/me/cosmetics`            | `equipCosmetic`   | nothing — same slot, again  |
 *   | `POST /v1/players/me/inventory/:id/list`  | `listForSale`     | **409, over a success**     |
 *   | `DELETE /v1/players/me/inventory/:id/list`| `unlist`          | **404, over a success**     |
 *
 * **No `worlds` route reads an `Idempotency-Key`.** There is no `withIdempotentRoute` wrapper and
 * no such header read anywhere in `worlds/src/server.ts`; the `idempotency` matches in that package
 * are the title conformance suite (`worlds/src/conformance.ts`), the provisioning bridge where
 * the entitlement id IS the key and never passes through a browser (`worlds/src/jobs.ts`,
 * `worlds/src/titleclient.ts`), and the keys `worlds` sends DOWNSTREAM
 * (`worlds/src/outbox.ts`). So this client sends none, and `test/worlds.test.ts` asserts the
 * service still reads none. There is no header that can make a second click safe here.
 *
 * ── THAT IS ABOUT `worlds`, AND THIS BUNDLE NOW TALKS TO A SECOND SERVICE ─────────────────────
 *
 * `src/lib/nda.ts` reaches `micro-nda` for *Ninety Days After*, and nda is the opposite case: all
 * fifteen of its writes are wrapped in `defineMutation(..., 'header', ...)` and answer **400**
 * without an `Idempotency-Key`. Every one of those calls therefore sends one, and the key names
 * the DECISION rather than the page view, because nda 409s a key reused with a different body.
 *
 * The latch below still matters for both, and for the same reason: it is what stops two events in
 * one tick becoming two requests. But "this client sends no idempotency key" is a fact about the
 * `worlds` half of this bundle only — read `src/lib/nda.ts` before restating it about the other.
 *
 * ── The two PUTs are idempotent by method, and really are ──────────────────────────────────────
 *
 * `putProfile` is a full replace ending in `on conflict (user_id) do update set`
 * (`worlds/src/players.ts`). `equipCosmetic` reads, modifies and writes the wardrobe inside one
 * transaction (`worlds/src/players.ts`) and setting a slot to the value it already holds is
 * a no-op. A duplicate of either is harmless. The guard on those is a nicety.
 *
 * ── The two inventory writes are where a second request DOES damage ───────────────────────────
 *
 * Neither creates a duplicate. Both REFUSE — and the refusal is the defect, because it is delivered
 * to somebody whose action SUCCEEDED.
 *
 *   * `listForSale` updates `where ... and listed_at is null and bound = false`
 *     (`worlds/src/players.ts`). A second concurrent call matches no row, reads the row back
 *     to say which of three reasons it was, and throws `InventoryError('this item is already
 *     listed')` (`worlds/src/players.ts`) — a 409 `inventory_state`
 *     (`worlds/src/server.ts`). So no second listing is created; instead the player is shown
 *     "Item … was not listed" while their item is live on the market. They then withdraw an offer
 *     that was doing exactly what they asked.
 *
 *   * `unlist` updates `where ... and listed_at is not null` and returns null when nothing matched
 *     (`worlds/src/players.ts`); the route turns that null into a 404
 *     (`worlds/src/server.ts`). DELETE being idempotent by convention does not make THIS delete
 *     idempotent: the second one is an error on screen over a withdrawal that worked.
 *
 * A component that reports failure for an action that succeeded is worse than one that reports a
 * duplicate, because the reader's correct response to it is to undo the thing they wanted. Not
 * sending the second request is therefore the whole repair, and it has to happen in this hook —
 * there is no server-side state machine underneath that can absorb it, only one that will complain.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── THE LATCH IS A REF, AND THE STATE IS ONLY THE AFFORDANCE ──────────────────────────────────
 *
 * There was a comment here that defended reading `busy` out of state, and it argued: "React batches
 * the `setBusy(true)` below before the next click can be processed, and a ref here would make this
 * hook's behaviour depend on scheduling rather than on state anybody can see."
 *
 * **That is exactly backwards, and it was the bug.** `setBusy(true)` only SCHEDULES a render. Two
 * clicks dispatched in the same tick — a double click, an impatient press, a trackpad reporting one
 * press twice — both run their handlers before any render commits. Each reads `busy` out of the
 * render closure it was created in, which is still `false`, and each proceeds. `disabled={busy}` has
 * precisely the same hole for precisely the same reason: the attribute is not on the DOM node until
 * the render commits, and no render has committed.
 *
 * Reading a ref is not "depending on scheduling" — it is refusing to. A ref is the only value in
 * React that a second event in the same tick can observe, because it is the only one written
 * synchronously. So the latch is taken BEFORE the first `await` and released in a `finally`, and it
 * is the correctness guarantee. `busy` stays as state because a human needs to see that something
 * is happening, and the `disabled` attributes stay because a control that ignores a press without
 * saying so is its own defect. State is the affordance; the ref is the guard.
 *
 * `test/double-submit.test.ts` dispatches both events with no await between them — the only
 * arrangement in which the guard is the thing under test — and runs each proof under `<StrictMode>`
 * as well, because `src/main.tsx` mounts that way and a ref is the one guard StrictMode's
 * double-invocation could plausibly disturb.
 */
import { useCallback, useRef, useState } from 'react'
import { noticeFor, type ErrorNotice } from './api.ts'

export interface Mutation<A extends unknown[], T> {
  readonly busy: boolean
  readonly error: ErrorNotice | null
  /** The last successful result, kept so a 202 acceptance can be rendered after the fact. */
  readonly result: T | null
  readonly run: (...args: A) => Promise<T | null>
  readonly reset: () => void
}

export function useMutation<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  fallbackMessage: string,
): Mutation<A, T> {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ErrorNotice | null>(null)
  const [result, setResult] = useState<T | null>(null)
  /**
   * The latch. Not a mirror of `busy` — the guard itself.
   *
   * A ref is the only value a second event in the SAME TICK can observe, because it is the only one
   * written synchronously. `busy` is a render away and so is `disabled`; see the file header.
   */
  const inFlight = useRef(false)

  const run = useCallback(
    async (...args: A): Promise<T | null> => {
      // Taken before the first `await`, so nothing can interleave between the read and the write.
      if (inFlight.current) return null
      inFlight.current = true
      setBusy(true)
      setError(null)
      try {
        const value = await fn(...args)
        setResult(value)
        return value
      } catch (err) {
        setError(noticeFor(err, fallbackMessage))
        return null
      } finally {
        // In `finally`, so a throw releases it too. A latch that leaked on the failure path would
        // wedge the control shut for the rest of the page's life, which is a worse failure than the
        // one it exists to prevent — and the failure path is the one a user retries from.
        inFlight.current = false
        setBusy(false)
      }
    },
    // `busy` is deliberately NOT a dependency any more: it is the affordance, not the guard, and
    // keeping it here rebuilt `run` on every transition for no benefit.
    [fn, fallbackMessage],
  )

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { busy, error, result, run, reset }
}
