/**
 * One title: what it declares, what it can award, and the seasons it runs.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THIS PAGE OPENS WITH THE REGISTER'S FILE ON THE GAME, AND THAT IS NEW
 *
 * Its heading used to be `shortId(id)` — eight hexadecimal characters — and the page never once
 * said which game it was about. A reader arriving from the shelf saw `00000000` where the name
 * should be, and had to infer the game from the achievements underneath it.
 *
 * It is also where the front page's caveats went. `src/pages/platform.tsx` used to print, under
 * every game, up to three grey sentences about what the platform could not do about it — whether
 * it was open to play, what it had declared it could be asked for, whether anything could be sold
 * against it. All three are facts about DELIVERY, and delivery is a question somebody asks when
 * they are deciding to spend, not when they are deciding what to play. The shelf keeps one
 * sentence — is there a way in — and everything else is stated here, in full, in the file.
 *
 * ── THE REGISTER IS FETCHED, NOT PASSED ───────────────────────────────────────────────────────
 *
 * `GET /v1/titles` and not a router state object, because this route is linkable: the sitemap
 * lists it, the shelf links to it, and somebody can paste `/titles/<uuid>` into a fresh tab. A
 * page that only knew the game's name when it was navigated to from elsewhere would render the
 * hexadecimal heading again for exactly the readers least able to guess what it meant.
 *
 * The register may not answer, and the id may not be in it. Both fall back to `shortId(id)` and
 * the old lede: the two lists below are keyed on the id in the path and do not need the row, so a
 * register that is down must not take the achievements and the seasons down with it.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * **Public**, because both routes behind it are: `GET /v1/titles/:id/achievements`
 * (`worlds/src/server.ts`) and `GET /v1/titles/:id/seasons` contain no
 * `await authenticate(ctx, deps)`. Putting this screen behind the session gate would send an
 * anonymous reader to sign in for pages the service would have handed them.
 *
 * ── What is deliberately not on this page ─────────────────────────────────────────────────────
 *
 * A season's REMAINING reward budget. `GET /v1/seasons/:id/budget` (`worlds/src/server.ts`)
 * would serve it to any signed-in account, and it is declined for two reasons, in this order:
 *
 *   1. It is an operator's number. "1,412 EMBER left in the pot" in front of players is an
 *      invitation to race for it, and a season budget exists to bound an exploit
 *      (`worlds/src/env.ts`), not to be a scoreboard.
 *   2. It is unreachable in production anyway. `deploy/gateway/dynamic/public-api.yml` routes
 *      `/v1/titles`, `/v1/players` and `/v1/provisions` to worlds and not `/v1/seasons`, so the
 *      path falls to that file's catch-all and is blackholed to `127.0.0.1:1`.
 *      Reported to the deploy; it does not change the first reason.
 *
 * The budget a season was OPENED with, and what it has granted, are both on the season row itself
 * (`worlds/src/server.ts`) and are shown — those are facts about the season's design, and
 * a player is entitled to know a season is funded before spending a month in it.
 */
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, Failed, Loading } from '../components/states.tsx'
import { Fact, StateBadge } from '../components/tone.tsx'
import { cardFor } from '../lib/catalogue.ts'
import { capabilityMeaning, ember, seasonTone, shortId, timestamp, titleTone } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { viewedSurfaceUrl } from '../lib/viewed.ts'
import {
  isOpenToPlay,
  isSellable,
  listAchievements,
  listSeasons,
  listTitles,
  type Title,
} from '../lib/worlds.ts'

/**
 * Whether a reward is worth a sentence.
 *
 * A POSITIVE test, not `!== '0'`. The clause this guards rendered for a year against a field the
 * service had renamed away, because the comparison it used answers "yes" to `undefined` — and to
 * `''`, and to `'00'`, and to anything else a wire can put where a number was. Parsing decides it
 * instead: a value that is not a positive integer of digits pays nothing, and nothing is said.
 */
function paysReward(wei: string | undefined): boolean {
  return typeof wei === 'string' && /^\d+$/.test(wei.trim()) && BigInt(wei.trim()) > 0n
}

