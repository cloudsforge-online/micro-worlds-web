/**
 * One title: what it declares, what it can award, and the seasons it runs.
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
import { ember, seasonTone, shortId, timestamp } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { listAchievements, listSeasons } from '../lib/worlds.ts'

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

export function TitlePage() {
  const { id = '' } = useParams<{ id: string }>()

  const loadAchievements = useCallback(
    async (signal: AbortSignal) => listAchievements(id, signal),
    [id],
  )
  const loadSeasons = useCallback(async (signal: AbortSignal) => listSeasons(id, signal), [id])

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
        <h1 className="ww-head__title cf-num">{shortId(id)}</h1>
        <p className="ww-head__lede">
          The game itself lives in the title: its worlds, its rules, its moment-to-moment play.
          Forge Worlds keeps only the parts that have to outlast a season — the achievements this
          title reports, and the seasons it runs against money the platform has set aside.
        </p>
      </header>

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
