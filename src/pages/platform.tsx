/**
 * The index. **Forge Worlds is the platform, not a game.**
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT THIS PAGE IS NOT: TWO GAME CARDS.
 *
 * Forge Worlds owns the title REGISTRY, one shared account, inventory, achievements, seasons and
 * the entitlement bridge. Ninety Days After and Emberkin are titles that run ON it — they are not
 * what it is, and `worlds/src/titles.ts` draws the boundary in the service's own words: "A
 * title owns SIMULATION… What this service owns is anything that must outlive a season or cross a
 * title." A front page made of two game cards says the platform is those two games, which is the
 * category error this estate has already made twice on its own front page, and which is exactly
 * the error the registry exists to end: `worlds/src/titles.ts` records that a grep for
 * `title_id` across the frozen game service returns nothing at all, "so every table is implicitly
 * its, and the second game has nowhere to go".
 *
 * So the page opens with what the platform OWNS, and the registry is a section within it.
 *
 * ── AND THE REGISTRY IS EMPTY, WHICH IS NOT A LOADING STATE ───────────────────────────────────
 *
 * `GET /v1/titles` answers `{"titles":[]}` on a fresh deployment, because nothing registers a
 * title — see `EMPTY_REGISTRY_GAP` in src/lib/worlds.ts. That is a 200 and a true answer. It is
 * rendered as the finding it is, with citations, and never as a spinner, a skeleton or an empty
 * state that implies something is on its way.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Failed, Loading } from '../components/states.tsx'
import { GapNotice } from '../components/gap.tsx'
import { StateBadge } from '../components/tone.tsx'
import { capabilityMeaning, titleTone } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import {
  EMPTY_REGISTRY_GAP,
  TITLE_BRIDGE_GAP,
  isSellable,
  listTitles,
  type Title,
} from '../lib/worlds.ts'

/** What the platform owns, in its own terms. Each line is a thing with a route behind it. */
const OWNS: ReadonlyArray<{ heading: string; body: string; cite: string }> = [
  {
    heading: 'The title registry',
    body:
      'Which titles exist, what each one declares it can be asked to do, and where the platform ' +
      'reaches it. A second title is a row here rather than a rewrite.',
    cite: 'worlds/src/titles.ts',
  },
  {
    heading: 'One account, across every title',
    body:
      'A display name, a reputation, sanctions and an age bracket that outlive any one season. ' +
      'The wardrobe is keyed by title, so “my frame in each game” is representable and “my frame” ' +
      'is still the default.',
    cite: 'worlds/src/players.ts',
  },
  {
    heading: 'Inventory, and what may leave it',
    body:
      'Everything the account owns, with provenance. Anything that could confer an advantage is ' +
      'bound and never enters a market — that is the control, not a side effect.',
    cite: 'worlds/src/players.ts',
  },
  {
    heading: 'Achievements and seasons',
    body:
      'A title reports what a player did; the platform records it. A title asks for a reward; the ' +
      'platform charges it against the season’s budget in the same transaction as the ledger ' +
      'posting, so a title with a bug cannot spend past its season.',
    cite: 'worlds/src/server.ts',
  },
  {
    heading: 'The entitlement bridge',
    body:
      'What billing says you bought becomes something a title raises. Signature-checked over the ' +
      'exact bytes received before it is parsed, because a provisioning webhook with no MAC is a ' +
      'free-worlds endpoint.',
    cite: 'worlds/src/server.ts',
  },
]