/**
 * The register's file on one game — and the home of the three sentences the shelf used to print.
 *
 * ── WHAT IS HERE AND WHY EACH LINE IS ────────────────────────────────────────────────────────
 *
 * **Status**, as a badge with a glyph and a word beside a sentence saying what the status MEANS.
 * `titleTone` writes that sentence, the same one the shelf reads, so the two surfaces cannot drift
 * into describing `beta` differently.
 *
 * **Declares** — the capabilities, each with `capabilityMeaning` beside it. Not a chip cloud:
 * `private_world` means nothing to a player, and the whole reason `capabilityMeaning` exists is
 * that the raw token is an engineer's word. A title that declares NOTHING is the common case in
 * this estate today and it says so in a sentence rather than rendering an empty row.
 *
 * **Can be sold to** — `isSellable`, and it is the one line on this page that is about money. A
 * `draft` or `retired` game cannot take a purchase, because nothing would ever be handed over; a
 * player who has read that here will not be surprised by a storefront that refuses them.
 *
 * **Owns** — the asset scopes, which is the answer to "what does an item bought here belong to".
 *
 * ── WHAT IS DELIBERATELY NOT HERE ────────────────────────────────────────────────────────────
 *
 * The service URL. `GET /v1/titles` does not put it on the wire (`worlds/src/server.ts` selects
 * six columns and `serviceUrl` is not among them) and it should not: it is an in-cluster address,
 * it is the address the provisioning bridge posts to, and publishing it invites requests at a
 * service that expects only the platform.
 */
