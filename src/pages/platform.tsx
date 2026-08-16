/**
 * The index. **The games first, then the platform they run on.**
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT THIS PAGE USED TO BE, AND WHY IT CHANGED — TWICE
 *
 * **First**, it opened with six panels about what the platform OWNS and put the register of games
 * below them. The argument was sound and is preserved further down this file: Forge Worlds owns
 * the title registry, one shared account, inventory, achievements, seasons and the entitlement
 * bridge, and a front page made of game cards would say the platform IS its games — the category
 * error the registry exists to end. It was also written when the register was EMPTY, so the choice
 * cost nothing. With three games in it the owner reported the consequence in the plainest possible
 * terms, and the order was inverted.
 *
 * **Second, and this pass**: inverting the order was necessary and was not sufficient. The games
 * came first but they came as REGISTER ROWS — a bordered box each, a thumbnail in a fixed 26rem
 * column, and beneath the name up to three separate grey sentences explaining what the platform
 * could not do about that game. Emberkin, a finished client serving at its own host, was rendered
 * as: no button, "Not open to play while it is draft.", "This game declares nothing it can be
 * asked to do, so nothing bought for it could be handed over.", and "▲ Nothing can be bought for
 * this game while it is draft". Three refusals and no door, for a game you can play right now.
 *
 * ── WHAT REPLACED IT ──────────────────────────────────────────────────────────────────────────
 *
 * A shelf of POSTERS. Each game's own art is the ground, at the full width of the page, with the
 * name, one line and the way in laid over the bottom of it; the game's own colour — read off that
 * picture in `src/art/titles.ts`, never a design token — lights the eyebrow and the rule above the
 * name. Three games, three pictures, three different lights, which is the answer to a page that
 * had been reported as "continuous tiles of the same colour and pattern".
 *
 * **The caveats did not get deleted; they moved.** Every sentence above is a fact about DELIVERY —
 * whether a purchase aimed at that game could be handed over — and it belongs where somebody is
 * deciding to spend, which is the title's own page. `src/pages/title.tsx` now opens with the
 * register's file on the game and states all of it. What stays on the poster is the one thing a
 * visitor is asking here: whether there is a way in, and if not, why not, in ONE sentence.
 *
 * ── THE REGISTER IS STILL THE AUTHORITY ON WHICH GAMES EXIST ──────────────────────────────────
 *
 * Every poster below is a row from `GET /v1/titles`. This page adds a line and an address from
 * `lib/catalogue.ts` where it has one, and renders the row regardless where it does not — a title
 * an administrator registers tomorrow appears here tomorrow, with its slug on it and without a
 * picture. The empty case is unchanged and still renders `EMPTY_REGISTRY_GAP` rather than a
 * spinner: a fresh deployment has registered nothing, and `{"titles":[]}` is the whole of the
 * answer rather than a stage on the way to one.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type { CSSProperties } from 'react'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Failed, Loading } from '../components/states.tsx'
import { GapNotice } from '../components/gap.tsx'
import { StateBadge } from '../components/tone.tsx'
import { cardFor } from '../lib/catalogue.ts'
import { titleTone } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { viewedSurfaceUrl } from '../lib/viewed.ts'
import {
  EMPTY_REGISTRY_GAP,
  TITLE_BRIDGE_GAP,
  isOpenToPlay,
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
          <ul className="ww-shelf__list">
            {registry.data.titles.map((title) => (
              <TitlePlate key={title.id} title={title} />
            ))}
          </ul>
        )}
      </section>

      {/*
        NOT A `.ww-panel`. The six facts below are already a ruled ledger rather than six cards;
        wrapping the ledger in a bordered, filled box put the box back and made the section compete
        with the shelf above it for the same visual weight. A heading with a rule under it — the
        same one the shelf uses — says "a section" without saying "a container".
      */}
      <section className="ww-ledger" aria-label="What Forge Worlds owns">
        <h2 className="ww-shelf__title">What the platform holds for you</h2>
        <div className="ww-owns">
          {OWNS.map((item) => (
            <article className="ww-owns__item" key={item.heading}>
              <h3 className="ww-owns__heading">{item.heading}</h3>
              <p className="ww-owns__body">{item.body}</p>
            </article>
          ))}
        </div>
        {/*
          TWO SENTENCES, AND BOTH EARN THEIR PLACE. The first is the no-pay-to-win rule, which is
          the one thing on this page a player has a right to before they spend anything. The second
          used to be a panel of its own, headed "Built on the rest of CloudsForge", carrying this
          and nothing else — a border and a heading around a single sentence.
        */}
        <p className="ww-ledger__note">
          Nothing on sale makes you better at a game — only how you look, what you skip, or what you
          get into. Anything that would give you an advantage is yours alone and never resold. It is
          the same account as your wallet, and season rewards land in the same ledger as every other
          movement of money here, on Forge Network.
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
 * One game, as a poster.
 *
 * ── WHY THE ART IS THE GROUND AND NOT A THUMBNAIL ─────────────────────────────────────────────
 *
 * The previous entry gave the cover a fixed 26rem column beside a body of text, which made every
 * game the same shape: a rectangle of picture, then a wall of grey. The three covers are the only
 * things on this page that are actually different from one another, so they are what the page is
 * now made of. The copy sits over the bottom of each one, on a scrim dark enough to hold it.
 *
 * ── THE SLUG IS STILL ON IT ───────────────────────────────────────────────────────────────────
 *
 * Top-left, in the mono face, and it is not ornament: the slug is the entitlement scope id — the
 * value `worlds/src/titles.ts` constrains to a URL-safe shape precisely because everything the
 * platform keys on a game is keyed on it. It used to run down a rotated spine, which was the same
 * argument made in a way that stopped working on a phone. `aria-hidden` because the name below it
 * already says which game this is; a screen reader reading "emberkin, Emberkin" learns nothing the
 * second time.
 */
