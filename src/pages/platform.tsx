/**
 * The index. **The games first, then the platform they run on.**
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT THIS PAGE USED TO BE, AND WHY IT CHANGED
 *
 * It opened with six panels about what the platform OWNS, and put the register of games below
 * them. The argument was sound and is preserved further down this file: Forge Worlds owns the
 * title registry, one shared account, inventory, achievements, seasons and the entitlement bridge,
 * and a front page made of game cards would say the platform IS its games — the category error the
 * registry exists to end.
 *
 * It was also written when the register was EMPTY, so the choice cost nothing: there were no games
 * to lead with. Now there are three, and the owner has reported the consequence in the plainest
 * possible terms — "we suppose to have 3 games but no one is visible or accessible on forge
 * worlds". Both halves of that were true. Nothing had ever registered a title, so the register
 * answered `{"titles":[]}` and the page rendered the finding; and even with rows in it the page
 * offered no way to REACH a game, because a row linked only to `/titles/<id>` — achievements and
 * seasons, which is a record about a game rather than a door into it.
 *
 * So the order is inverted and the row has grown a way in. What is kept from the old argument is
 * the part that was actually about honesty: the `<h1>` still names the PLATFORM and never a game,
 * and everything the platform looks after is still on this page, immediately under the games.
 *
 * ── THE REGISTER IS STILL THE AUTHORITY ON WHICH GAMES EXIST ──────────────────────────────────
 *
 * Every entry below is a row from `GET /v1/titles`. This page adds a sentence and an address from
 * `lib/catalogue.ts` where it has one, and renders the row regardless where it does not — a title
 * an administrator registers tomorrow appears here tomorrow. The empty case is unchanged and still
 * renders `EMPTY_REGISTRY_GAP` rather than a spinner: a fresh deployment has registered nothing,
 * and `{"titles":[]}` is the whole of the answer rather than a stage on the way to one.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Failed, Loading } from '../components/states.tsx'
import { GapNotice } from '../components/gap.tsx'
import { StateBadge } from '../components/tone.tsx'
import { cardFor } from '../lib/catalogue.ts'
import { capabilityMeaning, titleTone } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { viewedSurfaceUrl } from '../lib/viewed.ts'
import {
  EMPTY_REGISTRY_GAP,
  TITLE_BRIDGE_GAP,
  isOpenToPlay,
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
        {/*
          THE HEADING NAMES THE PLATFORM, NOT A GAME, AND THAT PART OF THE OLD ARGUMENT STANDS.
          It also refuses to count: "three games" would be wrong the day a fourth is registered,
          and this page reads the register rather than telling it what to contain.
        */}
        <h1 className="ww-head__title">One account, every game we make</h1>
        <p className="ww-head__lede">
          Forge Worlds is not itself a game. It is what our games run on: the account you sign in
          with, everything that account owns, the record of what you have done, and the seasons that
          pay out. Start a game below and your account is already in it.
        </p>
      </header>

      <section className="ww-panel" aria-label="The title registry">
        <h2 className="ww-panel__title">The games on the platform</h2>
        <p className="ww-panel__subtitle">
          Every game Forge Worlds has been told about. Each of these is its own game with its own
          rules, and they all run on top of it — the platform holds your account, the things you own
          and the record of what you have done; the game holds the play. You do not need an account
          to read this list — a launcher has to be able to show you what there is before you have
          signed in to anything — and you will need one to play.
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
          <ul className="ww-reg">
            {registry.data.titles.map((title) => (
              <TitleEntry key={title.id} title={title} />
            ))}
          </ul>
        )}
      </section>

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

      {/*
        STATED ON THE FRONT PAGE, ALWAYS, AND NOT ONLY WHEN THE REGISTRY IS EMPTY.
        A registry with rows in it makes the platform look complete; the bridge still has nothing
        on the other end of it, and a customer would still be able to buy a private world that
        never gets raised. The gap is a property of the estate, not of the response.
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

/**
 * One game, as an entry in the register.
 *
 * The three parts are a spine, a picture and the entry itself, and the spine is the one that needs
 * explaining. It carries the SLUG, set down the left edge — and the slug is not decoration here:
 * it is the entitlement scope id, the value `worlds/src/titles.ts` constrains to a URL-safe shape
 * precisely because everything the platform keys on a game is keyed on it. Putting it on the entry
 * is the register saying, in its own vocabulary, that these rows are records rather than adverts.
 * `aria-hidden` because the name above it already says which game this is; a screen reader reading
 * "emberkin, Emberkin" learns nothing the second time.
 */
function TitleEntry({ title }: { title: Title }) {
  const tone = titleTone(title.status)
  const card = cardFor(title.slug)
  // Two conditions, and both are real. The register decides whether a game is open at all, and the
  // catalogue decides whether anything in this estate can render it. A game that is `live` with no
  // client, and a game with a client that is still `draft`, are different situations with different
  // sentences — neither of them is a Play button.
  const open = isOpenToPlay(title)
  const playable = open && card?.surface != null

  return (
    <li className={`ww-reg__entry${playable ? ' ww-reg__entry--playable' : ''}`}>
      <p className="ww-reg__spine cf-num" aria-hidden="true">
        {title.slug}
      </p>

      <div className="ww-reg__art">
        {card?.art != null ? (
          <img
            className="ww-reg__cover"
            src={card.art}
            alt=""
            width={900}
            height={472}
            loading="lazy"
            decoding="async"
          />
        ) : card?.motif === 'ninety-days' ? (
          <NinetyDays />
        ) : (
          <div className="ww-reg__cover ww-reg__cover--none" aria-hidden="true" />
        )}
      </div>

      <div className="ww-reg__body">
        <div className="ww-reg__head">
          <h3 className="ww-reg__name">{title.name}</h3>
          <StateBadge tone={tone} />
        </div>
        {card !== null && <p className="ww-reg__kind">{card.kind}</p>}
        <p className="ww-reg__blurb">{card?.blurb ?? tone.meaning}</p>

        <div className="ww-reg__actions">
          {playable && card?.surface != null ? (
            <a className="cf-btn" href={viewedSurfaceUrl(card.surface)}>
              Play {title.name}
            </a>
          ) : null}
          <Link className="cf-btn ww-btn-quiet" to={`/titles/${title.id}`}>
            Achievements and seasons
          </Link>
        </div>

        {/*
          WHY THERE IS NO WAY IN, WHEN THERE IS NO WAY IN — and the two reasons are not the same
          sentence. Promising either one is on its way would be the thing this estate does not do.
        */}
        {!playable && (
          <p className="ww-reg__shut">
            {card?.surface == null
              ? 'This game is built and running — the platform reaches it, and it answers. It has ' +
                'no screen yet, so there is nowhere to send you. Nothing you do here is waiting ' +
                'on it.'
              : `Not open to play while it is ${tone.word.toLowerCase()}.`}
          </p>
        )}

        {title.capabilities.length > 0 ? (
          <ul className="ww-caps">
            {title.capabilities.map((capability) => (
              <li className="ww-cap" key={capability}>
                <span className="ww-cap__meaning">{capabilityMeaning(capability)}</span>
              </li>
            ))}
          </ul>
        ) : (
          /*
            THE BRIDGE CHECKS CAPABILITIES BEFORE IT CALLS (`worlds/src/provisioning.ts`), so a
            title declaring none is one whose every purchase ends undeliverable. Saying it on the
            row costs nothing; saying it after somebody has paid costs them.
          */
          <p className="ww-reg__shut">
            This game declares nothing it can be asked to do, so nothing bought for it could be
            handed over.
          </p>
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
      </div>
    </li>
  )
}

/**
 * Ninety cells, one per day.
 *
 * *Ninety Days After* has no art and no client, and a grey rectangle where the other two entries
 * have a picture would read as a page that failed to load rather than as a game with a different
 * story. This is drawn from the game's own rules instead: it resolves exactly one day at a time
 * for everybody at once, and it ends after ninety of them. The first stretch is shaded because
 * those are the days already behind the survivors when the game opens.
 *
 * Decorative, so it is `aria-hidden` and the blurb beside it carries the same fact in words.
 */
function NinetyDays() {
  return (
    <div className="ww-reg__days" aria-hidden="true">
      {Array.from({ length: 90 }, (_, index) => (
        <span className={`ww-reg__day${index < 30 ? ' ww-reg__day--past' : ''}`} key={index} />
      ))}
    </div>
  )
}
