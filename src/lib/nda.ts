/**
 * *Ninety Days After* — the game, from the browser.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THIS FILE EXISTS, AND WHY IT DID NOT UNTIL NOW
 *
 * `src/lib/catalogue.ts` used to say, about this title: "this game has no web client in the
 * estate… `micro-nda` serves the whole game — worlds, tiles, homesteads, the day-resolution
 * engine, communes, reports — and nothing renders it." That was true and it was the honest thing
 * to print, but it was never the finished position: a service that has been healthy for weeks and
 * cannot be reached from any browser on earth is a game nobody can play, and the register said
 * `draft` because of it rather than because the game was unfinished.
 *
 * Two things were missing, and neither was a feature:
 *
 *   1. **A DOOR.** `nda` is absent from `surfaces.ts`, so it has no hostname, no tunnel ingress
 *      rule and no Traefik router of its own — `admin-web/src/lib/worlds.ts` records exactly that,
 *      which is why the operator console reaches it through `admin-api` as a proxy. The door this
 *      file walks through is a new router on the API host: `cf-api-nda` in
 *      `deploy/gateway/dynamic/public-api.yml` carries `Host(api.<apex>) && PathPrefix(/v1/worlds)`
 *      to `nda:4000`. `/v1/worlds` is nda's ENTIRE public surface and nothing else on that host
 *      claims it — `micro-worlds` owns `/v1/titles`, `/v1/players`, `/v1/provisions` and
 *      `/v1/seasons`.
 *
 *   2. **A CLIENT.** This one. It goes through `api()` in `src/lib/api.ts`, which resolves to
 *      `api.<apex>` FOR THE NETWORK BEING VIEWED — so a reader looking at testnet plays the
 *      testnet estate's worlds without leaving the page, and mainnet's are untouched.
 *
 * ── THE SURFACE, READ OFF `nda/src/server.ts` ─────────────────────────────────────────────────
 *
 * Written down as a table because `test/nda.test.ts` checks it against the real service: every
 * route below must be REGISTERED there (found by searching for its `define(`/`defineMutation(`,
 * never by line), every mutation this client sends must be one nda declares idempotent, and a
 * route nda grows that neither column has heard of fails the build rather than going quiet. The
 * DECLINED half is a first-class column for that reason — an omission cannot be distinguished
 * from an oversight, and a written reason can.
 *
 *   | Method | Path                                        | This client                              |
 *   | ------ | ------------------------------------------- | ---------------------------------------- |
 *   | `GET`  | `/v1/worlds`                                | the list of worlds to play               |
 *   | `GET`  | `/v1/worlds/:id`                            | one world's header                       |
 *   | `GET`  | `/v1/worlds/:id/map`                        | the terrain grid                         |
 *   | `GET`  | `/v1/worlds/:id/roster`                     | who else is out there                    |
 *   | `GET`  | `/v1/worlds/:id/leaderboard`                | the same people, ranked                  |
 *   | `GET`  | `/v1/worlds/:id/events`                     | the season's own weather                 |
 *   | `GET`  | `/v1/worlds/:id/me`                         | your survivor — 404 means NOT SETTLED    |
 *   | `GET`  | `/v1/worlds/:id/actions`                    | what you have queued for tomorrow        |
 *   | `GET`  | `/v1/worlds/:id/reports`                    | what yesterday cost                      |
 *   | `GET`  | `/v1/worlds/:id/progress`                   | level, XP, skill points, streak          |
 *   | `GET`  | `/v1/worlds/:id/objectives`                 | what is worth doing, and its reward      |
 *   | `GET`  | `/v1/worlds/:id/achievements`               | what you have already earned here        |
 *   | `GET`  | `/v1/worlds/:id/communes`                   | the communes in this world               |
 *   | `GET`  | `/v1/worlds/:id/communes/:cid`              | one commune, its members and allowance   |
 *   | `POST` | `/v1/worlds/:id/join`                       | settle here                              |
 *   | `PUT`  | `/v1/worlds/:id/actions`                    | queue tomorrow — a REPLACE, not an add   |
 *   | `POST` | `/v1/worlds/:id/skills`                     | spend a skill point on a perk            |
 *   | `POST` | `/v1/worlds/:id/objectives/:oid/claim`      | take an objective's reward               |
 *   | `POST` | `/v1/worlds/:id/communes`                   | found one                                |
 *   | `POST` | `/v1/worlds/:id/communes/:cid/join`         | join one                                 |
 *   | `POST` | `/v1/worlds/:id/communes/:cid/deposit`      | put resources in the stockpile           |
 *   | `POST` | `/v1/worlds/:id/communes/:cid/withdraw`     | take from it, within the daily allowance |
 *   | `POST` | `/v1/worlds/:id/communes/:cid/leave`        | leave one                                |
 *   | `POST` | `/v1/events`                                | DECLINED — see below                     |
 *   | `GET`  | `/v1/worlds/:id/archive`                    | DECLINED — see below                     |
 *   | `GET`  | `/v1/worlds/:id/cosmetics`                  | DECLINED — see below                     |
 *   | `PUT`  | `/v1/worlds/:id/cosmetics`                  | DECLINED — see below                     |
 *   | `POST` | `/v1/worlds`                                | DECLINED — the operator console's        |
 *   | `POST` | `/v1/worlds/:id/start`                      | DECLINED — the operator console's        |
 *   | `PUT`  | `/v1/worlds/:id/bots`                       | DECLINED — the operator console's        |
 *   | `POST` | `/v1/worlds/:id/tick`                       | DECLINED — the operator console's        |
 *
 * **`POST /v1/events`** is the outbox INBOX: other services deliver domain events to it and nda
 * checks an HMAC over the body before it reads a field. A browser cannot hold that key, and one
 * that could would be able to forge any event in the estate. It is not a route with a missing
 * client; it is a route no client may ever have.
 *
 * **`GET /v1/worlds/:id/archive`** answers 409 for every world this client can see: it refuses
 * anything but `status = 'archived'`, and `GET /v1/worlds` here asks for `lobby,active`. A season
 * that has finished is a page worth building; it is not this page, and calling the route from a
 * screen that can only ever get a 409 out of it would be worse than not calling it.
 *
 * **The two cosmetics routes** are a SECOND wardrobe. The platform already owns one — `worlds`
 * serves `PUT /v1/players/me/cosmetics` keyed by title, and `/player` in this very bundle renders
 * it, grouped by title rather than flattened. Two wardrobes on two services, both reachable from
 * one bundle, is a question a player should never be asked ("which of these two outfits is the
 * one?"), so the platform's is the one this app edits and nda's is left to nda.
 *
 * **The four admin mutations** create a world, open it, set its bot count and force a day to
 * resolve. They need `worlds:admin` (a service) or `role:admin` (a person), and they already have
 * a screen: `admin-web/src/pages/worlds.tsx`, shipped in release 2026.08.47. A second copy of them
 * behind a player's session would be a control that answers 403 for everybody it is drawn for.
 *
 * ── EVERY MUTATION CARRIES AN `Idempotency-Key`, BECAUSE nda ANSWERS 400 WITHOUT ONE ──────────
 *
 * `defineMutation(..., 'header', ...)` wraps all fifteen of nda's writes, and `idempotently()`
 * throws `an Idempotency-Key header (1-200 characters) is required` when the header is absent —
 * so this is not a nicety, it is the difference between a working button and a 400. Note the
 * OTHER half, which decides how the keys below are built: nda stores a fingerprint of the request
 * beside the key and raises `IdempotencyKeyReuseError` when the same key arrives with a different
 * body. A key that named only the world would therefore let a player queue one set of actions and
 * then be REFUSED when they changed their mind. Every key here names the intention INCLUDING what
 * makes it different from the last one, and `mintedAt` is bumped by the page after each success,
 * so a retry of a failed write replays and a genuinely new decision does not.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { api } from './api.ts'
import type { Tone } from './format.ts'

/* ────────────────────────────────────────────────────────────────────── the world */