function TitlePlate({ title }: { title: Title }) {
  const tone = titleTone(title.status)
  const card = cardFor(title.slug)
  // Two conditions, and both are real. The register decides whether a game is open at all, and the
  // catalogue decides whether anything in this estate can render it. A game that is `live` with no
  // client, and a game with a client that is still `draft`, are different situations with different
  // sentences — neither of them is a Play button.
  const open = isOpenToPlay(title)
  // Two ways in, and they are followed differently. `surface` is another host in the estate and is
  // resolved against the network being viewed; `play` is a route on THIS surface and is followed
  // with the router, without a reload. A card sets one or neither.
  const playable = open && (card?.surface != null || card?.play != null)

  /*
   * The game's own colour, from its own picture, as a custom property the stylesheet spends.
   *
   * Inline because it is per-ROW data joined at render time, and a stylesheet cannot hold a rule
   * per slug without becoming a second register that has to be edited every time an administrator
   * adds a game. A title with no art sets nothing and `.ww-plate` falls back to `--cf-accent`,
   * which is what the `??` in the CSS is for — an undefined custom property invalidates the whole
   * declaration rather than falling back, so the fallback is written there and not here.
   */
  const lit = card?.accent != null ? ({ '--ww-plate-accent': card.accent } as CSSProperties) : undefined

  return (
    <li className={`ww-plate${playable ? ' ww-plate--open' : ''}`} style={lit}>
      {card?.art != null ? (
        <img
          className="ww-plate__art"
          src={card.art}
          alt=""
          width={900}
          height={472}
          loading="lazy"
          decoding="async"
        />
      ) : (
        /*
         * A title this page has never been taught about. A flat sunken ground and never a broken
         * image: all three registered games have a cover, so this is reached only by a fourth
         * title an administrator registers — which is exactly the case the register is built to
         * survive, and it must still produce a poster with a name and a slug on it.
         */
        <div className="ww-plate__art ww-plate__art--none" aria-hidden="true" />
      )}
      <div className="ww-plate__scrim" aria-hidden="true" />

      <p className="ww-plate__slug cf-num" aria-hidden="true">
        {title.slug}
      </p>
      <div className="ww-plate__state">
        <StateBadge tone={tone} />
      </div>

      <div className="ww-plate__copy">
        {card !== null && <p className="ww-plate__kind">{card.kind}</p>}
        <h3 className="ww-plate__name">{title.name}</h3>
        <p className="ww-plate__hook">{card?.hook ?? tone.meaning}</p>

        <div className="ww-plate__actions">
          {open && card?.play != null ? (
            <Link className="ww-plate__play" to={card.play}>
              Play {title.name}
            </Link>
          ) : open && card?.surface != null ? (
            <a className="ww-plate__play" href={viewedSurfaceUrl(card.surface)}>
              Play {title.name}
            </a>
          ) : (
            /*
             * WHY THERE IS NO WAY IN, WHEN THERE IS NO WAY IN — one sentence, in the place the
             * button would have been, so a reader looking for the door finds the reason there is
             * none rather than nothing at all. Promising either is on its way would be the thing
             * this estate does not do.
             *
             * The middle branch used to be *Ninety Days After*'s, in those words, and it was true
             * for as long as `micro-nda` served the game with nothing rendering it. `/play`
             * renders it now, so the sentence is kept for the case it describes rather than for
             * the game it was written about: a registered title this bundle has never heard of.
             */
            <p className="ww-plate__shut">
              {!open
                ? `Not open to play — the register has it as ${tone.word.toLowerCase()}.`
                : card === null
                  ? 'The register lists this game, but nothing here knows where to send you.'
                  : 'Built and running, with no screen of its own to send you to yet.'}
            </p>
          )}
          {/*
            THE REGISTER'S FILE ON THE GAME, and the second half of the caveat move described at the
            top of this file. Achievements, seasons, the capabilities it declares and whether
            anything can be sold against it are all on the other side of this link.
          */}
          <Link className="ww-plate__more" to={`/titles/${title.id}`}>
            The platform&rsquo;s file on it
          </Link>
        </div>
      </div>
    </li>
  )
}
