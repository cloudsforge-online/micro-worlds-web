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
    heading: 'One account',
    body: 'Your name and your standing travel with you. Your outfit is kept per game.',
  },
  {
    heading: 'A bag that follows you',
    body: 'Everything you own, remembering how it arrived. Nothing that gives an advantage can be sold on.',
  },
  {
    heading: 'Achievements kept off-game',
    body: 'The record survives a game going quiet. Points are a score, never a currency.',
  },
  {
    heading: 'Seasons with a pot behind them',
    body: 'Every payout comes out of a fixed amount, so a buggy game cannot overpay.',
  },
  {
    heading: 'Purchases that arrive',
    body: 'Bought once, handed over once, by whichever game owes it to you.',
  },
  {
    heading: 'A register, not a storefront',
    body: 'One entry per game: what it is, what it can be asked for, where to reach it.',
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
          Forge Worlds is not itself a game — it is what our games run on. Pick one below; your
          account is already in it.
        </p>
      </header>

      <section className="ww-shelf" aria-label="The title registry">
        <h2 className="ww-shelf__title">The games</h2>

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
        <h2 className="ww-panel__title">What the platform holds for you</h2>
        <div className="ww-owns">
          {OWNS.map((item) => (
            <article className="ww-owns__item" key={item.heading}>
              <h3 className="ww-owns__heading">{item.heading}</h3>
              <p className="ww-owns__body">{item.body}</p>
            </article>
          ))}
        </div>
        {/*
          KEPT, AND CUT TO ONE LINE. The no-pay-to-win rule is the one sentence on this page a
          player has a right to before they spend anything; the three-places-enforced detail that
          used to follow it was writing for engineers and is in the repository.
        */}
        <p className="ww-panel__note">
          Nothing on sale makes you better at a game — only how you look, what you skip, or what
          you get into. Anything that would give you an advantage is yours alone and never resold.
        </p>
      </section>

      <section className="ww-panel" aria-label="What Forge Worlds is built on">
        <h2 className="ww-panel__title">Built on the rest of CloudsForge</h2>
        <p className="ww-panel__subtitle">
          Same account as your wallet. Season rewards land in the same ledger as every other
          movement of money here, on Forge Network — our own Ethereum-compatible chain.
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