/** A world's place in its own life. `nda/src/worlds.ts`. */
export type WorldStatus = 'lobby' | 'active' | 'archived'

export interface World {
  readonly id: string
  readonly name: string
  /** What makes a world reproducible — same seed, same inputs, byte-identical resolution. */
  readonly seed: string
  readonly status: WorldStatus
  /** Which day of the season has resolved. `0` until the world starts. */
  readonly day: number
  readonly seasonLength: number
  readonly width: number
  readonly height: number
  readonly tickIntervalMinutes: number
  readonly humans: number
  readonly bots: number
}

/** The six things a homestead can hold. `RESOURCE_KEYS` in `nda/src/rules.ts`. */
export const RESOURCES = ['food', 'water', 'materials', 'fuel', 'medicine', 'seeds'] as const
export type ResourceKey = (typeof RESOURCES)[number]

/** What a tile can be. `TERRAINS` in `nda/src/rules.ts`. */
export type Terrain = 'wilderness' | 'forest' | 'ruins' | 'water' | 'road' | 'homestead'

export interface Tile {
  readonly x: number
  readonly y: number
  readonly terrain: Terrain
  readonly ruinName: string | null
  /** The survivor whose homestead this is, or null. */
  readonly ownerId: string | null
}

export interface RosterEntry {
  readonly id: string
  readonly handle: string
  readonly isBot: boolean
  readonly alive: boolean
  readonly reputation: number
  readonly homesteadX: number
  readonly homesteadY: number
  readonly communeName: string | null
  readonly level: number
  readonly daysSurvived: number
  readonly score: number
  /** True for the first three days after settling: a raid aimed here does nothing. */
  readonly spawnProtected: boolean
  readonly cosmeticStyle: string | null
}