function TitleFile({ title, card }: { title: Title; card: ReturnType<typeof cardFor> }) {
  const tone = titleTone(title.status)
  const open = isOpenToPlay(title)
  const sellable = isSellable(title)

  return (
    <section className="ww-file" aria-label="What the register holds about this game">
      <div className="ww-file__head">
        <div className="ww-file__id">
          {card !== null && <p className="ww-file__kind">{card.kind}</p>}
          <p className="ww-file__slug cf-num">{title.slug}</p>
        </div>
        <StateBadge tone={tone} />
      </div>

      <dl className="ww-file__rows">
        <div className="ww-file__row">
          <dt className="ww-file__label">Open to play</dt>
          <dd className="ww-file__value">
            {open ? 'Yes' : 'No'} — {tone.meaning}
          </dd>
        </div>

        <div className="ww-file__row">
          <dt className="ww-file__label">Declares</dt>
          <dd className="ww-file__value">
            {title.capabilities.length === 0 ? (
              /*
                THE COMMON CASE, AND IT IS NOT AN EMPTY LIST. Two of the three registered games
                declare nothing at all. Rendering that as a blank would read as a page that failed
                to load; it is a registration that has never been filled in, and the consequence —
                nothing can be delivered against this game — is the part a buyer needs.
              */
              <span className="ww-file__none">
                Nothing yet. Until this game declares what it can be asked to do, the platform has
                no way to hand anything over to it.
              </span>
            ) : (
              <ul className="ww-file__caps">
                {title.capabilities.map((capability) => (
                  <li className="ww-file__cap" key={capability}>
                    <span className="ww-file__cap-name cf-num">{capability}</span>
                    <span className="ww-file__cap-meaning">{capabilityMeaning(capability)}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>

        <div className="ww-file__row">
          <dt className="ww-file__label">Can be sold to</dt>
          <dd className="ww-file__value">
            {sellable
              ? 'Yes. A purchase aimed at this game is accepted, and the platform will try to deliver it.'
              : `No. Nothing can be bought for this game while the register has it as ${tone.word.toLowerCase()}, because nothing bought could be handed over.`}
          </dd>
        </div>

        <div className="ww-file__row">
          <dt className="ww-file__label">Owns</dt>
          <dd className="ww-file__value">
            {title.assetScopes.length === 0 ? (
              <span className="ww-file__none">No asset scope. Nothing in your bag is its.</span>
            ) : (
              <span className="cf-num">{title.assetScopes.join(' · ')}</span>
            )}
          </dd>
        </div>
      </dl>

      {/*
        THE DOOR, ON THIS PAGE TOO. Somebody who followed "the platform's file on it" from the
        shelf and decided the game is for them should not have to go back to reach it. Same two
        branches and the same conditions as the shelf's, for the same reason: `surface` is another
        host resolved against the network being viewed, `play` is a route in this bundle.
      */}
      {open && card?.play != null && (
        <Link className="ww-file__play" to={card.play}>
          Play {title.name}
        </Link>
      )}
      {open && card?.play == null && card?.surface != null && (
        <a className="ww-file__play" href={viewedSurfaceUrl(card.surface)}>
          Play {title.name}
        </a>
      )}
    </section>
  )
}

export function TitlePage() {
  const { id = '' } = useParams<{ id: string }>()

  const loadRegister = useCallback(
    async (signal: AbortSignal) => listTitles({ includeRetired: true, signal }),
    [],
  )
  const loadAchievements = useCallback(
    async (signal: AbortSignal) => listAchievements(id, signal),
    [id],
  )
  const loadSeasons = useCallback(async (signal: AbortSignal) => listSeasons(id, signal), [id])

  /*
   * The register, read whole and searched here.
   *
   * There is no `GET /v1/titles/:id` — `src/lib/worlds.ts` enumerates every route the service
   * registers and the register is only ever served as a list. Filtering a list of three rows in
   * the browser is not the cost it would look like on a larger registry, and inventing a route
   * this app then had to be right about is the failure mode that file was written to end.
   *
   * `includeRetired` is on. A retired game's file is exactly the page somebody follows a stale
   * link to, and answering it with a hexadecimal heading — because the default response excludes
   * the row — would be the register hiding the one fact the reader came for.
   */
  const register = useResource(
    loadRegister,
    (data) => data.titles.length,
    'The register could not be read, so this page cannot say which game it is about.',
  )
  const title: Title | null = register.data?.titles.find((row) => row.id === id) ?? null
  // What this app can say about the game beyond what the register holds — a sentence and a way in.
  // Null for a title registered after this bundle was built, which is the case `lib/catalogue.ts`
  // is written to survive rather than the case it treats as an error.
  const card = title === null ? null : cardFor(title.slug)

  const achievements = useResource(
    loadAchievements,
    (data) => data.achievements.length,
    'This title’s achievements could not be fetched.',
    [id],
  )
  const seasons = useResource(
    loadSeasons,
    (data) => data.seasons.length,
    'This title’s seasons could not be fetched.',
    [id],
  )

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">
          <Link className="ww-link" to="/">
← The platform
          </Link>
        </p>
        {/*
          THE NAME WHEN THE REGISTER ANSWERED, THE ID WHEN IT DID NOT.

          `shortId` is not a fallback anybody would choose; it is what an unlinkable page is left
          with. The two lists below are keyed on the id in the path rather than on this row, so a
          register that is unreachable costs the heading and nothing else.
        */}
        {title === null ? (
          <h1 className="ww-head__title cf-num">{shortId(id)}</h1>
        ) : (
          <h1 className="ww-head__title">{title.name}</h1>
        )}
        <p className="ww-head__lede">
          {card?.blurb ??
            'The game itself lives in the title: its worlds, its rules, its moment-to-moment play. ' +
              'Forge Worlds keeps only the parts that have to outlast a season — the achievements ' +
              'this title reports, and the seasons it runs against money the platform has set aside.'}
        </p>
      </header>

      {/*
        THE REGISTER'S FILE ON THIS GAME.

        Rendered only when there is a row to render it from. Not a skeleton and not an error box:
        the register failing is stated once, quietly, and the page carries on with the two lists
        that do not depend on it.
      */}
      {title !== null && <TitleFile title={title} card={card} />}
      {(register.state === 'failed' || register.state === 'forbidden') && (
        <p className="ww-file__unread">
          The register did not answer, so what this game declares and whether it is open to play are
          not on this page. The achievements and seasons below come from the title itself and are
          unaffected.
        </p>
      )}
      {(register.state === 'ok' || register.state === 'empty') && title === null && (
        <p className="ww-file__unread">
          The register has no game under this address. The link that brought you here is older than
          the register, or the address was mistyped.{' '}
          <Link className="ww-link" to="/">
            Every game we run is on the platform page
          </Link>
          .
        </p>
      )}

      <section className="ww-panel" aria-label="Achievements this title defines">
        <h2 className="ww-panel__title">Achievements</h2>
        <p className="ww-panel__subtitle">
          The title decides what counts as an achievement; the platform keeps the record of who has
          earned one. Points are a tally rather than a currency, and there is nothing to spend them
          on.
        </p>

        {achievements.state === 'loading' && <Loading label="Fetching achievements" />}
        {(achievements.state === 'failed' || achievements.state === 'forbidden') &&
          achievements.error !== null && (
            <Failed
              notice={achievements.error}
              onRetry={achievements.reload}
              title="Achievements are not on screen"
            />
          )}
        {achievements.state === 'empty' && (
          <Empty
            title="This title has defined no achievements"
            hint="Each title writes its own, using its own credential. An empty list means none exist rather than that more are on their way."
          />
        )}
        {achievements.state === 'ok' && achievements.data !== null && (
          <ul className="ww-achievements">
            {achievements.data.achievements.map((achievement) => (
              <li className="ww-achievement" key={achievement.key}>
                <p className="ww-achievement__name">{achievement.name}</p>
                {achievement.description.length > 0 && (
                  <p className="ww-achievement__desc">{achievement.description}</p>
                )}
                <p className="ww-achievement__meta">
                  <code className="cf-num">{achievement.key}</code> ·{' '}
                  <span className="cf-num">{achievement.points}</span> points
                  {/*
                    `!== '0'` was the whole guard, and it is why this clause rendered empty for a
                    year: the field it tested had been renamed on the service, so it read
                    `undefined`, and `undefined !== '0'` is true. The guard now tests a POSITIVE
                    amount rather than an inequality — `paysReward` parses it — so a field that goes
                    missing again renders nothing rather than a sentence with a hole in it.
                  */}
                  {paysReward(achievement.rewardWei) && (
                    <>
                      {' '}
                      · pays <span className="cf-num">{ember(achievement.rewardWei)}</span> EMBER
                      out of the season&rsquo;s budget
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ww-panel" aria-label="Seasons this title runs">
        <h2 className="ww-panel__title">Seasons</h2>
        <p className="ww-panel__subtitle">
          Every season opens with a sum in EMBER set aside for rewards. When the title asks for a
          payout, the platform takes it from that sum and writes the ledger entry in a single
          transaction, so a title carrying a bug cannot pay out more than the season was funded
          for.
        </p>

        {seasons.state === 'loading' && <Loading label="Fetching seasons" />}
        {(seasons.state === 'failed' || seasons.state === 'forbidden') && seasons.error !== null && (
          <Failed notice={seasons.error} onRetry={seasons.reload} title="Seasons are not on screen" />
        )}
        {seasons.state === 'empty' && (
          <Empty
            title="This title has no seasons"
            hint="Opening a season commits real money, so a person at CloudsForge does it rather than the title. A title able to set its own reward budget would be a title able to pay itself."
          />
        )}
        {seasons.state === 'ok' && seasons.data !== null && (
          <ul className="ww-seasons">
            {seasons.data.seasons.map((season) => {
              const tone = seasonTone(season.status)
              return (
                <li className="ww-season" key={season.id}>
                  <div className="ww-season__head">
                    <span className="ww-season__name">{season.name}</span>
                    <StateBadge tone={tone} />
                  </div>
                  <p className="ww-season__slug cf-num">{season.slug}</p>
                  <dl className="ww-facts">
                    <Fact label="Runs from">
                      {timestamp(season.startsAt)} → {timestamp(season.endsAt)}
                    </Fact>
                    <Fact label="Funded with">
                      <span className="cf-num">{ember(season.rewardBudgetWei)}</span> EMBER
                    </Fact>
                    <Fact label="Paid out so far">
                      <span className="cf-num">{ember(season.rewardsGrantedWei)}</span> EMBER
                    </Fact>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
