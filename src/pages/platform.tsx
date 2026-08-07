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
    heading: 'A register of the titles',
    body:
      'One row per title: its name, whether it can be sold to, the jobs it says it is willing to ' +
      'be handed, and the address at which the platform reaches it. Adding a second title is ' +
      'filling in a row, not reworking a codebase built around the first.',
    cite: 'worlds/src/titles.ts',
  },
  {
    heading: 'One identity, wherever you play',
    body:
      'Your name, your standing, any sanctions against you and the age band that governs what may ' +
      'be shown to you all live with the account rather than with a game. Your outfit is stored ' +
      'per title on top of a default, so dressing differently in one place does not undress you ' +
      'everywhere else.',
    cite: 'worlds/src/players.ts',
  },
  {
    heading: 'A bag that follows you',
    body:
      'Everything the account holds, each item remembering how it arrived — bought, awarded, ' +
      'crafted, traded or given. Anything capable of giving you an edge is tied to you and can ' +
      'never be put up for sale. That restriction is the point of the design, not a limitation ' +
      'of it.',
    cite: 'worlds/src/players.ts',
  },
  {
    heading: 'Achievements that outlast the game',
    body:
      'A title tells the platform what you managed; the platform keeps the record, so it survives ' +
      'the title going quiet. Points are a tally and never a currency — nothing here can be spent.',
    cite: 'worlds/src/server.ts',
  },
  {
    heading: 'Seasons with a budget behind them',
    body:
      'A season opens with money set aside for rewards. When a title asks for a payout, the ' +
      'deduction from that budget and the entry in the ledger happen inside one transaction, so a ' +
      'title carrying a bug cannot pay out more than its season was funded for.',
    cite: 'worlds/src/server.ts',
  },
  {
    heading: 'Purchases turned into something real',
    body:
      'Billing tells the platform what you bought, over a webhook whose signature is verified ' +
      'against the exact bytes that arrived before anything reads them. The platform matches the ' +
      'purchase to the job it implies and asks the right title to do it, keyed so that a repeated ' +
      'message delivers your item once.',
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
        <h1 className="ww-head__title">The ground every title stands on</h1>
        <p className="ww-head__lede">
          Forge Worlds is not itself a game. It keeps the register of which titles exist, holds the
          single account you carry between them, looks after what that account owns, records what
          you have achieved, funds the seasons you play through, and turns whatever you buy into
          something a title actually hands you. Ninety Days After and Emberkin run on top of it.
        </p>
      </header>

      <section className="ww-panel" aria-label="What Forge Worlds owns">
        <h2 className="ww-panel__title">What it looks after</h2>
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
Nothing on sale here makes you stronger. What you can buy is appearance, convenience or
          admission, and the mechanism that keeps it that way is a single flag on every item you
          own. An item carrying it cannot be offered for sale, and that is enforced three times
          over: in the database rule, in the query that would have moved it, and in the route, which
          turns the refusal down with a code of its own rather than a shrug.
        </p>
      </section>

      <section className="ww-panel" aria-label="What Forge Worlds is built on">
        <h2 className="ww-panel__title">What it is built on</h2>
        <p className="ww-panel__subtitle">
          Forge Worlds is one product on the wider CloudsForge platform, and it borrows the rest of
          it rather than rebuilding it. The account you sign in with is the same one that holds your
          wallet. Season rewards are posted to the same double-entry ledger that records every other
          movement of money in the estate.
        </p>
        <p className="ww-panel__note">
          Underneath that sits the Forge Network chain, whose execution engine was written here from
          the ground up and is checked against the vectors the Ethereum project publishes — state
          transitions, the virtual machine, transaction encoding, the trie and RLP, passing all of
          them at Shanghai. Its coin, EMBER, is mined by proof of work, and the Forge Network site
          will mine it in a browser tab: the key it pays is generated inside the page, stays there,
          and is never sent to us.
        </p>
      </section>

      <section className="ww-panel" aria-label="The title registry">
        <h2 className="ww-panel__title">The register</h2>
        <p className="ww-panel__subtitle">
          Every title the platform has been told about, with the jobs each says it is willing to be
          given. It is served by <code className="cf-num">GET /v1/titles</code> and needs no
          account: a launcher has to be able to show you what there is before you have signed in to
          anything.
        </p>

        {registry.state === 'loading' && <Loading label="Fetching the register" />}
        {registry.state === 'failed' && registry.error !== null && (
          <Failed
            notice={registry.error}
            onRetry={registry.reload}
            title="The register is not on screen"
          />
        )}
        {registry.state === 'forbidden' && registry.error !== null && (
          // This route makes no authenticate() call, so a 403 from it is not about authorisation
          // at all — it is something in front of the service. Say that rather than telling
          // somebody to ask an administrator for a role no route checks.
          <Failed
            notice={registry.error}
            onRetry={registry.reload}
            title="Something turned this request away before Forge Worlds saw it"
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
              There are no titles in the register. Not loading — an empty list is the whole of what{' '}
              <code className="cf-num">GET /v1/titles</code> has to say.
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
          <span aria-hidden="true">⊘</span> Where this platform falls short
        </h2>
        <p className="ww-panel__subtitle">
          Put in front of you here rather than left for you to find out after paying. Each entry
          names the file it can be checked against.
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
This title has told the platform it can be asked for nothing, so it never will be. A
          purchase aimed at it stops here as an undeliverable record instead of becoming a request
          it would only have turned down.
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
          {/* One flex item, not three — see `.ww-note__body` in styles.css. Interleaving text with
              a <code> inside a flex container laid the status out on the wrong line. */}
          <span className="ww-note__body">
            Nothing can be sold against it while it stands at{' '}
            <code className="cf-num">{title.status}</code>, because a purchase aimed here would
            never be delivered.
          </span>
        </p>
      )}
    </li>
  )
}