export interface LeaderboardEntry extends RosterEntry {
  readonly rank: number
}

export interface WorldEvent {
  readonly day: number
  readonly type: string
  readonly title: string
  readonly description: string
  readonly severity: number
}

/* ────────────────────────────────────────────────────────────────────── one survivor */

export interface Survivor {
  readonly id: string
  readonly worldId: string
  readonly handle: string
  readonly isBot: boolean
  readonly homesteadX: number
  readonly homesteadY: number
  readonly resources: Readonly<Record<string, number>>
  readonly hp: number
  readonly morale: number
  readonly defense: number
  readonly reputation: number
  readonly alive: boolean
  /** How many actions a day buys. Six, before perks. */
  readonly apPerDay: number
  readonly communeId: string | null
  readonly cosmetics: Readonly<Record<string, string>>
  readonly joinedDay: number
}

export interface Progress {
  readonly level: number
  readonly xp: number
  readonly xpToNext: number
  readonly skillPoints: number
  readonly perks: readonly string[]
  readonly tokens: number
  /** Consecutive days seen. It feeds the morale bonus, which is why looking counts as playing. */
  readonly streak: number
  readonly daysSurvived: number
  readonly contribution: number
}

export interface Report {
  readonly id: string
  readonly day: number
  readonly kind: string
  /** False for a report only you can read. The service decides; this is display only. */
  readonly isPublic: boolean
  readonly message: string
  readonly actorHandle: string | null
  readonly targetHandle: string | null
}

export interface Objective {
  readonly id: string
  readonly kind: string
  readonly description: string
  readonly target: number
  readonly progress: number
  readonly period: string
  readonly rewardXp: number
  readonly rewardTokens: number
  readonly claimed: boolean
}

export interface Achievement {
  readonly achId: string
  readonly name: string
  readonly description: string
  readonly points: number
  readonly unlockedAt: number
  readonly delivered: boolean
}

/* ────────────────────────────────────────────────────────────────────── communes */

export interface Commune {
  readonly id: string
  readonly worldId: string
  readonly name: string
  readonly founderHandle: string
  readonly memberCount: number
  readonly stockpile: Readonly<Record<string, number>>
}

export interface CommuneMember {
  readonly playerId: string
  readonly handle: string
  readonly isBot: boolean
  readonly alive: boolean
  readonly isFounder: boolean
  readonly contribution: number
}

