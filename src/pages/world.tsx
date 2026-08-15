/**
 * One world of *Ninety Days After* — the homestead, the ground around it, and tomorrow.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE ORDER OF THIS PAGE IS THE ARGUMENT IT MAKES.
 *
 * The day's orders come SECOND, under the vitals that decide what to order and above everything
 * else. That is the whole point of the screen: a season resolves on a clock whether or not anybody
 * was watching, so the one thing a reader must be able to do in ten seconds is spend six action
 * points and leave. Every other panel — the feed, the standing, the tree, the commune — is a
 * reason to have chosen differently, and reasons go after the decision they inform, not in a column
 * beside it. A control a reader has to scroll a side column to find is a control that does not
 * exist; this estate has already shipped that page once.
 *
 * ── The map is the signature, and it is a CONTROL, not an illustration ────────────────────────
 *
 * Scavenging takes coordinates (`parseActions` in `nda/src/server.ts`: `scavenge{x,y}`), and the
 * form for that is a pair of number boxes only if you have never had to pick a tile. The grid is
 * the interface: every cell is a button, its terrain is what it is worth, the homesteads on it are
 * who will notice, and pressing one queues a scavenge there. It also means the map cannot become
 * decoration — it is load-bearing, so it stays honest.
 *
 * ── One `mintedAt`, bumped after every success ────────────────────────────────────────────────
 *
 * `withIdempotency` (`nda/src/idempotency.ts`) stores a fingerprint of the request beside the key
 * and throws when the same key comes back with a different body. So a key minted once per page view
 * would be right for a retry and WRONG for a second, different decision. This page mints one, uses
 * it for every write, and mints a new one the moment a write succeeds: a retry of a failure replays
 * safely, and a fresh decision after a success is a fresh key. The subjects carry the content too —
 * see `idempotencyKeyFor` and `actionsFingerprint` in `src/lib/nda.ts`.
 *
 * ── A 404 from `/me` is not an error ──────────────────────────────────────────────────────────
 *
 * `mustBeSettled` answers 404 `you have not settled in this world` to everybody who has not joined,
 * which is every reader the first time. The world is fetched FIRST, so a 404 that follows a
 * successful world read can only mean "not settled" — no message matching, no guessing — and the
 * page renders the way in rather than a failure.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, Failed, Forbidden, Loading } from '../components/states.tsx'
import { Fact, StateBadge } from '../components/tone.tsx'
import { NDA_EMBLEM, resourceArt, terrainArt } from '../art/nda.ts'
import { ApiError } from '../lib/api.ts'
import { useMutation } from '../lib/mutation.ts'
import {
  BRANCHES,
  PERKS,
  RESOURCES,
  actionMeaning,
  actionWord,
  branchMeaning,
  claimObjective,
  depositToCommune,
  foundCommune,
  joinCommune,
  joinWorld,
  leaveCommune,
  loadAchievements,
  loadCommune,
  loadCommunes,
  loadLeaderboard,
  loadMap,
  loadMe,
  loadObjectives,
  loadProgress,
  loadQueue,
  loadReports,
  loadRoster,
  loadWorld,
  loadWorldEvents,
  perkStanding,
  queueActions,
  terrainMeaning,
  unlockPerk,
  withdrawFromCommune,
  worldTone,
  type Commune,
  type LeaderboardEntry,
  type Progress,
  type QueuedAction,
  type Survivor,
  type Tile,
  type World,
} from '../lib/nda.ts'
import { useResource } from '../lib/resource.ts'

export function WorldPage() {
  const { worldId = '' } = useParams()

  /**
   * The world, and your survivor in it — in that order, deliberately.
   *
   * Sequential rather than parallel because the SECOND result is only interpretable in light of the
   * first: a 404 from `/me` after the world was fetched is "you have not settled here", and a 404
   * from the world itself is "no such world". Fired together, the two 404s are indistinguishable
   * without matching on an error message, which is a string another repository owns.
   */
  const load = useCallback(
    async (signal: AbortSignal): Promise<{ world: World; player: Survivor | null }> => {
      const { world } = await loadWorld(worldId, { signal })
      try {
        const { player } = await loadMe(worldId, { signal })
        return { world, player }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return { world, player: null }
        throw err
      }
    },
    [worldId],
  )
  // Count is always 1: this resource cannot be "empty". Not being settled is a state of the page,
  // not an absence of data, and rendering it as emptiness would put "nothing found" where the way
  // in belongs.
  const opening = useResource(load, () => 1, 'This world could not be opened.', [worldId])

  return (
    <>
      <p className="ww-backlink">
        <Link className="ww-link" to="/play">
          ← Every open world
        </Link>
      </p>

      {opening.state === 'loading' && <Loading label="Opening the world" />}
      {opening.state === 'forbidden' && opening.error !== null && (
        <Forbidden notice={opening.error} />
      )}
      {opening.state === 'failed' && opening.error !== null && (
        <Failed
          notice={opening.error}
          onRetry={opening.reload}
          title="This world is not on screen"
        />
      )}
      {opening.state === 'ok' && opening.data !== null && (
        <>
          <WorldHead world={opening.data.world} player={opening.data.player} />
          {opening.data.player === null ? (
            <Arrival world={opening.data.world} onSettled={opening.reload} />
          ) : (
            <TheDay
              world={opening.data.world}
              me={opening.data.player}
              onChanged={opening.reload}
            />
          )}
        </>
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── the header */

function WorldHead({ world, player }: { world: World; player: Survivor | null }) {
  const tone = worldTone(world)
  return (
    <header className="ww-head ww-worldhead">
      <div className="ww-worldhead__line">
        {/* The game's own roundel, at the size of the heading beside it. Decorative: the title is
            the world's name and the eyebrow on `/play` already said which game this is. */}
        <img className="ww-worldhead__mark" src={NDA_EMBLEM} alt="" width={40} height={40} />
        <h1 className="ww-head__title">{world.name}</h1>
        <StateBadge tone={tone} />
      </div>
      <p className="ww-head__lede">
        {tone.meaning}{' '}
        {player === null
          ? 'You have not settled here yet.'
          : `You are ${player.handle}, on the tile at ${player.homesteadX}, ${player.homesteadY}.`}
      </p>
    </header>
  )
}

/* ────────────────────────────────────────────────────────────────────── settling in */

/**
 * The way in, and what it costs to take it.
 *
 * Joining picks your tile for you — `joinWorld` in `nda/src/worlds.ts` places a homestead and hands
 * back the survivor — so the sentence says so rather than implying a choice the service does not
 * offer. Three days of spawn protection is a real rule of the engine and it is the single most
 * useful thing a new player can know, so it is on the button's own panel and not in a manual.
 */
function Arrival({ world, onSettled }: { world: World; onSettled: () => void }) {
  const [mintedAt] = useState(() => Date.now())
  const settle = useMutation(
    async () => joinWorld(world.id, mintedAt),
    'You have not settled in this world.',
  )

  return (
    <>
      <section className="ww-panel ww-arrival">
        <h2 className="ww-panel__title">Settle here</h2>
        <p className="ww-arrival__lede">
          A homestead is raised for you somewhere on the map — the ground decides where, not you.
          For your first three days nobody can raid it, which is the whole of the grace you get.
          After that you are a tile like any other.
        </p>
        <button
          className="cf-btn ww-arrival__go"
          type="button"
          disabled={settle.busy}
          onClick={() => void settle.run().then((done) => done !== null && onSettled())}
        >
          {settle.busy ? 'Raising your homestead…' : 'Settle in this world'}
        </button>
        {settle.error !== null && (
          <Failed notice={settle.error} title="You are not settled here" />
        )}
      </section>

      <Ground worldId={world.id} homestead={null} onScavenge={null} />
      <Standing worldId={world.id} meId={null} />
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── the settled game */

function TheDay({
  world,
  me,
  onChanged,
}: {
  world: World
  me: Survivor
  onChanged: () => void
}) {
  /**
   * One key per decision, replaced the moment one lands.
   *
   * See the file header: a retry of a failed write must present the SAME key, and a new decision
   * after a success must present a different one. Bumping on success is what separates the two.
   */
  const [mintedAt, setMintedAt] = useState(() => Date.now())
  const minted = useCallback(() => setMintedAt(Date.now()), [])

  const loadTheQueue = useCallback(
    async (signal: AbortSignal) => loadQueue(world.id, { signal }),
    [world.id],
  )
  const queue = useResource(loadTheQueue, () => 1, 'Your orders could not be fetched.', [world.id])

  /** Null until the reader edits, so the server's copy is what shows until they do. */
  const [draft, setDraft] = useState<readonly QueuedAction[] | null>(null)
  const orders = draft ?? queue.data?.actions ?? []

  const settled = useCallback(() => {
    setDraft(null)
    minted()
    queue.reload()
    onChanged()
  }, [minted, queue, onChanged])

  return (
    <>
      <Vitals me={me} />

      <Orders
        world={world}
        me={me}
        orders={orders}
        queue={queue}
        onEdit={setDraft}
        onSaved={settled}
        mintedAt={mintedAt}
      />

      <Ground
        worldId={world.id}
        homestead={{ x: me.homesteadX, y: me.homesteadY }}
        onScavenge={
          orders.length >= me.apPerDay
            ? null
            : (x, y) => setDraft([...orders, { type: 'scavenge', x, y }])
        }
      />

      <Feed worldId={world.id} />
      <Standing worldId={world.id} meId={me.id} />
      <SkillTree worldId={world.id} mintedAt={mintedAt} onSpent={settled} />
      <Objectives worldId={world.id} mintedAt={mintedAt} onClaimed={settled} />
      <Communes world={world} me={me} mintedAt={mintedAt} onChanged={settled} />
      <Earned worldId={world.id} />
      <Season worldId={world.id} />
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── vitals */

function Vitals({ me }: { me: Survivor }) {
  return (
    <section className="ww-panel ww-vitals">
      <h2 className="ww-panel__title">{me.handle}</h2>
      <p className="ww-vitals__state">
        {me.alive
          ? `Settled on day ${me.joinedDay}, and still standing.`
          : 'You did not survive. The homestead is still on the map, and the season carries on without you.'}
      </p>

      <div className="ww-gauges">
        <Gauge label="Health" value={me.hp} of={100} />
        <Gauge label="Morale" value={me.morale} of={100} />
      </div>

      <dl className="ww-facts">
        <Fact label="Defence">
          <span className="cf-num">{me.defense}</span>
        </Fact>
        <Fact label="Reputation">
          <span className="cf-num">{me.reputation}</span>
        </Fact>
        <Fact label="Actions a day">
          <span className="cf-num">{me.apPerDay}</span>
        </Fact>
        <Fact label="Homestead">
          <span className="cf-num">
            {me.homesteadX}, {me.homesteadY}
          </span>
        </Fact>
      </dl>

      <h3 className="ww-sub">What you are holding</h3>
      <ul className="ww-stock">
        {RESOURCES.map((key) => (
          <li className="ww-stock__item" key={key}>
            {/* Decorative: the count and the word beside it already say what this is, and an
                alt text repeating "food" would read the row twice. */}
            <img
              className="ww-stock__icon"
              src={resourceArt(key)}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
            />
            <span className="ww-stock__n cf-num">{me.resources[key] ?? 0}</span>
            <span className="ww-stock__k">{key}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Gauge({ label, value, of }: { label: string; value: number; of: number }) {
  const filled = Math.max(0, Math.min(1, of > 0 ? value / of : 0))
  return (
    <div className="ww-gauge">
      <div className="ww-gauge__line">
        <span className="ww-gauge__label">{label}</span>
        <span className="ww-gauge__value cf-num">
          {value}/{of}
        </span>
      </div>
      <div
        className="ww-gauge__track"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={of}
      >
        <div className="ww-gauge__fill" style={{ inlineSize: `${(filled * 100).toFixed(1)}%` }} />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── the day's orders */

/** What a player can queue from this screen, and the words for it. `parseActions` takes six. */
const SIMPLE_ACTIONS: ReadonlyArray<{ type: 'work' | 'rest' | 'fortify'; label: string }> = [
  { type: 'work', label: 'Work' },
  { type: 'rest', label: 'Rest' },
  { type: 'fortify', label: 'Fortify' },
]

function Orders({
  world,
  me,
  orders,
  queue,
  onEdit,
  onSaved,
  mintedAt,
}: {
  world: World
  me: Survivor
  orders: readonly QueuedAction[]
  queue: { state: string; reload: () => void }
  onEdit: (next: readonly QueuedAction[]) => void
  onSaved: () => void
  mintedAt: number
}) {
  const left = me.apPerDay - orders.length
  const save = useMutation(
    async () => queueActions(world.id, orders, mintedAt),
    'Your orders were not saved.',
  )

  const add = (action: QueuedAction) => {
    if (left <= 0) return
    onEdit([...orders, action])
  }

  return (
    <section className="ww-panel ww-orders">
      <div className="ww-orders__head">
        <h2 className="ww-panel__title">Tomorrow</h2>
        <p className="ww-orders__left">
          <span className="cf-num">{left}</span> of{' '}
          <span className="cf-num">{me.apPerDay}</span> actions left
        </p>
      </div>
      <p className="ww-orders__lede">
        The day resolves on its own, every {world.tickIntervalMinutes} minutes, with whatever is in
        this list. Saving replaces the whole list — it does not add to it — so an empty list is how
        you sit a day out.
      </p>

      <div className="ww-orders__add">
        {SIMPLE_ACTIONS.map((choice) => (
          <button
            key={choice.type}
            className="cf-btn ww-btn-quiet"
            type="button"
            disabled={left <= 0}
            onClick={() => add({ type: choice.type })}
            title={actionMeaning({ type: choice.type })}
          >
            {choice.label}
          </button>
        ))}
        <Raiding worldId={world.id} meId={me.id} disabled={left <= 0} onPick={add} />
      </div>
      <p className="ww-orders__hint">
        Scavenging takes a place, so it is queued by pressing a tile on the map below.
      </p>

      {orders.length === 0 ? (
        <p className="ww-orders__empty">
          Nothing queued. Tomorrow you will hold your ground and gather nothing.
        </p>
      ) : (
        <ol className="ww-queue">
          {orders.map((action, index) => (
            <li className="ww-queue__row" key={`${actionWord(action)}-${index}`}>
              <span className="ww-queue__n cf-num">{index + 1}</span>
              <span className="ww-queue__what">
                <span className="ww-queue__word">{actionWord(action)}</span>
                <span className="ww-queue__means">{actionMeaning(action)}</span>
              </span>
              <button
                className="ww-queue__drop"
                type="button"
                aria-label={`Remove ${actionWord(action)} from position ${index + 1}`}
                onClick={() => onEdit(orders.filter((_, at) => at !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="ww-orders__go">
        <button
          className="cf-btn"
          type="button"
          disabled={save.busy || queue.state === 'loading'}
          onClick={() => void save.run().then((done) => done !== null && onSaved())}
        >
          {save.busy ? 'Saving…' : 'Save tomorrow’s orders'}
        </button>
        {orders.length > 0 && (
          <button
            className="cf-btn ww-btn-quiet"
            type="button"
            disabled={save.busy}
            onClick={() => onEdit([])}
          >
            Clear the list
          </button>
        )}
      </div>
      {save.error !== null && <Failed notice={save.error} title="Your orders were not saved" />}
    </section>
  )
}

/**
 * Choosing somebody to raid.
 *
 * A select rather than a free id box, and the roster is what fills it — a raid names a
 * `targetPlayerId`, and a player who had to type a uuid would not raid anybody. The dead and the
 * spawn-protected are drawn but not selectable, because "you cannot raid them YET" is a fact worth
 * seeing; hiding them would make the map's homesteads and this list disagree.
 */
function Raiding({
  worldId,
  meId,
  disabled,
  onPick,
}: {
  worldId: string
  meId: string
  disabled: boolean
  onPick: (action: QueuedAction) => void
}) {
  const load = useCallback(async (signal: AbortSignal) => loadRoster(worldId, { signal }), [worldId])
  const roster = useResource(load, (d) => d.roster.length, 'The roster could not be fetched.', [
    worldId,
  ])
  const [target, setTarget] = useState('')

  const others = (roster.data?.roster ?? []).filter((r) => r.id !== meId && r.alive)

  return (
    <span className="ww-raid">
      <label className="ww-raid__label" htmlFor="ww-raid-target">
        Raid
      </label>
      <select
        id="ww-raid-target"
        className="ww-raid__pick"
        value={target}
        disabled={disabled || others.length === 0}
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value="">choose a homestead…</option>
        {others.map((entry) => (
          <option key={entry.id} value={entry.id} disabled={entry.spawnProtected}>
            {entry.handle}
            {entry.isBot ? ' (bot)' : ''}
            {entry.spawnProtected ? ' — protected' : ` — ${entry.homesteadX}, ${entry.homesteadY}`}
          </option>
        ))}
      </select>
      <button
        className="cf-btn ww-btn-quiet"
        type="button"
        disabled={disabled || target === ''}
        onClick={() => {
          onPick({ type: 'raid', targetPlayerId: target })
          setTarget('')
        }}
      >
        Add
      </button>
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────── the ground */

/**
 * The six terrains, in the order the key reads them: the two that are just ground, then the two
 * worth going to, then the two that belong to somebody. `Terrain` is a union rather than a runtime
 * list, and `terrainArt` is total over it, so a seventh terrain added to `src/lib/nda.ts` is a
 * compile error here rather than a blank square on the map.
 */
const TERRAINS = ['wilderness', 'forest', 'ruins', 'water', 'road', 'homestead'] as const

/**
 * The tile pictures, as six custom properties, built once for the module.
 *
 * Not per render and not per cell: a 24×24 world is 576 cells and an inline `background-image` on
 * each of them is 576 strings for six distinct pictures. The grid element carries the six, the
 * stylesheet's `.ww-cell--forest` reads its own, and the browser fetches each file once.
 */
const TILE_VARS: CSSProperties = Object.fromEntries(
  TERRAINS.map((t) => [`--ww-tile-${t}`, `url(${terrainArt(t)})`]),
) as CSSProperties

/**
 * The map, as the control it is.
 *
 * `onScavenge` is null in two cases and they mean different things: on the arrival screen there is
 * no queue to add to yet, and on a full day there is no action left to spend. Both render the grid
 * read-only rather than removing it — the ground is worth seeing before you settle, and worth
 * seeing when your day is already spent.
 */
function Ground({
  worldId,
  homestead,
  onScavenge,
}: {
  worldId: string
  homestead: { x: number; y: number } | null
  onScavenge: ((x: number, y: number) => void) | null
}) {
  const load = useCallback(async (signal: AbortSignal) => loadMap(worldId, { signal }), [worldId])
  const map = useResource(load, (d) => d.tiles.length, 'The map could not be fetched.', [worldId])

  return (
    <section className="ww-panel ww-ground">
      <h2 className="ww-panel__title">The ground</h2>
      <p className="ww-ground__lede">
        {onScavenge === null
          ? 'Ruins hold the most and cost the most to reach. Homesteads belong to somebody.'
          : 'Press a tile to send tomorrow’s scavenging party there. Ruins hold the most; homesteads belong to somebody.'}
      </p>

      {map.state === 'loading' && <Loading label="Drawing the map" />}
      {map.state === 'forbidden' && map.error !== null && <Forbidden notice={map.error} />}
      {map.state === 'failed' && map.error !== null && (
        <Failed notice={map.error} onRetry={map.reload} title="The map is not on screen" />
      )}
      {map.state === 'empty' && (
        <Empty title="This world has no ground yet" hint="The map is generated when the world is raised." />
      )}
      {map.state === 'ok' && map.data !== null && (
        <>
          {/*
           * The column count goes out as a CUSTOM PROPERTY rather than as `grid-template-columns`,
           * so the stylesheet keeps the minimum cell size. A track of `1fr` set from here would
           * divide a phone's 360px by 24 and draw a 15px cell with nothing legible in it; the rule
           * pairs this count with `minmax()` and a scrolling wrapper instead, which is the whole
           * reason the width is data and the layout is CSS.
           *
           * The six TILE PICTURES ride along the same way, and for a different reason:
           * `test/heraldry.test.ts` forbids spelling an `/art/` path anywhere in `src` outside
           * `src/art/`, and it checks the stylesheet too. So the paths are read from the catalogue
           * here — 576 cells share six declarations, one per terrain, rather than an inline
           * background per cell — and `styles.css` reads `var(--ww-tile-forest)`. Six, not one per
           * cell: the browser fetches each picture once and the grid stays cheap.
           */}
          <div className="ww-mapwrap">
            <div
              className="ww-map"
              style={{ ...TILE_VARS, ['--ww-map-cols' as string]: map.data.width } as CSSProperties}
            >
              {map.data.tiles.map((tile) => (
                <MapCell
                  key={`${tile.x}-${tile.y}`}
                  tile={tile}
                  mine={homestead !== null && homestead.x === tile.x && homestead.y === tile.y}
                  onScavenge={onScavenge}
                />
              ))}
            </div>
          </div>
          <ul className="ww-legend">
            {TERRAINS.map((t) => (
              <li className="ww-legend__item" key={t}>
                <img
                  className="ww-legend__tile"
                  src={terrainArt(t)}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                />
                <span className="ww-legend__word">{t}</span>
                <span className="ww-legend__means">{terrainMeaning(t)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function MapCell({
  tile,
  mine,
  onScavenge,
}: {
  tile: Tile
  mine: boolean
  onScavenge: ((x: number, y: number) => void) | null
}) {
  const where = `${tile.x}, ${tile.y}`
  const what = tile.ruinName ?? tile.terrain
  const label = mine ? `Your homestead at ${where}` : `${what} at ${where}`
  const className = `ww-cell ww-cell--${tile.terrain}${mine ? ' ww-cell--mine' : ''}`

  /*
   * THE CELL IS EMPTY, AND ITS TERRAIN IS STILL NEVER COLOUR ALONE.
   *
   * The picture arrives from the stylesheet, so there is nothing to put inside the element — the
   * glyph that used to sit here would be a smudge over a drawn tile at 24px. What replaces it as
   * the non-visual channel is the same thing that always carried it for a screen reader: the
   * accessible name, which names the terrain (or the ruin) and the coordinates. The tint beneath
   * the picture stays as the fallback for a tile that never loads.
   */
  if (onScavenge === null) {
    return <span className={className} title={label} aria-label={label} role="img" />
  }
  return (
    <button
      className={className}
      type="button"
      title={`${label} — press to scavenge here`}
      aria-label={`Scavenge ${label}`}
      onClick={() => onScavenge(tile.x, tile.y)}
    />
  )
}

/* ────────────────────────────────────────────────────────────────────── the feed */

function Feed({ worldId }: { worldId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => loadReports(worldId, { limit: 60, signal }),
    [worldId],
  )
  const reports = useResource(load, (d) => d.reports.length, 'The day’s reports could not be fetched.', [
    worldId,
  ])

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">What happened</h2>
      <p className="ww-ground__lede">
        Everything the world saw, and the lines addressed only to you. A raid on your homestead
        appears here whether or not you were watching when it resolved.
      </p>

      {reports.state === 'loading' && <Loading label="Reading the day" />}
      {reports.state === 'forbidden' && reports.error !== null && <Forbidden notice={reports.error} />}
      {reports.state === 'failed' && reports.error !== null && (
        <Failed notice={reports.error} onRetry={reports.reload} title="The reports are not on screen" />
      )}
      {reports.state === 'empty' && (
        <Empty
          title="Nothing has happened yet"
          hint="Reports are written when a day resolves. The first one arrives at the end of day one."
        />
      )}
      {reports.state === 'ok' && reports.data !== null && (
        <ol className="ww-reports">
          {reports.data.reports.map((report) => (
            <li className={`ww-report${report.isPublic ? '' : ' ww-report--private'}`} key={report.id}>
              <span className="ww-report__day cf-num">Day {report.day}</span>
              <span className="ww-report__text">{report.message}</span>
              {!report.isPublic && (
                <span className="ww-report__only" title="Only you can read this line">
                  yours alone
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────── the standing */

function Standing({ worldId, meId }: { worldId: string; meId: string | null }) {
  const load = useCallback(
    async (signal: AbortSignal) => loadLeaderboard(worldId, { signal }),
    [worldId],
  )
  const board = useResource(load, (d) => d.leaderboard.length, 'The standing could not be fetched.', [
    worldId,
  ])

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">Who is out there</h2>
      {board.state === 'loading' && <Loading label="Counting everybody" />}
      {board.state === 'forbidden' && board.error !== null && <Forbidden notice={board.error} />}
      {board.state === 'failed' && board.error !== null && (
        <Failed notice={board.error} onRetry={board.reload} title="The standing is not on screen" />
      )}
      {board.state === 'empty' && (
        <Empty title="Nobody has settled here yet" hint="You would be the first." />
      )}
      {board.state === 'ok' && board.data !== null && (
        <ol className="ww-board">
          {board.data.leaderboard.map((entry) => (
            <BoardRow key={entry.id} entry={entry} isMe={entry.id === meId} />
          ))}
        </ol>
      )}
    </section>
  )
}

function BoardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <li className={`ww-board__row${isMe ? ' ww-board__row--me' : ''}${entry.alive ? '' : ' ww-board__row--gone'}`}>
      <span className="ww-board__rank cf-num">{entry.rank}</span>
      <span className="ww-board__who">
        <span className="ww-board__handle">{entry.handle}</span>
        {entry.isBot && <span className="ww-board__tag">bot</span>}
        {isMe && <span className="ww-board__tag ww-board__tag--me">you</span>}
        {entry.communeName !== null && (
          <span className="ww-board__commune">of {entry.communeName}</span>
        )}
      </span>
      <span className="ww-board__stat cf-num" title="Days survived">
        {entry.daysSurvived}d
      </span>
      <span className="ww-board__stat cf-num" title="Level">
        L{entry.level}
      </span>
      <span className="ww-board__score cf-num" title="Score">
        {entry.score}
      </span>
    </li>
  )
}

/* ────────────────────────────────────────────────────────────────────── the tree */

function SkillTree({
  worldId,
  mintedAt,
  onSpent,
}: {
  worldId: string
  mintedAt: number
  onSpent: () => void
}) {
  const load = useCallback(async (signal: AbortSignal) => loadProgress(worldId, { signal }), [worldId])
  const progress = useResource(load, () => 1, 'Your progress could not be fetched.', [worldId])

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">What you have learned</h2>
      {progress.state === 'loading' && <Loading label="Adding it up" />}
      {progress.state === 'forbidden' && progress.error !== null && (
        <Forbidden notice={progress.error} />
      )}
      {progress.state === 'failed' && progress.error !== null && (
        <Failed
          notice={progress.error}
          onRetry={progress.reload}
          title="Your progress is not on screen"
        />
      )}
      {progress.state === 'ok' && progress.data !== null && (
        <Learned
          worldId={worldId}
          progress={progress.data.progress}
          mintedAt={mintedAt}
          onSpent={() => {
            progress.reload()
            onSpent()
          }}
        />
      )}
    </section>
  )
}

function Learned({
  worldId,
  progress,
  mintedAt,
  onSpent,
}: {
  worldId: string
  progress: Progress
  mintedAt: number
  onSpent: () => void
}) {
  const spend = useMutation(
    async (perkId: string) => unlockPerk(worldId, perkId, mintedAt),
    'That skill point was not spent.',
  )
  const toNext = progress.xpToNext > 0 ? progress.xp / (progress.xp + progress.xpToNext) : 1

  return (
    <>
      <dl className="ww-facts">
        <Fact label="Level">
          <span className="cf-num">{progress.level}</span>
        </Fact>
        <Fact label="Skill points">
          <span className="cf-num">{progress.skillPoints}</span>
        </Fact>
        <Fact label="Days survived">
          <span className="cf-num">{progress.daysSurvived}</span>
        </Fact>
        <Fact label="Days in a row seen">
          <span className="cf-num">{progress.streak}</span>
        </Fact>
        <Fact label="Tokens">
          <span className="cf-num">{progress.tokens}</span>
        </Fact>
        <Fact label="Given to the commune">
          <span className="cf-num">{progress.contribution}</span>
        </Fact>
      </dl>

      <div className="ww-gauge">
        <div className="ww-gauge__line">
          <span className="ww-gauge__label">Toward level {progress.level + 1}</span>
          <span className="ww-gauge__value cf-num">{progress.xpToNext} to go</span>
        </div>
        <div className="ww-gauge__track">
          <div className="ww-gauge__fill" style={{ inlineSize: `${(toNext * 100).toFixed(1)}%` }} />
        </div>
      </div>

      <p className="ww-orders__hint">
        Looking counts: the run of days you have opened this world feeds a morale bonus, which is
        why the streak is a number and not a decoration.
      </p>

      <div className="ww-branches">
        {BRANCHES.map((branch) => (
          <div className="ww-branch" key={branch}>
            <h3 className="ww-sub">{branch}</h3>
            <p className="ww-branch__means">{branchMeaning(branch)}</p>
            <ul className="ww-perks">
              {PERKS.filter((p) => p.branch === branch).map((perk) => {
                const standing = perkStanding(perk, progress)
                return (
                  <li className={`ww-perk${standing.held ? ' ww-perk--held' : ''}`} key={perk.id}>
                    <span className="ww-perk__name">{perk.name}</span>
                    <span className="ww-perk__what">{perk.description}</span>
                    {standing.held ? (
                      <span className="ww-perk__state">learned</span>
                    ) : standing.blockedBy !== null ? (
                      <span className="ww-perk__state">after {standing.blockedBy.name}</span>
                    ) : (
                      <button
                        className="cf-btn ww-btn-quiet"
                        type="button"
                        disabled={spend.busy || !standing.affordable}
                        onClick={() => void spend.run(perk.id).then((d) => d !== null && onSpent())}
                      >
                        {standing.affordable ? 'Learn it' : 'No points'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {spend.error !== null && <Failed notice={spend.error} title="That skill point was not spent" />}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── objectives */

function Objectives({
  worldId,
  mintedAt,
  onClaimed,
}: {
  worldId: string
  mintedAt: number
  onClaimed: () => void
}) {
  const load = useCallback(
    async (signal: AbortSignal) => loadObjectives(worldId, { signal }),
    [worldId],
  )
  const objectives = useResource(
    load,
    (d) => d.objectives.length,
    'Your objectives could not be fetched.',
    [worldId],
  )
  const claim = useMutation(
    async (objectiveId: string) => claimObjective(worldId, objectiveId, mintedAt),
    'That reward was not claimed.',
  )

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">Worth doing</h2>
      {objectives.state === 'loading' && <Loading label="Checking what is open" />}
      {objectives.state === 'forbidden' && objectives.error !== null && (
        <Forbidden notice={objectives.error} />
      )}
      {objectives.state === 'failed' && objectives.error !== null && (
        <Failed
          notice={objectives.error}
          onRetry={objectives.reload}
          title="Your objectives are not on screen"
        />
      )}
      {objectives.state === 'empty' && (
        <Empty title="Nothing is open right now" hint="New objectives are set as the season turns over." />
      )}
      {objectives.state === 'ok' && objectives.data !== null && (
        <ul className="ww-objectives">
          {objectives.data.objectives.map((objective) => {
            const done = objective.progress >= objective.target
            const through = objective.target > 0 ? objective.progress / objective.target : 0
            return (
              <li className="ww-objective" key={objective.id}>
                <span className="ww-objective__what">{objective.description}</span>
                <span className="ww-objective__period">{objective.period}</span>
                <div className="ww-gauge__track ww-objective__track">
                  <div
                    className="ww-gauge__fill"
                    style={{ inlineSize: `${(Math.min(1, through) * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="ww-objective__count cf-num">
                  {objective.progress}/{objective.target}
                </span>
                <span className="ww-objective__pays cf-num">
                  {objective.rewardXp} xp · {objective.rewardTokens} tokens
                </span>
                {objective.claimed ? (
                  <span className="ww-perk__state">claimed</span>
                ) : (
                  <button
                    className="cf-btn ww-btn-quiet"
                    type="button"
                    disabled={claim.busy || !done}
                    onClick={() =>
                      void claim.run(objective.id).then((d) => {
                        if (d !== null) {
                          objectives.reload()
                          onClaimed()
                        }
                      })
                    }
                  >
                    {done ? 'Claim it' : 'Not yet'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {claim.error !== null && <Failed notice={claim.error} title="That reward was not claimed" />}
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────── communes */

function Communes({
  world,
  me,
  mintedAt,
  onChanged,
}: {
  world: World
  me: Survivor
  mintedAt: number
  onChanged: () => void
}) {
  const load = useCallback(
    async (signal: AbortSignal) => loadCommunes(world.id, { signal }),
    [world.id],
  )
  const communes = useResource(load, (d) => d.communes.length, 'The communes could not be fetched.', [
    world.id,
  ])

  const after = (done: unknown) => {
    if (done !== null) {
      communes.reload()
      onChanged()
    }
  }

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">Communes</h2>
      <p className="ww-ground__lede">
        A shared stockpile with a daily allowance on the way out, so what you put in is not what
        somebody else can take out in one morning.
      </p>

      {communes.state === 'loading' && <Loading label="Asking around" />}
      {communes.state === 'forbidden' && communes.error !== null && (
        <Forbidden notice={communes.error} />
      )}
      {communes.state === 'failed' && communes.error !== null && (
        <Failed
          notice={communes.error}
          onRetry={communes.reload}
          title="The communes are not on screen"
        />
      )}
      {(communes.state === 'ok' || communes.state === 'empty') &&
        (me.communeId === null ? (
          <Unaffiliated
            world={world}
            communes={communes.data?.communes ?? []}
            mintedAt={mintedAt}
            after={after}
          />
        ) : (
          <Member world={world} communeId={me.communeId} mintedAt={mintedAt} after={after} />
        ))}
    </section>
  )
}

function Unaffiliated({
  world,
  communes,
  mintedAt,
  after,
}: {
  world: World
  communes: readonly Commune[]
  mintedAt: number
  after: (done: unknown) => void
}) {
  const [name, setName] = useState('')
  const found = useMutation(
    async () => foundCommune(world.id, name.trim(), mintedAt),
    'That commune was not founded.',
  )
  const join = useMutation(
    async (communeId: string) => joinCommune(world.id, communeId, mintedAt),
    'You did not join that commune.',
  )

  return (
    <>
      {communes.length === 0 ? (
        <Empty title="Nobody has founded one yet" hint="You could be the first, and the founding is free." />
      ) : (
        <ul className="ww-communes">
          {communes.map((commune) => (
            <li className="ww-commune" key={commune.id}>
              <span className="ww-commune__name">{commune.name}</span>
              <span className="ww-commune__who">
                {commune.memberCount} member{commune.memberCount === 1 ? '' : 's'}, founded by{' '}
                {commune.founderHandle}
              </span>
              <span className="ww-commune__stock cf-num">
                {RESOURCES.reduce((sum, key) => sum + (commune.stockpile[key] ?? 0), 0)} in the
                stockpile
              </span>
              <button
                className="cf-btn ww-btn-quiet"
                type="button"
                disabled={join.busy}
                onClick={() => void join.run(commune.id).then(after)}
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
      {join.error !== null && <Failed notice={join.error} title="You did not join that commune" />}

      <form
        className="ww-form"
        onSubmit={(e) => {
          e.preventDefault()
          void found.run().then(after)
        }}
      >
        <label className="ww-field">
          <span className="ww-field__label">Found your own</span>
          <span className="ww-field__hint">
            Anybody in this world can then ask to join it, and you cannot stop them.
          </span>
          <input
            className="ww-field__input"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="cf-btn" type="submit" disabled={found.busy || name.trim().length === 0}>
          {found.busy ? 'Founding…' : 'Found it'}
        </button>
      </form>
      {found.error !== null && <Failed notice={found.error} title="That commune was not founded" />}
    </>
  )
}

function Member({
  world,
  communeId,
  mintedAt,
  after,
}: {
  world: World
  communeId: string
  mintedAt: number
  after: (done: unknown) => void
}) {
  const load = useCallback(
    async (signal: AbortSignal) => loadCommune(world.id, communeId, { signal }),
    [world.id, communeId],
  )
  const commune = useResource(load, () => 1, 'Your commune could not be fetched.', [
    world.id,
    communeId,
  ])

  const [bag, setBag] = useState<Record<string, number>>({})
  const carried = Object.fromEntries(
    Object.entries(bag).filter(([, n]) => Number.isFinite(n) && n > 0),
  )

  const put = useMutation(
    async () => depositToCommune(world.id, communeId, carried, mintedAt),
    'Nothing was put into the stockpile.',
  )
  const take = useMutation(
    async () => withdrawFromCommune(world.id, communeId, carried, mintedAt),
    'Nothing was taken from the stockpile.',
  )
  const leave = useMutation(
    async () => leaveCommune(world.id, communeId, mintedAt),
    'You are still a member.',
  )

  const moved = (done: unknown) => {
    if (done !== null) {
      setBag({})
      commune.reload()
    }
    after(done)
  }

  // A const rather than `commune.data` at each use: a property read cannot stay narrowed inside the
  // `.map` closures below, and the alternative is a non-null assertion on data that really can be
  // null.
  const detail = commune.data

  return (
    <>
      {commune.state === 'loading' && <Loading label="Opening the stores" />}
      {commune.state === 'forbidden' && commune.error !== null && <Forbidden notice={commune.error} />}
      {commune.state === 'failed' && commune.error !== null && (
        <Failed
          notice={commune.error}
          onRetry={commune.reload}
          title="Your commune is not on screen"
        />
      )}
      {commune.state === 'ok' && detail !== null && (
        <>
          <h3 className="ww-sub">{detail.commune.name}</h3>
          <ul className="ww-stock">
            {RESOURCES.map((key) => (
              <li className="ww-stock__item" key={key}>
                <img
                  className="ww-stock__icon"
                  src={resourceArt(key)}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
                <span className="ww-stock__n cf-num">
                  {detail.commune.stockpile[key] ?? 0}
                </span>
                <span className="ww-stock__k">{key}</span>
                <span className="ww-stock__allow cf-num" title="What you may still take today">
                  {detail.allowance[key] ?? 0} left to you today
                </span>
              </li>
            ))}
          </ul>

          <ul className="ww-members">
            {detail.members.map((member) => (
              <li className="ww-member" key={member.playerId}>
                <span className="ww-member__handle">{member.handle}</span>
                {member.isFounder && <span className="ww-board__tag">founder</span>}
                {!member.alive && <span className="ww-board__tag">gone</span>}
                <span className="ww-member__gave cf-num" title="Given to the stockpile">
                  {member.contribution}
                </span>
              </li>
            ))}
          </ul>

          <form className="ww-form" onSubmit={(e) => e.preventDefault()}>
            <div className="ww-bag">
              {RESOURCES.map((key) => (
                <label className="ww-bag__field" key={key}>
                  <span className="ww-bag__label">
                    <img
                      className="ww-bag__icon"
                      src={resourceArt(key)}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                    />
                    {key}
                  </span>
                  <input
                    className="ww-field__input cf-num"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={bag[key] ?? ''}
                    onChange={(e) =>
                      setBag({ ...bag, [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="ww-orders__go">
              <button
                className="cf-btn"
                type="button"
                disabled={put.busy || Object.keys(carried).length === 0}
                onClick={() => void put.run().then(moved)}
              >
                {put.busy ? 'Carrying it over…' : 'Put it in'}
              </button>
              <button
                className="cf-btn ww-btn-quiet"
                type="button"
                disabled={take.busy || Object.keys(carried).length === 0}
                onClick={() => void take.run().then(moved)}
              >
                {take.busy ? 'Carrying it back…' : 'Take it out'}
              </button>
            </div>
          </form>
          {put.error !== null && <Failed notice={put.error} title="Nothing was put in" />}
          {take.error !== null && (
            <Failed
              notice={take.error}
              title={
                // The allowance is the likeliest refusal by a wide margin, and it is a rule rather
                // than a fault. Naming it stops a reader reading "not taken" as "broken".
                take.error.message.toLowerCase().includes('allowance')
                  ? 'You have taken your share for today'
                  : 'Nothing was taken out'
              }
            />
          )}

          <button
            className="cf-btn ww-btn-quiet ww-leave"
            type="button"
            disabled={leave.busy}
            onClick={() => void leave.run().then(after)}
          >
            {leave.busy ? 'Leaving…' : 'Leave this commune'}
          </button>
          {leave.error !== null && <Failed notice={leave.error} title="You are still a member" />}
        </>
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── the rest */

function Earned({ worldId }: { worldId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => loadAchievements(worldId, { signal }),
    [worldId],
  )
  const earned = useResource(
    load,
    (d) => d.achievements.length,
    'Your achievements could not be fetched.',
    [worldId],
  )

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">What you have earned here</h2>
      {earned.state === 'loading' && <Loading label="Looking it up" />}
      {earned.state === 'forbidden' && earned.error !== null && <Forbidden notice={earned.error} />}
      {earned.state === 'failed' && earned.error !== null && (
        <Failed
          notice={earned.error}
          onRetry={earned.reload}
          title="Your achievements are not on screen"
        />
      )}
      {earned.state === 'empty' && (
        <Empty
          title="Nothing yet"
          hint="These are this world's own; the ones your account carries across every title are on your account page."
        />
      )}
      {earned.state === 'ok' && earned.data !== null && (
        <ul className="ww-achievements">
          {earned.data.achievements.map((achievement) => (
            <li className="ww-achievement" key={achievement.achId}>
              <h3 className="ww-achievement__name">{achievement.name}</h3>
              <p className="ww-achievement__desc">{achievement.description}</p>
              <p className="ww-achievement__meta">
                <span className="cf-num">{achievement.points}</span> points
                {!achievement.delivered && ' · not on your platform account yet'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Season({ worldId }: { worldId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => loadWorldEvents(worldId, { signal }),
    [worldId],
  )
  const events = useResource(load, (d) => d.events.length, 'The season could not be fetched.', [
    worldId,
  ])

  return (
    <section className="ww-panel">
      <h2 className="ww-panel__title">The season itself</h2>
      <p className="ww-ground__lede">
        Weather and worse. These land on everybody in the world at once, whatever they had queued.
      </p>
      {events.state === 'loading' && <Loading label="Reading the sky" />}
      {events.state === 'forbidden' && events.error !== null && <Forbidden notice={events.error} />}
      {events.state === 'failed' && events.error !== null && (
        <Failed notice={events.error} onRetry={events.reload} title="The season is not on screen" />
      )}
      {events.state === 'empty' && (
        <Empty title="Nothing has come through yet" hint="The season has been quiet so far." />
      )}
      {events.state === 'ok' && events.data !== null && (
        <ol className="ww-events">
          {events.data.events.map((event) => (
            <li className="ww-event" key={`${event.day}-${event.type}`}>
              <span className="ww-report__day cf-num">Day {event.day}</span>
              <span className="ww-event__title">{event.title}</span>
              <span className="ww-event__what">{event.description}</span>
              <span className="ww-event__how cf-num" title="Severity">
                {'▲'.repeat(Math.max(1, Math.min(5, event.severity)))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
