/**
 * What you were sold, and whether it was delivered.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THIS IS THE SCREEN THE GAP LANDS ON, AND IT IS THE REASON THIS SURFACE EXISTS.
 *
 * `worlds/src/server.ts` names it in the metric's own help text: `unsupported` is "a customer
 * who paid for something undeliverable". Today that includes every private-world purchase, because
 * no title serves `POST /v1/provision` — see `TITLE_BRIDGE_GAP` in src/lib/worlds.ts.
 *
 * Three rules, taken from `micro-admin-web`'s treatment of an action with no executor:
 *
 *   1. An `unsupported` row renders the service's OWN sentence, verbatim
 *      (`provisions.last_error`), rather than a paraphrase — so this app and the service cannot
 *      drift into telling somebody two different stories about why their purchase did not arrive.
 *   2. There is **no retry control**, and not a disabled one. `POST /v1/provisions/:id/retry`
 *      demands `worlds:admin` or `role:admin` (`worlds/src/server.ts`), so a button here
 *      could only ever 403 — and a disabled button reads as "not yet" and gets clicked at.
 *   3. `unsupported` is not spelled as a failure. `worlds/src/titleclient.ts`: it is an
 *      ANSWER, and terminal. The word is UNDELIVERABLE and the sentence points at a refund.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, Failed, Forbidden, Loading } from '../components/states.tsx'
import { ServiceRefusal } from '../components/gap.tsx'
import { Fact, Maybe, StateBadge } from '../components/tone.tsx'
import { kindMeaning, provisionTone, shortId, shortUrn, timestamp } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { getProvision, listProvisions, type Provision } from '../lib/worlds.ts'

export function EntitlementsPage() {
  const load = useCallback(async (signal: AbortSignal) => listProvisions({ signal }), [])
  const provisions = useResource(
    load,
    (data) => data.provisions.length,
    'Your purchases could not be fetched.',
  )

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">Your account</p>
        <h1 className="ww-head__title">What you have bought</h1>
        <p className="ww-head__lede">
          Each purchase billing has passed to Forge Worlds, and what became of it afterwards.
          Anything that could not be delivered says so plainly, in the platform&rsquo;s own words,
          rather than sitting at &ldquo;pending&rdquo; indefinitely and letting you assume it is on
          its way.
        </p>
      </header>

      {provisions.state === 'loading' && <Loading label="Gathering your purchases" />}
      {provisions.state === 'forbidden' && provisions.error !== null && (
        <Forbidden notice={provisions.error} />
      )}
      {provisions.state === 'failed' && provisions.error !== null && (
        <Failed
          notice={provisions.error}
          onRetry={provisions.reload}
          title="Your purchases are not on screen"
        />
      )}
      {provisions.state === 'empty' && (
        <Empty
          title="Nothing has been bought on this account"
          hint="Purchases reach Forge Worlds from billing over a signed message. An empty list means none has ever arrived, which is different from one being on the way."
        />
      )}
      {provisions.state === 'ok' && provisions.data !== null && (
        <ul className="ww-provisions">
          {provisions.data.provisions.map((provision) => (
            <ProvisionCard key={provision.id} provision={provision} linked />
          ))}
        </ul>
      )}
    </>
  )
}

export function EntitlementPage() {
  const { id = '' } = useParams<{ id: string }>()
  const load = useCallback(async (signal: AbortSignal) => getProvision(id, signal), [id])
  const provision = useResource(load, () => 1, 'That purchase could not be fetched.', [id])

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">
          <Link className="ww-link" to="/entitlements">
← Everything you have bought
          </Link>
        </p>
        <h1 className="ww-head__title cf-num">{shortId(id)}</h1>
      </header>

      {provision.state === 'loading' && <Loading label="Fetching this purchase" />}
      {provision.state === 'forbidden' && provision.error !== null && (
        <Forbidden notice={provision.error} />
      )}
      {provision.state === 'failed' && provision.error !== null && (
        <Failed
          notice={provision.error}
          onRetry={provision.reload}
          // A 404 here means "no such provision" OR "not yours", and `worlds/src/server.ts`
          // says the two are the same answer ON PURPOSE, because a distinct answer for the second
          // is an enumeration oracle. So this app must not translate the 404 into "that belongs to
          // somebody else" — it would be inventing a distinction the service refuses to make.
          title={
            provision.error.message.includes('no such provision')
              ? 'This account has nothing filed under that reference'
              : 'That purchase is not on screen'
          }
        />
      )}
      {provision.data !== null && (
        <ul className="ww-provisions">
          <ProvisionCard provision={provision.data.provision} linked={false} />
        </ul>
      )}
    </>
  )
}

function ProvisionCard({ provision, linked }: { provision: Provision; linked: boolean }) {
  const tone = provisionTone(provision.state)
  const terminal = provision.state === 'unsupported' || provision.state === 'failed'

  return (
    <li className={`ww-provision${terminal ? ' ww-provision--terminal' : ''}`}>
      <div className="ww-provision__head">
        {linked ? (
          <Link className="ww-provision__sku cf-num" to={`/entitlements/${provision.id}`}>
            {provision.sku}
          </Link>
        ) : (
          <span className="ww-provision__sku cf-num">{provision.sku}</span>
        )}
        <StateBadge tone={tone} />
      </div>
      <p className="ww-provision__meaning">{tone.meaning}</p>

      <dl className="ww-facts">
        <Fact label="What you bought">{kindMeaning(provision.kind)}</Fact>
        <Fact label="Where it applies">
          <span className="cf-num">{provision.scope}</span>
        </Fact>
        <Fact label="Bought on">{timestamp(provision.createdAt)}</Fact>
        <Fact label="Delivered on">
          {provision.provisionedAt === null ? (
            <span className="ww-absent">Nothing has been made for this</span>
          ) : (
            timestamp(provision.provisionedAt)
          )}
        </Fact>
        <Fact label="What it became">
          <Maybe
            value={provision.provisionedUrn}
            missing="Nothing so far — no title has produced anything against it."
          />
        </Fact>
        <Fact label="Reference">
          <span className="cf-num" title={provision.entitlementId}>
            {shortId(provision.entitlementId)}
          </span>
        </Fact>
      </dl>

      {/*
        THE SERVICE'S OWN REFUSAL, VERBATIM, AND NO CONTROL BESIDE IT.

        `lastError` is set by `terminal()` (`worlds/src/provisioning.ts`) and holds the
        sentence the bridge wrote when it gave up. Rendering it as-is is rule 3 of
        `admin-web/src/lib/catalogue.ts`. There is deliberately nothing to click: the only
        route out of `failed` is `POST /v1/provisions/:id/retry`, which demands an administrator.
      */}
      {terminal && provision.lastError !== null && (
        <ServiceRefusal reason={provision.lastError} attempts={provision.attempts} />
      )}
      {terminal && provision.lastError === null && (
        <p className="ww-absent ww-absent--block">
No reason was written down for this, which is itself worth telling us about. Quote{' '}
          <code className="cf-num">{shortId(provision.id)}</code>.
        </p>
      )}

      {provision.state === 'unsupported' && (
        <p className="ww-provision__aside">
          This could not be delivered. Nothing broke: Forge Worlds finds out what a game is able to
          do before it asks, so you get a straight answer now rather than a request that hangs.
          Nothing will try again. If you paid for this, ask us for a refund.
        </p>
      )}

      {provision.provisionedUrn !== null && (
        <p className="ww-provision__urn">
          <span className="ww-provision__urn-label">Delivered as</span>{' '}
          <code className="cf-num" title={provision.provisionedUrn}>
            {shortUrn(provision.provisionedUrn)}
          </code>
        </p>
      )}
    </li>
  )
}