export interface CommuneDetail {
  readonly commune: Commune
  readonly members: readonly CommuneMember[]
  /** What a member may still take today, per resource. */
  readonly allowance: Readonly<Record<string, number>>
}

/* ────────────────────────────────────────────────────────────────────── what a day buys */

/**
 * One queued action. `QueuedAction` in `nda/src/rules.ts`, and nda parses it exhaustively on
 * `type` — an unknown one is a 400 naming the index rather than a silently dropped instruction.
 *
 * `trade` exists on the wire and is deliberately not offered by this client yet: it needs a
 * counterparty, two resource bags and a reason to trust the other side, and a form for it that
 * nobody could evaluate would be worse than the commune stockpile, which does the same job with
 * an allowance behind it. Queueing one is still possible for anything that builds an action list;
 * this bundle simply does not draw the control.
 */
export type QueuedAction =
  | { readonly type: 'work' }
  | { readonly type: 'rest' }
  | { readonly type: 'fortify' }
  | { readonly type: 'scavenge'; readonly x: number; readonly y: number }
  | { readonly type: 'raid'; readonly targetPlayerId: string }
  | {
      readonly type: 'trade'
      readonly targetPlayerId: string
      readonly offer: Readonly<Record<string, number>>
      readonly request: Readonly<Record<string, number>>
    }

/** What each action does, in the player's words rather than the engine's. */
export function actionMeaning(action: QueuedAction): string {
  switch (action.type) {
    case 'work':
      return 'Work the homestead — food and water, reliably, from land you already hold.'
    case 'rest':
      return 'Rest — health and morale back, and nothing gathered.'
    case 'fortify':
      return 'Fortify — spend materials to make a raid on you cost more than it earns.'
    case 'scavenge':
      return `Scavenge (${action.x}, ${action.y}) — what the tile holds, and whatever else is out there.`
    case 'raid':
      return 'Raid — take from another homestead, and be seen to have done it.'
    case 'trade':
      return 'Trade — hand over what you offered if they hand over what you asked.'
  }
}

/** A one-word label for the queue list. */
export function actionWord(action: QueuedAction): string {
  return action.type === 'scavenge' ? `Scavenge ${action.x},${action.y}` : action.type
}

/* ────────────────────────────────────────────────────────────────────── idempotency */

/**
 * A key for one INTENTION, not one click, and not one world.
 *
 * `idempotently()` in `nda/src/server.ts` requires 1–200 characters and answers 400 without one.
 * It also stores a fingerprint of the request body beside the key and raises
 * `IdempotencyKeyReuseError` when the same key returns with a different body — so a key that named
 * only the world would let a player queue `[work, work]`, change their mind, and be REFUSED. Every
 * `subject` passed here therefore carries whatever makes this decision different from the last
 * one: the perk id, the objective id, the fingerprint of the action list, the amounts.
 *
 * `mintedAt` is held by the page and bumped after each SUCCESS. A retry of a write that failed
 * presents the same key and replays; a new decision taken afterwards gets a fresh one.
 */
export function idempotencyKeyFor(scope: string, subject: string, mintedAt: number): string {
  // A header value cannot carry a newline — `fetch` throws before the request is sent — and a
  // commune's name is free text somebody may have pasted. Everything outside the safe set
  // collapses to `-`, exactly as `admin-web/src/lib/gate.ts` does it.
  const safe = subject.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `worlds-web-${scope}-${safe}-${mintedAt.toString(36)}`.slice(0, 200)
}

/** A stable, short description of an action list, so a changed queue gets a changed key. */
export function actionsFingerprint(actions: readonly QueuedAction[]): string {
  if (actions.length === 0) return 'empty'
  return actions
    .map((a) => {
      switch (a.type) {
        case 'scavenge':
          return `s${a.x}.${a.y}`
        case 'raid':
          return `d${a.targetPlayerId.slice(0, 8)}`
        case 'trade':
          return `t${a.targetPlayerId.slice(0, 8)}`
        default:
          return a.type.charAt(0)
      }
    })
    .join('-')
}

