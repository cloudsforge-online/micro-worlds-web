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

/**
 * What the platform looks after, in a player's terms.
 *
 * Each entry used to print the file it lives in under it — `worlds/src/players.ts` in the
 * smallest type on the card. That is provenance for an engineer, shown to somebody deciding
 * whether to make an account here, and it is gone; the repository is public and linked from the
 * footer for anybody who does want to read it.
 */
const OWNS: ReadonlyArray<{ heading: string; body: string }> = [
  {
    heading: 'A register of the games',
    body:
      'One entry per game: its name, whether anything can be bought for it, what it is able to be ' +
      'asked for, and where the platform reaches it. Adding a second game is filling in an entry ' +
      'rather than rebuilding everything around the first.',
  },
  {
    heading: 'One account, wherever you play',
    body:
      'Your name, your standing and any restrictions on your account live with you rather than ' +
      'with a game. Your outfit is kept per game on top of a default, so dressing differently in ' +
      'one place does not change how you look everywhere else.',
  },
  {
    heading: 'A bag that follows you',
    body:
      'Everything your account holds, each item remembering how it arrived: bought, awarded, ' +
      'crafted, traded or given. Anything that could give you an advantage in a game is tied to ' +
      'you and can never be sold on. That is the design, not a restriction we mean to lift.',
  },
  {
    heading: 'Achievements that outlast the game',
    body:
      'A game tells the platform what you managed and the platform keeps the record, so it ' +
      'survives that game going quiet. Points are a score and never a currency: they cannot be ' +
      'spent on anything.',
  },
  {
    heading: 'Seasons with a budget behind them',
    body:
      'A season opens with a fixed amount set aside for rewards. Every payout is taken from that ' +
      'amount and written into the accounts in the same movement, so a game with a bug in it ' +
      'cannot pay out more than its season was given.',
  },
  {
    heading: 'Purchases that turn into something real',
    body:
      'When you buy something, the platform is told what it was, checks the message really came ' +
      'from the billing system, works out which game has to hand it over, and asks that game to ' +
      'do it. If the same message arrives twice you still get your item once.',
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
        <h1 className="ww-head__title">The platform our games run on</h1>
        <p className="ww-head__lede">
          Forge Worlds is not itself a game. It holds the one account you carry between games, looks
          after everything that account owns, keeps the record of what you have achieved, funds the
          seasons you play through, and turns whatever you buy into something a game actually hands
          you. Ninety Days After and Emberkin run on top of it.
        </p>
      </header>

      <section className="ww-panel" aria-label="What Forge Worlds owns">
        <h2 className="ww-panel__title">What it looks after</h2>
        <div className="ww-owns">
          {OWNS.map((item) => (
            <article className="ww-owns__item" key={item.heading}>
              <h3 className="ww-owns__heading">{item.heading}</h3>
              <p className="ww-owns__body">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="ww-panel__note">
          Nothing you can buy here makes you better at a game. What is for sale is how you look, how
          much time something saves you, or admission to something — never an advantage. Items that
          would give you one are marked as yours alone the moment you get them, and the platform
          refuses to sell them on in three separate places, so no single mistake can undo it.
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
          Underneath all of it is Forge Network, our own blockchain. It runs the same kind of
          contracts Ethereum does and is tested against Ethereum’s own published test suites, so
          tools built for Ethereum work against it unchanged. Its coin, EMBER, is mined with an
          ordinary processor — the Forge Network site will mine it in a browser tab, using a key
          that is created inside the page, stays there, and is never sent to us.
        </p>
      </section>

      <section className="ww-panel" aria-label="The title registry">
        <h2 className="ww-panel__title">The games on the platform</h2>
        <p className="ww-panel__subtitle">
          Every game Forge Worlds has been told about, and what each one can be asked to do for you.
          You do not need an account to read this list — a launcher has to be able to show you what
          there is before you have signed in to anything.
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
          THE EMPTY CASE IS THE FINDING, NOT A PLACEHOLDER. It renders the gap and no call to
          action, because there is nothing a reader of this page can do about it and a button that
          suggested otherwise would be a lie.
        */}
        {registry.state === 'empty' && (
          <>
            <p className="ww-empty-lede">
              No games have been added to the register. Not loading — an empty list is the whole of
              the answer.
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
      <section className="ww-panel ww-panel--gap" aria-label="What you cannot buy yet">
        <h2 className="ww-panel__title">One thing you cannot buy yet</h2>
        <p className="ww-panel__subtitle">
          Said here, before you pay, rather than left for you to find out afterwards.
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
          This game has told the platform there is nothing it can be asked to do, so it never will
          be asked. Anything bought for it would stop as a record of a purchase that cannot be
          delivered, rather than become a request it was only going to turn down.
        </p>
      ) : (
        <ul className="ww-caps">
          {title.capabilities.map((capability) => (
            <li className="ww-cap" key={capability}>
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
            Nothing can be bought for this game while it is {tone.word.toLowerCase()}, because a
            purchase aimed here would never be delivered.
          </span>
        </p>
      )}
    </li>
  )
}
