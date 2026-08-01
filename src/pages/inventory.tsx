/**
 * Everything the account owns, and what may leave it.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * `bound` IS THE ANTI-PAY-TO-WIN CONTROL, AND THIS SCREEN RENDERS IT AS ONE.
 *
 * `worlds/src/players.ts:390-391`, quoting 04-domain-model §7.3: "`bound` is the anti-pay-to-win
 * control: anything conferring power is bound and cannot enter the market." The service refuses a
 * bound listing three times over — a `and bound = false` in the UPDATE
 * (`worlds/src/players.ts:424`), a CHECK constraint behind it, and a route that turns the refusal
 * into a 403 with its own code, `item_bound` (`worlds/src/server.ts:307-312`), because "you may not
 * sell this, ever" is a different sentence from "you may not do this right now".
 *
 * `bound` is on the wire "because a client that offers a 'sell' button must know before it draws
 * one" (`worlds/src/server.ts:861-862`). So a bound row here has **no sell control at all** — not a
 * disabled one. A disabled button reads as "not yet, ask somebody", and this is not "not yet": it
 * is never, and the sentence in its place says so.
 *
 * And `docs/ecosystem/01-product-vision.md` principle 6 runs the other way too: nothing on this
 * screen may describe an item as an advantage. See `sourceMeaning` and `boundMeaning` in
 * src/lib/format.ts — every sentence there is about what an item IS and where it may go.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useState } from 'react'
import { Empty, Failed, Forbidden, Loading } from '../components/states.tsx'
import { Fact } from '../components/tone.tsx'
import { boundMeaning, shortId, shortUrn, sourceMeaning, timestamp } from '../lib/format.ts'
import { useMutation } from '../lib/mutation.ts'
import { useResource } from '../lib/resource.ts'
import {
  CROSS_TITLE,
  listForSale,
  listInventory,
  unlist,
  type InventoryItem,
} from '../lib/worlds.ts'

export function InventoryPage() {
  const load = useCallback(async (signal: AbortSignal) => listInventory({ signal }), [])
  const inventory = useResource(
    load,
    (data) => data.items.length,
    'Your inventory could not be read.',
  )

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">Your account</p>
        <h1 className="ww-head__title">Inventory</h1>
        <p className="ww-head__lede">
          What the account carries, with where each thing came from. Anything that could confer an
          advantage is bound to you and never enters a market — that is the platform’s control, not
          a restriction on a purchase.
        </p>
      </header>

      {inventory.state === 'loading' && <Loading label="Reading your inventory" />}
      {inventory.state === 'forbidden' && inventory.error !== null && (
        <Forbidden notice={inventory.error} />
      )}
      {inventory.state === 'failed' && inventory.error !== null && (
        <Failed
          notice={inventory.error}
          onRetry={inventory.reload}
          title="Your inventory did not load"
        />
      )}
      {inventory.state === 'empty' && (
        <Empty
          title="This account carries nothing yet"
          hint="Items arrive from a purchase, a season reward, a title, a trade, or a grant from the platform."
        />
      )}
      {inventory.state === 'ok' && inventory.data !== null && (
        <ul className="ww-items">
          {inventory.data.items.map((item) => (
            <ItemRow key={item.id} item={item} onChanged={inventory.reload} />
          ))}
        </ul>
      )}
    </>
  )
}

function ItemRow({ item, onChanged }: { item: InventoryItem; onChanged: () => void }) {
  const listed = item.listedAt !== null

  return (
    <li className={`ww-item${item.bound ? ' ww-item--bound' : ''}`}>
      <div className="ww-item__head">
        <code className="ww-item__urn cf-num" title={item.itemUrn}>
          {shortUrn(item.itemUrn)}
        </code>
        {item.bound && (
          <span className="ww-item__badge" title="Anything conferring power is bound">
            <span aria-hidden="true">⊘</span> BOUND
          </span>
        )}
      </div>

      <dl className="ww-facts">
        <Fact label="How it arrived">{sourceMeaning(item.source)}</Fact>
        <Fact label="Where it counts">
          {item.titleScope === CROSS_TITLE ? (
            'Every title'
          ) : (
            <code className="cf-num">{item.titleScope}</code>
          )}
        </Fact>
        <Fact label="Quantity">
          <span className="cf-num">{item.quantity}</span>
        </Fact>
        <Fact label="Acquired">{timestamp(item.acquiredAt)}</Fact>
      </dl>

      <p className={`ww-item__rule${item.bound ? ' ww-item__rule--bound' : ''}`}>
        {boundMeaning(item.bound)}
      </p>

      {/*
        NO CONTROL ON A BOUND ROW. Not a disabled one — see the file header. The sentence above is
        what stands in its place, and it is about the control rather than about a loss.
      */}
      {!item.bound && <Listing item={item} listed={listed} onChanged={onChanged} />}
    </li>
  )
}

function Listing({
  item,
  listed,
  onChanged,
}: {
  item: InventoryItem
  listed: boolean
  onChanged: () => void
}) {
  const [listingUrn, setListingUrn] = useState('')

  const offer = useMutation<[], { item: InventoryItem }>(
    async () => listForSale(item.id, listingUrn.trim()),
    'That item was not listed.',
  )
  const withdraw = useMutation<[], { item: InventoryItem }>(
    async () => unlist(item.id),
    'That listing was not withdrawn.',
  )

  const after = (done: unknown) => {
    if (done !== null) onChanged()
  }

  if (listed) {
    return (
      <div className="ww-listing">
        <p className="ww-listing__state">
          Offered to the market since {timestamp(item.listedAt)} as{' '}
          <code className="cf-num" title={item.listingUrn ?? ''}>
            {shortUrn(item.listingUrn)}
          </code>
          .
        </p>
        <button
          className="cf-btn ww-btn-quiet"
          type="button"
          disabled={withdraw.busy}
          onClick={() => void withdraw.run().then(after)}
        >
          {withdraw.busy ? 'Withdrawing…' : 'Withdraw the offer'}
        </button>
        {withdraw.error !== null && (
          <Failed notice={withdraw.error} title="The offer was not withdrawn" />
        )}
      </div>
    )
  }

  return (
    <form
      className="ww-listing"
      onSubmit={(e) => {
        e.preventDefault()
        void offer.run().then(after)
      }}
    >
      <label className="ww-field">
        <span className="ww-field__label">Listing reference</span>
        <span className="ww-field__hint">
          The Forge Market listing this item is offered under. Forge Worlds records the reference;
          the market owns the sale (<code className="cf-num">worlds/src/server.ts:617</code>).
        </span>
        <input
          className="ww-field__input cf-num"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={listingUrn}
          onChange={(e) => setListingUrn(e.target.value)}
        />
      </label>
      <button
        className="cf-btn"
        type="submit"
        disabled={offer.busy || listingUrn.trim().length === 0}
      >
        {offer.busy ? 'Listing…' : 'Offer it to the market'}
      </button>
      {offer.error !== null && (
        <Failed
          notice={offer.error}
          title={
            // The 403 can still arrive: `bound` is read from a response, and a response is a claim
            // about the past. When it does, it is rendered as the RULE rather than as a permission
            // problem the reader could fix by asking somebody.
            offer.error.message.includes('bound')
              ? 'This item is bound to your account and can never be sold'
              : `Item ${shortId(item.id)} was not listed`
          }
        />
      )}
    </form>
  )
}