/** The same, for a resource bag: `food5.water2`, ordered so the order it was typed in is not in it. */
export function bagFingerprint(bag: Readonly<Record<string, number>>): string {
  const parts = Object.entries(bag)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => `${k}${n}`)
  return parts.length > 0 ? parts.join('.') : 'nothing'
}

/* ────────────────────────────────────────────────────────────────────── reads */

/**
 * A world id, safe to paste into a path.
 *
 * Every path below is written out in full rather than assembled from a helper, and that is on
 * purpose: `test/nda.test.ts` reads the literals in this file and matches them against nda's own
 * route table, so a path built out of fragments would be a path the test cannot see.
 */
const id = (value: string): string => encodeURIComponent(value)

/**
 * The worlds a player can walk into.
 *
 * `lobby` and `active` are nda's own default and this client restates neither: an archived world
 * is a finished season, and the screen that would read one is the archive page this bundle does
 * not have.
 */
export function listWorlds(opts: { signal?: AbortSignal } = {}): Promise<{
  worlds: readonly World[]
}> {
  return api('/v1/worlds', { ...(opts.signal ? { signal: opts.signal } : {}) })
}

export function loadWorld(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ world: World }> {
  return api(`/v1/worlds/${id(worldId)}`, { ...(opts.signal ? { signal: opts.signal } : {}) })
}

export function loadMap(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ width: number; height: number; tiles: readonly Tile[] }> {
  return api(`/v1/worlds/${id(worldId)}/map`, { ...(opts.signal ? { signal: opts.signal } : {}) })
}

export function loadRoster(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ roster: readonly RosterEntry[] }> {
  return api(`/v1/worlds/${id(worldId)}/roster`, { ...(opts.signal ? { signal: opts.signal } : {}) })
}

