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
 *   1. It is an operator's number. "1,412 Shards left in the pot" in front of players is an
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
import { seasonTone, shards, shortId, timestamp } from '../lib/format.ts'
import { useResource } from '../lib/resource.ts'
import { listAchievements, listSeasons } from '../lib/worlds.ts'

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
    'This title’s achievements could not be read.',
    [id],
  )
  const seasons = useResource(
    loadSeasons,
    (data) => data.seasons.length,
    'This title’s seasons could not be read.',
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
          A title runs its own simulation — worlds, tiles, ticks, combat. What Forge Worlds holds
          for it is what has to outlive a season: the achievements it reports, and the seasons it
          runs against a budget the platform sets.
        </p>
      </header>

      <section className="ww-panel" aria-label="Achievements this title defines">
        <h2 className="ww-panel__title">Achievements</h2>
        <p className="ww-panel__subtitle">
          Defined by the title, recorded by the platform. Points are a record, not a currency —
          nothing here can be spent.
        </p>

        {achievements.state === 'loading' && <Loading label="Reading achievements" />}
        {(achievements.state === 'failed' || achievements.state === 'forbidden') &&
          achievements.error !== null && (
            <Failed
              notice={achievements.error}
              onRetry={achievements.reload}
              title="Achievements did not load"
            />
          )}
        {achievements.state === 'empty' && (
          <Empty
            title="This title has defined no achievements"
            hint="A title defines its own, with a title credential. Nothing here means none have been defined — not that the list is still arriving."
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
                  {achievement.rewardShards !== '0' && (
                    <>
                      {' '}
                      · pays <span className="cf-num">{shards(achievement.rewardShards)}</span>{' '}
                      Shards from the season budget
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
          A season carries a reward budget in Shards. A title asks the platform to pay a reward; the
          platform charges the budget and the ledger in one transaction, so a title with a bug
          cannot spend past its season.
        </p>

        {seasons.state === 'loading' && <Loading label="Reading seasons" />}
        {(seasons.state === 'failed' || seasons.state === 'forbidden') && seasons.error !== null && (
          <Failed notice={seasons.error} onRetry={seasons.reload} title="Seasons did not load" />
        )}
        {seasons.state === 'empty' && (
          <Empty
            title="This title has no seasons"
            hint="Opening one sets a money budget, so it is an operator's act rather than a title's — a title that could set its own reward budget could pay itself."
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
                    <Fact label="Runs">
                      {timestamp(season.startsAt)} → {timestamp(season.endsAt)}
                    </Fact>
                    <Fact label="Opened with">
                      <span className="cf-num">{shards(season.rewardBudgetShards)}</span> Shards
                    </Fact>
                    <Fact label="Granted so far">
                      <span className="cf-num">{shards(season.rewardsGrantedShards)}</span> Shards
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
