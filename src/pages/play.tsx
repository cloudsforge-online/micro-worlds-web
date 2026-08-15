/**
 * The worlds that are open, and the way into one.
 *
 * ── Why this screen names a title when the index deliberately does not ────────────────────────
 *
 * `src/lib/routes.ts` keeps every title's name out of the route table on purpose: the register
 * decides which titles exist, and an address named after one of them would have to be added and
 * removed by hand every time that changes. This page is the other side of that rule rather than an
 * exception to it — it is one service's worlds, and `micro-nda` is the only service in the estate
 * that serves a playable `/v1/worlds`. The name belongs in the copy, where it is a fact about what
 * the reader is about to open, and not in the address, where it would be a promise the register
 * has not made.
 *
 * ── What "no worlds" means here, and what it does not ─────────────────────────────────────────
 *
 * An empty list is a cold start, not an outage. A world is RAISED by an operator — `POST
 * /v1/worlds` needs `role:admin`, and `admin-web/src/pages/worlds.tsx` is where that happens — so
 * the honest empty state points at that fact instead of asking the reader to try again. Nothing a
 * player can do makes a world appear, and an empty state that implied otherwise would be sending
 * them to press a button that does not exist.
 */
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { NDA_WORDMARK } from '../art/nda.ts'
import { Empty, Failed, Forbidden, Loading } from '../components/states.tsx'
import { StateBadge } from '../components/tone.tsx'
import { listWorlds, worldTone, type World } from '../lib/nda.ts'
import { useResource } from '../lib/resource.ts'

export function PlayPage() {
  const load = useCallback(async (signal: AbortSignal) => listWorlds({ signal }), [])
  const worlds = useResource(load, (data) => data.worlds.length, 'The worlds could not be fetched.')

  return (
    <>
      <header className="ww-head">
        {/*
         * The game's own sign, and the ONE place the wordmark is spent. It replaces the eyebrow
         * rather than sitting above it — two renderings of the same three words is a page that
         * cannot decide — so it carries the game's name as its alt text and the heading below says
         * what the game is instead of repeating it. A reader with images off reads the same page.
         */}
        <img
          className="ww-head__mark"
          src={NDA_WORDMARK}
          alt="Ninety Days After"
          width={768}
          height={209}
        />
        <h1 className="ww-head__title">Ninety days, one homestead</h1>
        <p className="ww-head__lede">
          A season is ninety days long and a day resolves on a clock, whether or not you were
          watching. You get six actions to spend on each one — work the ground, rest, fortify,
          scavenge the map, or take what somebody else gathered. Everything you own is on a tile
          somebody else can walk to.
        </p>
      </header>

      {worlds.state === 'loading' && <Loading label="Looking for open worlds" />}
      {worlds.state === 'forbidden' && worlds.error !== null && <Forbidden notice={worlds.error} />}
      {worlds.state === 'failed' && worlds.error !== null && (
        <Failed
          notice={worlds.error}
          onRetry={worlds.reload}
          title="The list of worlds is not on screen"
        />
      )}
      {worlds.state === 'empty' && (
        <Empty
          title="No world is open right now"
          hint="Worlds are raised by CloudsForge rather than by players, so there is nothing to press here. When the next season opens it will be listed on this page."
        />
      )}
      {worlds.state === 'ok' && worlds.data !== null && (
        <ul className="ww-worlds">
          {worlds.data.worlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </ul>
      )}
    </>
  )
}

function WorldCard({ world }: { world: World }) {
  const tone = worldTone(world)
  // A season is `seasonLength` days and `day` is how many have RESOLVED, so a lobby world reads 0
  // and the bar is empty rather than absent. Clamped because a world that has run past its length
  // is a real state (the engine stops resolving, the row stays) and a bar over 100% is not.
  const through = Math.max(0, Math.min(1, world.seasonLength > 0 ? world.day / world.seasonLength : 0))

  return (
    <li className="ww-world">
      <div className="ww-world__head">
        <h2 className="ww-world__name">{world.name}</h2>
        <StateBadge tone={tone} />
      </div>

      <p className="ww-world__meaning">{tone.meaning}</p>

      <div className="ww-season" aria-hidden="true">
        <div className="ww-season__bar" style={{ inlineSize: `${(through * 100).toFixed(1)}%` }} />
      </div>
      <p className="ww-season__label">
        <span className="cf-num">{world.day}</span> of{' '}
        <span className="cf-num">{world.seasonLength}</span> days resolved
      </p>

      <dl className="ww-world__facts">
        <div className="ww-world__fact">
          <dt>Ground</dt>
          <dd className="cf-num">
            {world.width}×{world.height}
          </dd>
        </div>
        <div className="ww-world__fact">
          <dt>People</dt>
          <dd className="cf-num">{world.humans}</dd>
        </div>
        <div className="ww-world__fact">
          <dt>Bots</dt>
          <dd className="cf-num">{world.bots}</dd>
        </div>
        <div className="ww-world__fact">
          <dt>A day takes</dt>
          <dd className="cf-num">{world.tickIntervalMinutes} min</dd>
        </div>
      </dl>

      <Link className="cf-btn ww-world__enter" to={`/play/${world.id}`}>
        {world.status === 'lobby' ? 'Settle here' : 'Enter this world'}
      </Link>
    </li>
  )
}