export function loadLeaderboard(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ leaderboard: readonly LeaderboardEntry[] }> {
  return api(`/v1/worlds/${id(worldId)}/leaderboard`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadWorldEvents(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ events: readonly WorldEvent[] }> {
  return api(`/v1/worlds/${id(worldId)}/events`, { ...(opts.signal ? { signal: opts.signal } : {}) })
}

/**
 * Your survivor in this world.
 *
 * **A 404 here is not an error.** `mustBeSettled` answers `you have not settled in this world`
 * for anybody who has not joined, which is every reader the first time they open a world — so the
 * page treats a 404 as "show the Join control" and anything else as a failure. Reading the status
 * is the caller's job (`src/pages/world.tsx`), because the resource hook's job is to distinguish
 * failure from emptiness and this is neither.
 *
 * It also RECORDS A LOGIN: the streak advances, and the streak feeds the morale bonus. Looking at
 * the world is part of playing it, which is worth knowing before deciding to poll this.
 */
export function loadMe(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ player: Survivor }> {
  return api(`/v1/worlds/${id(worldId)}/me`, { ...(opts.signal ? { signal: opts.signal } : {}) })
}

export function loadQueue(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ actions: readonly QueuedAction[] }> {
  return api(`/v1/worlds/${id(worldId)}/actions`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/** The day feed: everything public, plus the private lines addressed to you. */
export function loadReports(
  worldId: string,
  opts: { day?: number | undefined; limit?: number | undefined; signal?: AbortSignal } = {},
): Promise<{ reports: readonly Report[] }> {
  return api(`/v1/worlds/${id(worldId)}/reports`, {
    query: {
      ...(opts.day === undefined ? {} : { day: opts.day }),
      ...(opts.limit === undefined ? {} : { limit: opts.limit }),
    },
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadProgress(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ progress: Progress }> {
  return api(`/v1/worlds/${id(worldId)}/progress`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadObjectives(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ objectives: readonly Objective[] }> {
  return api(`/v1/worlds/${id(worldId)}/objectives`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadAchievements(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ achievements: readonly Achievement[] }> {
  return api(`/v1/worlds/${id(worldId)}/achievements`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadCommunes(
  worldId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ communes: readonly Commune[] }> {
  return api(`/v1/worlds/${id(worldId)}/communes`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

export function loadCommune(
  worldId: string,
  communeId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<CommuneDetail> {
  return api(`/v1/worlds/${id(worldId)}/communes/${id(communeId)}`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/* ────────────────────────────────────────────────────────────────────── writes */

/**
 * Settle here.
 *
 * 201 when the homestead is new, 200 when the key replayed one already raised. Either way the
 * survivor comes back, so the page has what it needs without a second read.
 */
export function joinWorld(
  worldId: string,
  mintedAt: number,
): Promise<{ player: Survivor; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/join`, {
    method: 'POST',
    body: {},
    headers: { 'idempotency-key': idempotencyKeyFor('join', worldId, mintedAt) },
  })
}

/**
 * Queue what tomorrow will attempt. **A REPLACE, not an append.**
 *
 * `queueActions` in `nda/src/worlds.ts` deletes every queued row and inserts what it was given,
 * bounded by the smaller of the engine's cap and the survivor's action points — so sending an
 * empty list is how a player cancels the day, and sending a list is how they set it. The page
 * therefore edits a local copy and submits the WHOLE list, which is also why the key fingerprints
 * the list: the same key with a different list is a refusal, not a replay.
 */
export function queueActions(
  worldId: string,
  actions: readonly QueuedAction[],
  mintedAt: number,
): Promise<{ actions: readonly QueuedAction[]; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/actions`, {
    method: 'PUT',
    body: { actions },
    headers: {
      'idempotency-key': idempotencyKeyFor(
        'queue',
        `${worldId}-${actionsFingerprint(actions)}`,
        mintedAt,
      ),
    },
  })
}

/** Spend a skill point. The perk id is in the key, because two perks are two decisions. */
export function unlockPerk(
  worldId: string,
  perkId: string,
  mintedAt: number,
): Promise<{ progress: Progress; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/skills`, {
    method: 'POST',
    body: { perkId },
    headers: { 'idempotency-key': idempotencyKeyFor('perk', `${worldId}-${perkId}`, mintedAt) },
  })
}

export function claimObjective(
  worldId: string,
  objectiveId: string,
  mintedAt: number,
): Promise<{
  objectiveId: string
  rewardXp: number
  rewardTokens: number
  progress: Progress
  replayed: boolean
}> {
  return api(`/v1/worlds/${id(worldId)}/objectives/${id(objectiveId)}/claim`, {
    method: 'POST',
    body: {},
    headers: { 'idempotency-key': idempotencyKeyFor('claim', objectiveId, mintedAt) },
  })
}

export function foundCommune(
  worldId: string,
  name: string,
  mintedAt: number,
): Promise<{ commune: Commune; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/communes`, {
    method: 'POST',
    body: { name },
    headers: { 'idempotency-key': idempotencyKeyFor('found', `${worldId}-${name}`, mintedAt) },
  })
}

export function joinCommune(
  worldId: string,
  communeId: string,
  mintedAt: number,
): Promise<{ commune: Commune; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/communes/${id(communeId)}/join`, {
    method: 'POST',
    body: {},
    headers: { 'idempotency-key': idempotencyKeyFor('commune-join', communeId, mintedAt) },
  })
}

/** Put resources in the stockpile. The amounts are in the key: 5 food and 9 food are not one act. */
export function depositToCommune(
  worldId: string,
  communeId: string,
  resources: Readonly<Record<string, number>>,
  mintedAt: number,
): Promise<{ commune: Commune; replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/communes/${id(communeId)}/deposit`, {
    method: 'POST',
    body: { resources },
    headers: {
      'idempotency-key': idempotencyKeyFor(
        'deposit',
        `${communeId}-${bagFingerprint(resources)}`,
        mintedAt,
      ),
    },
  })
}

/** Take from it, within today's allowance. nda refuses the excess; this client does not guess it. */
export function withdrawFromCommune(
  worldId: string,
  communeId: string,
  resources: Readonly<Record<string, number>>,
  mintedAt: number,
): Promise<{ replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/communes/${id(communeId)}/withdraw`, {
    method: 'POST',
    body: { resources },
    headers: {
      'idempotency-key': idempotencyKeyFor(
        'withdraw',
        `${communeId}-${bagFingerprint(resources)}`,
        mintedAt,
      ),
    },
  })
}

export function leaveCommune(
  worldId: string,
  communeId: string,
  mintedAt: number,
): Promise<{ replayed: boolean }> {
  return api(`/v1/worlds/${id(worldId)}/communes/${id(communeId)}/leave`, {
    method: 'POST',
    body: {},
    headers: { 'idempotency-key': idempotencyKeyFor('commune-leave', communeId, mintedAt) },
  })
}

/* ────────────────────────────────────────────────────────────────────── the skill tree */

export interface Perk {
  readonly id: string
  readonly branch: string
  readonly name: string
  readonly tier: number
  /** The perk this one is bought after, or null for a tier-1 root. */
  readonly requires: string | null
  readonly description: string
}

/**
 * The fifteen perks, MIRRORED from `SKILL_PERKS` in `nda/src/rules.ts`.
 *
 * A mirror is a liability and this one is held to it: `GET /v1/worlds/:id/progress` returns
 * `perks` as a list of IDS and nda serves no catalogue route, so a client that did not carry the
 * names would have to draw `farmer_2` at a player and call it a skill tree. Copying is the only
 * way to render it, and a copy that can drift silently is worse than no copy at all — so
 * `test/nda.test.ts` parses `SKILL_PERKS` out of the real `rules.ts` and requires every id, name,
 * tier, prerequisite and description below to match it exactly. A perk renamed in the engine turns
 * this repository red rather than putting the old name in front of a player.
 *
 * The EFFECTS are deliberately not mirrored. `aggregatePerks` caps `raidResist` and
 * `diseaseResist` at 0.9 and multiplies them into `1 - resist`, so the numbers on the wire do not
 * compose the way a reader would add them up; the descriptions below are what the engine's own
 * `description` field says, and arithmetic a client invented would be a second, wrong answer.
 */
export const PERKS: readonly Perk[] = [
  { id: 'farmer_1', branch: 'farmer', name: 'Green Thumb', tier: 1, requires: null, description: '+1 food from every work action.' },
  { id: 'farmer_2', branch: 'farmer', name: 'Crop Rotation', tier: 2, requires: 'farmer_1', description: '+1 water from every work action.' },
  { id: 'farmer_3', branch: 'farmer', name: 'Bountiful Harvest', tier: 3, requires: 'farmer_2', description: '+2 more food from every work action.' },
  { id: 'scavenger_1', branch: 'scavenger', name: 'Sharp Eyes', tier: 1, requires: null, description: '+25% scavenge haul.' },
  { id: 'scavenger_2', branch: 'scavenger', name: 'Pack Rat', tier: 2, requires: 'scavenger_1', description: '+25% more scavenge haul.' },
  { id: 'scavenger_3', branch: 'scavenger', name: 'Treasure Hunter', tier: 3, requires: 'scavenger_2', description: '+50% more scavenge haul.' },
  { id: 'warden_1', branch: 'warden', name: 'Palisade', tier: 1, requires: null, description: '+1 defense per fortify action.' },
  { id: 'warden_2', branch: 'warden', name: 'Watchtower', tier: 2, requires: 'warden_1', description: '+2 effective defense when raided.' },
  { id: 'warden_3', branch: 'warden', name: 'Bastion', tier: 3, requires: 'warden_2', description: '-40% damage taken from raids.' },
  { id: 'trader_1', branch: 'trader', name: 'Haggler', tier: 1, requires: null, description: '+1 reputation per successful trade.' },
  { id: 'trader_2', branch: 'trader', name: 'Fair Broker', tier: 2, requires: 'trader_1', description: '+1 bonus good received per trade.' },
  { id: 'trader_3', branch: 'trader', name: 'Merchant Prince', tier: 3, requires: 'trader_2', description: '+2 more bonus goods received per trade.' },
  { id: 'medic_1', branch: 'medic', name: 'First Aid', tier: 1, requires: null, description: '+5 hp restored per rest.' },
  { id: 'medic_2', branch: 'medic', name: 'Field Medicine', tier: 2, requires: 'medic_1', description: '+2 hp regenerated passively each day.' },
  { id: 'medic_3', branch: 'medic', name: 'Apothecary', tier: 3, requires: 'medic_2', description: '-50% disease damage.' },
]

/** What each branch is FOR, so a reader picks a direction rather than a row. */
export function branchMeaning(branch: string): string {
  switch (branch) {
    case 'farmer':
      return 'Get more out of ground you already hold.'
    case 'scavenger':
      return 'Get more out of everybody else’s.'
    case 'warden':
      return 'Make yourself expensive to raid.'
    case 'trader':
      return 'Make dealing with you worth somebody’s day.'
    case 'medic':
      return 'Stay standing.'
    default:
      return 'A branch this client does not have words for yet.'
  }
}

/** The branches, in the order the engine lists them. */
export const BRANCHES: readonly string[] = [...new Set(PERKS.map((p) => p.branch))]

/**
 * Can this perk be bought right now?
 *
 * The engine decides — this only stops the button being drawn where the answer is already known,
 * which is not the same thing as enforcing it. A perk with a prerequisite you do not hold, one you
 * already hold, and one you cannot pay for are three different sentences, so they are returned as
 * three rather than as `false`.
 */
export function perkStanding(
  perk: Perk,
  progress: Progress,
): { held: boolean; blockedBy: Perk | null; affordable: boolean } {
  const held = progress.perks.includes(perk.id)
  const prerequisite = perk.requires === null ? null : (PERKS.find((p) => p.id === perk.requires) ?? null)
  const blockedBy = prerequisite && !progress.perks.includes(prerequisite.id) ? prerequisite : null
  return { held, blockedBy, affordable: progress.skillPoints > 0 }
}

/* ────────────────────────────────────────────────────────────────────── plain words */

/**
 * What a world's status means to somebody deciding whether to open it.
 *
 * A `Tone` rather than a colour, so `StateBadge` renders it as a word, a glyph AND a hue — the
 * estate's reserved status colours sit ΔE 4.6 apart under protanopia, and a badge that said
 * "running" only by being green would say nothing to a reader who cannot separate it from the
 * amber one.
 */
export function worldTone(world: World): Tone {
  switch (world.status) {
    case 'lobby':
      return {
        tone: 'warn',
        glyph: '○',
        word: 'OPEN',
        meaning: 'Waiting to begin. Settle now and you are here for day one.',
      }
    case 'active':
      return {
        tone: 'good',
        glyph: '●',
        word: 'RUNNING',
        meaning: `Day ${world.day} of ${world.seasonLength}. A day resolves every ${world.tickIntervalMinutes} minutes.`,
      }
    case 'archived':
      return {
        tone: 'mute',
        glyph: '⊙',
        word: 'FINISHED',
        meaning: 'The season is over. Nothing more will resolve here.',
      }
  }
}

/*
 * THERE WAS A `terrainGlyph` HERE, AND WHAT REPLACED IT WAS NOT A COLOUR.
 *
 * While the game had no art in this bundle, the map drew six terrains as six characters, because
 * `src/styles.css` spends no literal colour and the estate's four semantic hues cannot tell six
 * things apart — and "state is never colour alone" is this app's rule everywhere else. The game's
 * own tiles are now catalogued in `src/art/nda.ts` and drawn on the cells, so the character would
 * be a smudge laid over a picture. The rule it existed to keep is kept by the two channels that
 * remain: every cell's `aria-label` names its terrain and its coordinates, and the tint beneath
 * each tile is still mixed from tokens for the case where the picture never arrives.
 */

/** Terrain, in one word a player can act on. */
export function terrainMeaning(terrain: Terrain): string {
  switch (terrain) {
    case 'wilderness':
      return 'Open ground. Thin pickings, and nobody watching.'
    case 'forest':
      return 'Timber and forage.'
    case 'ruins':
      return 'What is left of a town. The best scavenging, and the most dangerous.'
    case 'water':
      return 'Water. Nothing to carry away but the water itself.'
    case 'road':
      return 'A road. Things pass, and things get left.'
    case 'homestead':
      return 'Somebody lives here.'
  }
}