export function PlatformPage() {
  const load = useCallback(async (signal: AbortSignal) => listTitles({ signal }), [])
  const registry = useResource(
    load,
    (data) => data.titles.length,
    'The title registry could not be read.',
  )

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">Forge Worlds</p>
        <h1 className="ww-head__title">The platform games run on</h1>
        <p className="ww-head__lede">
          Forge Worlds is not a game. It is the registry of titles, one account that crosses all of
          them, the inventory that account carries, the achievements and seasons a title reports
          into, and the bridge that turns something you bought into something a title raises.
          Ninety Days After and Emberkin are titles that run here.
        </p>
      </header>

      <section className="ww-panel" aria-label="What Forge Worlds owns">
        <h2 className="ww-panel__title">What it owns</h2>
        <div className="ww-owns">
          {OWNS.map((item) => (
            <article className="ww-owns__item" key={item.heading}>
              <h3 className="ww-owns__heading">{item.heading}</h3>
              <p className="ww-owns__body">{item.body}</p>
              <p className="ww-owns__cite">
                <code className="cf-num">{item.cite}</code>
              </p>
            </article>
          ))}
        </div>
        <p className="ww-panel__note">
          Everything purchasable on this platform is cosmetic, convenience or access. Nothing sold
          here confers power, and the control that makes that true is <code className="cf-num">bound</code>{' '}
          on an inventory row — a bound item can never be listed for sale, refused by a query, a
          constraint and a route that says so in its own error code.
        </p>
      </section>

      <section className="ww-panel" aria-label="The title registry">
        <h2 className="ww-panel__title">The registry</h2>
        <p className="ww-panel__subtitle">
          Every title Forge Worlds knows about, and what each declares it can be asked to do. Read
          from <code className="cf-num">GET /v1/titles</code>, which needs no account — a launcher
          listing titles cannot require a token to do it.
        </p>

        {registry.state === 'loading' && <Loading label="Reading the registry" />}
        {registry.state === 'failed' && registry.error !== null && (
          <Failed
            notice={registry.error}
            onRetry={registry.reload}
            title="The registry did not load"
          />
        )}
        {registry.state === 'forbidden' && registry.error !== null && (
          // This route makes no authenticate() call, so a 403 from it is not about authorisation
          // at all — it is something in front of the service. Say that rather than telling
          // somebody to ask an administrator for a role no route checks.
          <Failed
            notice={registry.error}
            onRetry={registry.reload}
            title="Something refused this request before it reached the platform"
          />
        )}

        {/*
          THE EMPTY CASE IS THE FINDING, NOT A PLACEHOLDER. It renders the gap with its citations
          and no call to action, because there is nothing a reader of this page can do about it and
          a button that suggested otherwise would be a lie.
        */}
        {registry.state === 'empty' && (
          <>
            <p className="ww-empty-lede">
              The registry is empty. Not loading — this is what{' '}
              <code className="cf-num">GET /v1/titles</code> answers today.
            </p>
            <GapNotice gap={EMPTY_REGISTRY_GAP} />
          </>
        )}

        {registry.state === 'ok' && registry.data !== null && (
          <ul className="ww-titles">
            {registry.data.titles.map((title) => (
              <TitleRow key={title.id} title={title} />
            ))}
          </ul>
        )}
      </section>

      {/*
        STATED ON THE FRONT PAGE, ALWAYS, AND NOT ONLY WHEN THE REGISTRY IS EMPTY.
        A registry with rows in it would make the platform look complete; the bridge would still
        have nothing on the other end of it, and a customer would still be able to buy a private
        world that never gets raised. The gap is a property of the estate, not of the response.
      */}
      <section className="ww-panel ww-panel--gap" aria-label="What does not work yet">
        <h2 className="ww-panel__title">
          <span aria-hidden="true">⊘</span> What does not work yet
        </h2>
        <p className="ww-panel__subtitle">
          Stated here rather than discovered at the point of purchase. Both entries are checkable
          against source.
        </p>
        <GapNotice gap={TITLE_BRIDGE_GAP} />
      </section>
    </>
  )
}

function TitleRow({ title }: { title: Title }) {
  const tone = titleTone(title.status)
  return (
    <li className="ww-title">
      <div className="ww-title__head">
        <Link className="ww-title__name" to={`/titles/${title.id}`}>
          {title.name}
        </Link>
        <StateBadge tone={tone} />
      </div>
      <p className="ww-title__slug cf-num">{title.slug}</p>
      <p className="ww-title__meaning">{tone.meaning}</p>

      {title.capabilities.length === 0 ? (
        <p className="ww-absent">
          This title declares no capabilities, so the platform will not ask it for anything. A
          purchase scoped to it ends as an undeliverable row rather than as a request it would
          refuse.
        </p>
      ) : (
        <ul className="ww-caps">
          {title.capabilities.map((capability) => (
            <li className="ww-cap" key={capability}>
              <code className="cf-num ww-cap__key">{capability}</code>
              <span className="ww-cap__meaning">{capabilityMeaning(capability)}</span>
            </li>
          ))}
        </ul>
      )}

      {!isSellable(title) && (
        <p className="ww-note ww-note--warn">
          <span className="ww-note__icon" aria-hidden="true">
            ▲
          </span>
          Not sellable while it is <code className="cf-num">{title.status}</code>. A purchase scoped
          to it would never be delivered.
        </p>
      )}
    </li>
  )
}
