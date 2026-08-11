/**
 * The `worlds` surface, as this app is allowed to use it.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * EVERY ROUTE BELOW WAS READ OUT OF `worlds/src/server.ts`, ONE AT A TIME, AND CARRIES THE LINE IT
 * WAS READ FROM.
 *
 * Not inferred from a sibling client, and not copied from `@cloudsforge/sdk` — that table is a
 * second reading of the same source and agreeing with it is evidence, not a shortcut. Eight
 * clients in this estate were built against a surface somebody imagined; one of them made every
 * on-chain escrow activation fail with a false diagnosis, and one sent a bearer token to a route
 * with no `authenticate()` call and then had to explain a 403 that was never about authorisation.
 *
 * `worlds` registers its routes through one `define(method, path, handler)` list
 * (`worlds/src/server.ts`), so the surface is enumerable and the citations are stable.
 * `test/worlds.test.ts` reads that file and fails if any route below is not registered in it,
 * found by SEARCHING for its `define(`. It used to name a LINE, and a line is a promise this
 * repository cannot keep: it names a position in a file micro-worlds owns and edits freely, so an
 * insertion near that service's imports moved every route below it and broke every citation here
 * while nothing in this bundle was wrong. CI bends a route to a path worlds does not serve, to
 * prove the check can still go red.
 *
 * ── CALLED ────────────────────────────────────────────────────────────────────────────────────
 *
 * | Method   | Path                                | Authenticates | Verified at                |
 * | -------- | ----------------------------------- | ------------- | -------------------------- |
 * | `GET`    | `/v1/titles`                        | **no**        | `worlds/src/server.ts` |
 * | `GET`    | `/v1/players/me`                    | yes           | `worlds/src/server.ts` |
 * | `PUT`    | `/v1/players/me`                    | yes           | `worlds/src/server.ts` |
 * | `PUT`    | `/v1/players/me/cosmetics`          | yes           | `worlds/src/server.ts` |
 * | `GET`    | `/v1/players/me/inventory`          | yes           | `worlds/src/server.ts` |
 * | `POST`   | `/v1/players/me/inventory/:id/list` | yes           | `worlds/src/server.ts` |
 * | `DELETE` | `/v1/players/me/inventory/:id/list` | yes           | `worlds/src/server.ts` |
 * | `GET`    | `/v1/provisions`                    | yes           | `worlds/src/server.ts` |
 * | `GET`    | `/v1/provisions/:id`                | yes           | `worlds/src/server.ts` |
 * | `GET`    | `/v1/titles/:id/achievements`       | **no**        | `worlds/src/server.ts` |
 * | `GET`    | `/v1/titles/:id/seasons`            | **no**        | `worlds/src/server.ts` |
 *
 * ── DECLINED, EACH FOR A STATED REASON ────────────────────────────────────────────────────────
 *
 * Declined is a first-class entry rather than an omission: `test/worlds.test.ts` requires this
 * file to account for EVERY `/v1` route the service registers, so a route that grows and is never
 * read cannot go quiet.
 *
 * | Method | Path                                  | Verified at                | Why not here |
 * | ------ | ------------------------------------- | -------------------------- | ------------ |
 * | `POST` | `/v1/events`                          | `worlds/src/server.ts` | The entitlement bridge's front door. It is HMAC-checked over the exact bytes received BEFORE `JSON.parse` (`server.ts`) with `OUTBOX_SIGNING_SECRET`. A browser cannot hold that key, and a bundle that shipped it would BE the free-worlds endpoint the check exists to prevent. |
 * | `POST` | `/v1/titles`                          | `worlds/src/server.ts` | Registering a title says where a customer's purchase will be sent. `server.ts` demands `worlds:admin` or `role:admin`. See "the empty registry" below — this is the missing piece, and it is missing from the ESTATE, not from this app. |
 * | `POST` | `/v1/provisions/:id/retry`            | `worlds/src/server.ts` | `server.ts` demands `worlds:admin` or `role:admin`. It is the only way out of `failed` (`server.ts`), and the service's own comment at `server.ts` says no view of failed rentals exists anywhere in the estate. That view belongs in the operator console; a player product growing an operator's escape hatch is how the console ends up in six repositories. Reported, not built here. |
 * | `PUT`  | `/v1/titles/:id/achievements`         | `worlds/src/server.ts` | `worlds:title` or `role:admin` (`server.ts`). A title service defines its own achievements. |
 * | `POST` | `/v1/titles/:id/achievements/unlock`  | `worlds/src/server.ts` | `worlds:title` or `role:admin` (`server.ts`). A title reports what a player did; a player does not report it about themselves. |
 * | `POST` | `/v1/titles/:id/seasons`              | `worlds/src/server.ts` | Opening a season sets a MONEY budget, so `server.ts` demands admin. `server.ts`: "A title that could set its own reward budget could pay itself." |
 * | `GET`  | `/v1/seasons/:id/budget`              | `worlds/src/server.ts` | A season's remaining reward budget is an operator's number, not a player's, and rendering "1,412 Shards left in the pot" to a player is an invitation to race for it. It is also the one worlds route the gateway does not route: `deploy/gateway/dynamic/public-api.yml` matches `/v1/titles`, `/v1/players` and `/v1/provisions` and not `/v1/seasons`, so it falls to that file's catch-all and is blackholed to `127.0.0.1:1`. Reported. |
 * | `POST` | `/v1/seasons/:id/rewards`             | `worlds/src/server.ts` | `worlds:title` or `role:admin` (`server.ts`). A title ASKS for a reward; it does not decide. Paying oneself from a browser is the exploit the budget exists to bound. |
 *
 * `/livez`, `/readyz` and `/metrics` are served as well. They are not
 * called from a browser and are not wrapped here.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── THREE ROUTES MAKE NO `authenticate()` CALL, AND THIS APP TREATS THEM ACCORDINGLY ───────────
 *
 * `GET /v1/titles`, `GET /v1/titles/:id/achievements` and
 * `GET /v1/titles/:id/seasons` contain no `await authenticate(ctx, deps)` at all. Their
 * handlers take a principal nowhere and read no `authorization` header, so a bearer sent to one is
 * neither honoured nor refused — it is *ignored*.
 *
 * The README template warns that "a client that sends a token to one of those gets a 403 it cannot
 * diagnose". **On `worlds` that is not what happens, and the difference matters.** There is no
 * middleware and no wrapper: `handle()` (`server.ts`) dispatches straight into the route's
 * own closure, and a handler that never calls `authenticate` never reaches `requireScope`, so
 * nothing can raise a `ForbiddenError`. A token sent to `GET /v1/titles` produces a 200. The real
 * defect on this service is quieter and worse: a client that BELIEVES those routes are gated will
 * put them behind a sign-in wall, and an anonymous visitor is then sent to sign in to read a
 * registry the service would have handed them. So they are sent with `auth: false` and their
 * screens are outside `ProtectedRoute` — see src/lib/routes.ts.
 *
 * ── NO `Idempotency-Key` ON ANY ROUTE, AND THAT IS A FACT RATHER THAN AN OMISSION ──────────────
 *
 * Four wallet routes and five market mutations in this estate answer **400** without an
 * `Idempotency-Key` header. None of `worlds`'s do: there is no `withIdempotentRoute` wrapper and
 * no such header read anywhere in `worlds/src/server.ts`. The protection is STATE instead —
 * `listForSale` runs one conditional UPDATE guarded by `and bound = false`
 * (`worlds/src/players.ts`), and the bridge's own idempotency key is the entitlement id, which
 * never passes through a browser. So this client sends no such header, and `test/worlds.test.ts`
 * asserts the service still reads none — which is what stops somebody "fixing" this client by
 * adding a header the service ignores, or concluding the reverse.
 *
 * ── NO PAY-TO-WIN, AND `bound` IS WHERE IT IS ENFORCED ────────────────────────────────────────
 *
 * `docs/ecosystem/01-product-vision.md` principle 6: purchasable means cosmetic, convenience or
 * access — never power. `worlds/src/players.ts` carries the same rule from
 * 04-domain-model §7.3: "`bound` is the anti-pay-to-win control: anything conferring power is
 * bound and cannot enter the market." The service refuses a listing with a 403 `item_bound`
 * (`worlds/src/server.ts`), backstopped by a WHERE clause and a CHECK constraint.
 *
 * `bound` is on the wire precisely so a client knows before it draws a control
 * (`worlds/src/server.ts`). This app therefore never renders an entitlement as an
 * advantage: `sourceMeaning` and `boundMeaning` in src/lib/format.ts say what an item IS, and the
 * inventory screen offers no "sell" control on a bound row at all — not a disabled one.
 */
import { api } from './api.ts'

/* ══════════════════════════════ the wire shapes ══════════════════════════════ */

/** `worlds/src/titles.ts` — five, and the app must render all of them. */
export const TITLE_STATUSES = ['draft', 'beta', 'live', 'sunset', 'retired'] as const
export type TitleStatus = (typeof TITLE_STATUSES)[number]

/**
 * What a title declares it can be asked to do — `worlds/src/titles.ts`.
 *
 * A CLOSED set, and `worlds/src/titles.ts` says why: these are read by the provisioning
 * bridge to decide whether a purchase can be delivered at all, so free text would turn a typo in a
 * registration into a purchase that is accepted and never provisioned.
 */
export const CAPABILITIES = [
  'private_world',
  'cosmetics',
  'achievements',
  'seasons',
  'inventory',
] as const
export type Capability = (typeof CAPABILITIES)[number]

/** One registry row, as `GET /v1/titles` puts it on the wire — `worlds/src/server.ts`. */
export interface Title {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly status: TitleStatus
  readonly capabilities: readonly Capability[]
  readonly assetScopes: readonly string[]
}

/**
 * A title that may be sold to — `worlds/src/titles.ts`.
 *
 * `draft` and `retired` cannot be, because a purchase would never be delivered. Duplicated here
 * as a PREDICATE rather than a list of names so it reads the same way the service does.
 */
export function isSellable(title: Title): boolean {
  return title.status === 'beta' || title.status === 'live'
}

/** The cross-title key in `equippedCosmetics` — `worlds/src/players.ts`. */
export const CROSS_TITLE = '*'

/** `worlds/src/players.ts` — an age bracket is a safeguarding fact, not a preference. */
export const AGE_BRACKETS = ['unknown', 'under_13', '13_to_15', '16_to_17', 'adult'] as const
export type AgeBracket = (typeof AGE_BRACKETS)[number]

/** `worlds/src/players.ts`. `scope` is a title id, or `*` when estate-wide. */
export interface Sanction {
  readonly kind: string
  readonly reason: string
  readonly appliedAt: string
  readonly expiresAt: string | null
  readonly scope: string
}

/**
 * The account-scoped profile — `worlds/src/players.ts`, serialised straight to the wire by
 * `GET /v1/players/me` (`worlds/src/server.ts`) with no `toWire`, so its `Date` fields arrive
 * as ISO strings.
 *
 * `equippedCosmetics` is keyed BY TITLE, and `worlds/src/players.ts` explains at length why
 * the flat shape it replaces cannot be migrated to: with one game the difference is invisible, and
 * with two it is the difference between "my frame in each game" and "my frame".
 */
export interface PlayerProfile {
  readonly userId: string
  readonly displayName: string
  readonly avatarAssetUrn: string | null
  readonly reputation: number
  /** `titleId | '*'` → `{ slot: cosmeticUrn }`. */
  readonly equippedCosmetics: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly sanctions: readonly Sanction[]
  readonly ageBracket: AgeBracket
  readonly parentalControls: Readonly<Record<string, unknown>>
  readonly createdAt: string
  readonly updatedAt: string
}

/** `worlds/src/players.ts`. Five ways an item arrives in an account. */
export const ITEM_SOURCES = ['purchase', 'reward', 'craft', 'market', 'grant'] as const
export type ItemSource = (typeof ITEM_SOURCES)[number]

/** One inventory row, as `toItemWire` puts it on the wire — `worlds/src/server.ts`. */
export interface InventoryItem {
  readonly id: string
  /** A title id, or `*` for something that crosses every title. */
  readonly titleScope: string
  readonly itemUrn: string
  readonly source: ItemSource
  readonly quantity: number
  /**
   * **The anti-pay-to-win control** (`worlds/src/players.ts`). On the wire "because a client
   * that offers a 'sell' button must know before it draws one" (`worlds/src/server.ts`).
   */
  readonly bound: boolean
  readonly entitlementId: string | null
  readonly listedAt: string | null
  readonly listingUrn: string | null
  readonly acquiredAt: string
}

/** `GET /v1/players/me`'s achievement rows — `worlds/src/server.ts`. */
export interface UnlockedAchievement {
  readonly key: string
  readonly titleId: string
  readonly name: string
  readonly points: number
  readonly unlockedAt: string
}

/** `worlds/src/rewards.ts` — as `GET /v1/titles/:id/achievements` renders it (`server.ts`). */
export interface Achievement {
  readonly id: string
  readonly titleId: string
  readonly key: string
  readonly name: string
  readonly description: string
  readonly points: number
  /**
   * WEI, as a decimal STRING. `worlds/src/server.ts:772` calls `.toString()` on a bigint.
   *
   * This field was `rewardShards` here until 2026-08-11 and the service stopped sending that name
   * on 2026-08-10 (micro-org#226). A missing field is `undefined` in TypeScript's structural world
   * and nothing red went off — the page read it, compared it against `'0'`, found them unequal
   * because `undefined` is unequal to everything, and rendered the payout clause with no number in
   * it. Measured on mainnet the same day: `GET /v1/titles/<id>/achievements` answers `rewardWei`
   * for all 47 rows.
   */
  readonly rewardWei: string
}

/** `worlds/src/rewards.ts`. */
export const SEASON_STATUSES = ['upcoming', 'active', 'ended', 'archived'] as const
export type SeasonStatus = (typeof SEASON_STATUSES)[number]

/**
 * One season, as `toSeasonWire` puts it on the wire — `worlds/src/server.ts:960`.
 *
 * Both money fields are WEI and both are STRINGS, always, and `worlds/src/server.ts` says why in
 * three words: "A budget is money." They were `rewardBudgetShards` and `rewardsGrantedShards` here
 * until 2026-08-11; see `Achievement.rewardWei` above for how a rename on one side of a wire goes
 * unnoticed on the other.
 */
export interface Season {
  readonly id: string
  readonly titleId: string
  readonly slug: string
  readonly name: string
  readonly startsAt: string
  readonly endsAt: string
  readonly status: SeasonStatus
  readonly rewardBudgetWei: string
  readonly rewardsGrantedWei: string
}

/** `worlds/src/provisioning.ts`. What a SKU means, resolved by a table not a heuristic. */
export const PROVISION_KINDS = [
  'private_world',
  'cosmetic',
  'season_pass',
  'convenience',
  'unknown',
] as const
export type ProvisionKind = (typeof PROVISION_KINDS)[number]

/**
 * `worlds/src/provisioning.ts`. Five states, and the app must render all five.
 *
 * `unsupported` is the one this product exists to be honest about: it is a customer who paid for
 * something undeliverable. `worlds/src/server.ts` says so in the metric's own help text.
 */
export const PROVISION_STATES = [
  'pending',
  'provisioning',
  'provisioned',
  'unsupported',
  'failed',
] as const
export type ProvisionState = (typeof PROVISION_STATES)[number]

/**
 * A provision, as `worlds/src/provisioning.ts` defines it. Serialised straight to the wire
 * by `GET /v1/provisions` (`worlds/src/server.ts`) with no `toWire`, so its `Date` fields
 * arrive as ISO strings.
 *
 * `lastError` is the load-bearing field on this surface. For an `unsupported` row it holds the
 * service's OWN sentence — `no delivery is defined for sku …`, `… does not declare the … capability`,
 * `the entitlement's scope … does not name a registered title`
 * (`worlds/src/provisioning.ts`) — and this app renders it verbatim rather
 * than paraphrasing it. See the note on `TITLE_BRIDGE_GAP` below.
 */
export interface Provision {
  readonly id: string
  readonly entitlementId: string
  readonly subject: string
  readonly sku: string
  readonly scope: string
  readonly titleId: string | null
  readonly kind: ProvisionKind
  readonly state: ProvisionState
  readonly provisionedUrn: string | null
  readonly metadata: Readonly<Record<string, unknown>>
  readonly attempts: number
  readonly lastError: string | null
  readonly leaseOwner: string | null
  readonly createdAt: string
  readonly provisionedAt: string | null
}

/* ══════════════════════════════ the calls ══════════════════════════════ */

/**
 * `GET /v1/titles` — `worlds/src/server.ts`.
 *
 * **Makes no `authenticate()` call**, and `worlds/src/server.ts` says why: "Public: a launcher
 * listing games cannot require a token to do it." Sent with `auth: false` — not because a token
 * would be refused, but because attaching one to a route that never asked for it is how a client
 * ends up reasoning about the wrong failure.
 *
 * `includeRetired` is the only query parameter the handler reads, and only the exact string
 * `'true'` turns it on (`server.ts`). Retired titles are excluded by default at
 * `worlds/src/titles.ts`.
 */
export function listTitles(
  opts: { includeRetired?: boolean; signal?: AbortSignal } = {},
): Promise<{ titles: readonly Title[] }> {
  return api<{ titles: readonly Title[] }>('/v1/titles', {
    auth: false,
    ...(opts.includeRetired ? { query: { includeRetired: 'true' } } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/**
 * `GET /v1/players/me` — `worlds/src/server.ts`.
 *
 * **`profile` may be null.** `findProfile` returns null for an account that has never set one
 * (`worlds/src/players.ts`) and the handler puts that null straight on the wire
 * (`server.ts`). It is not an error and it is not a loading state: it is a new player. The
 * type says so, and the screen renders it as an invitation rather than as a blank.
 *
 * **This route FAILS OPEN**, deliberately — `worlds/src/server.ts`: it runs on every app
 * load, so a billing outage must not be able to break signing in. "What someone is already
 * wearing is ours to answer."
 */
export interface PlayerSnapshot {
  readonly profile: PlayerProfile | null
  readonly inventory: readonly InventoryItem[]
  readonly achievements: readonly UnlockedAchievement[]
}

export function getPlayer(
  opts: { titleId?: string; signal?: AbortSignal } = {},
): Promise<PlayerSnapshot> {
  return api<PlayerSnapshot>('/v1/players/me', {
    ...(opts.titleId ? { query: { titleId: opts.titleId } } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/**
 * `PUT /v1/players/me` — `worlds/src/server.ts`.
 *
 * A full replace, not a patch. `displayName` is the only required field (`server.ts`,
 * `requireString`); `avatarAssetUrn` is read as a string or written as null (`server.ts`), so
 * omitting it CLEARS it. This client therefore always sends the whole document.
 *
 * `ageBracket` and `parentalControls` are accepted by the handler (`server.ts`) and are
 * deliberately NOT offered by this app: an age bracket is a safeguarding fact
 * (`worlds/src/players.ts`), and a screen that lets an account assert its own is a screen
 * that lets an account assert it is an adult.
 */
export interface ProfileInput {
  readonly displayName: string
  readonly avatarAssetUrn: string | null
}

export function putProfile(input: ProfileInput): Promise<{ profile: PlayerProfile }> {
  return api<{ profile: PlayerProfile }>('/v1/players/me', { method: 'PUT', body: input })
}

/**
 * `PUT /v1/players/me/cosmetics` — `worlds/src/server.ts`.
 *
 * **FAILS CLOSED**, and it is the deliberate mirror of `GET /v1/players/me`
 * (`worlds/src/server.ts`): a billing outage means "ask again later", not "wear it
 * anyway", and an unverified cosmetic is never persisted. The 503 arrives as
 * `entitlements_unavailable` (`server.ts`) and this app renders that as its own sentence
 * rather than as a generic failure.
 *
 * `itemUrn: null` CLEARS the slot, and the handler skips the entitlement check for it
 * (`server.ts`): "you may always take something off, including something you no longer
 * own". Omitting `titleId` equips across every title — the handler falls back to `CROSS_TITLE`
 * (`server.ts`).
 */
export interface EquipInput {
  readonly slot: string
  /** Null clears the slot. Never omitted: `undefined` and `null` are the same to the handler. */
  readonly itemUrn: string | null
  /** Omit for the cross-title default. */
  readonly titleId?: string
}

export function equipCosmetic(input: EquipInput): Promise<{ profile: PlayerProfile }> {
  return api<{ profile: PlayerProfile }>('/v1/players/me/cosmetics', { method: 'PUT', body: input })
}

/**
 * `GET /v1/players/me/inventory` — `worlds/src/server.ts`.
 *
 * Scoping by `titleId` returns that title's items AND the cross-title ones — the query is
 * `title_scope in (${titleScope}, '*')` (`worlds/src/players.ts`). So a title filter never
 * hides something the player owns everywhere, which is what a filter that used `=` would do.
 */
export function listInventory(
  opts: { titleId?: string; signal?: AbortSignal } = {},
): Promise<{ items: readonly InventoryItem[] }> {
  return api<{ items: readonly InventoryItem[] }>('/v1/players/me/inventory', {
    ...(opts.titleId ? { query: { titleId: opts.titleId } } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/**
 * `POST /v1/players/me/inventory/:id/list` — `worlds/src/server.ts`.
 *
 * **A bound item cannot be listed, ever.** The refusal is a 403 with its own code, `item_bound`
 * (`worlds/src/server.ts`), and it has its own code because "you may not sell this, ever"
 * is a different sentence from "you may not do this right now". This app pre-empts it by drawing
 * no control on a bound row — see the header — and still handles the 403, because the answer can
 * change between a read and a write.
 *
 * 201 on success. A row already listed is a 409 `inventory_state` (`server.ts`).
 */
export function listForSale(id: string, listingUrn: string): Promise<{ item: InventoryItem }> {
  return api<{ item: InventoryItem }>(
    `/v1/players/me/inventory/${encodeURIComponent(id)}/list`,
    { method: 'POST', body: { listingUrn } },
  )
}

/**
 * `DELETE /v1/players/me/inventory/:id/list` — `worlds/src/server.ts`.
 *
 * A 404 covers both "no such item" and "not yours" (`server.ts`), on purpose — the same
 * answer to both is what stops the route being an enumeration oracle.
 */
export function unlist(id: string): Promise<{ item: InventoryItem }> {
  return api<{ item: InventoryItem }>(
    `/v1/players/me/inventory/${encodeURIComponent(id)}/list`,
    { method: 'DELETE' },
  )
}

/**
 * `GET /v1/provisions` — `worlds/src/server.ts`.
 *
 * What a customer has been sold, and whether it was delivered. The handler branches on the
 * principal: an admin reads the whole backlog (`server.ts`), anybody else reads only rows
 * whose subject is their own user (`server.ts`). This app sends no subject and cannot: it
 * is derived from the token.
 *
 * `state` is passed through verbatim to the query (`server.ts`), so it is only ever sent from
 * the closed `PROVISION_STATES` list above.
 */
export function listProvisions(
  opts: { state?: ProvisionState; signal?: AbortSignal } = {},
): Promise<{ provisions: readonly Provision[] }> {
  return api<{ provisions: readonly Provision[] }>('/v1/provisions', {
    ...(opts.state ? { query: { state: opts.state } } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

/**
 * `GET /v1/provisions/:id` — `worlds/src/server.ts`.
 *
 * A malformed id, a missing row and somebody else's row are all **404**
 * (`server.ts`, and `itemIdOf` at `server.ts`). `worlds/src/server.ts` states
 * the reason: "'Does not exist' and 'is not yours' are the same answer on purpose." So this app
 * must never present a 404 here as "that entitlement belongs to another account".
 */
export function getProvision(id: string, signal?: AbortSignal): Promise<{ provision: Provision }> {
  return api<{ provision: Provision }>(`/v1/provisions/${encodeURIComponent(id)}`, {
    ...(signal ? { signal } : {}),
  })
}

/**
 * `GET /v1/titles/:id/achievements` — `worlds/src/server.ts`.
 *
 * **Makes no `authenticate()` call.** The handler is four lines with no principal in it. Sent with
 * `auth: false`, and its screen is outside the session gate.
 */
export function listAchievements(
  titleId: string,
  signal?: AbortSignal,
): Promise<{ achievements: readonly Achievement[] }> {
  return api<{ achievements: readonly Achievement[] }>(
    `/v1/titles/${encodeURIComponent(titleId)}/achievements`,
    { auth: false, ...(signal ? { signal } : {}) },
  )
}

/**
 * `GET /v1/titles/:id/seasons` — `worlds/src/server.ts`.
 *
 * **Makes no `authenticate()` call.** Two lines, no principal. Same treatment as the achievements
 * list. The season's remaining BUDGET is a different route and is declined — see the header.
 */
export function listSeasons(
  titleId: string,
  signal?: AbortSignal,
): Promise<{ seasons: readonly Season[] }> {
  return api<{ seasons: readonly Season[] }>(
    `/v1/titles/${encodeURIComponent(titleId)}/seasons`,
    { auth: false, ...(signal ? { signal } : {}) },
  )
}

/* ══════════════════════════════ the gap, as data ══════════════════════════════ */

/**
 * THE TITLE BRIDGE IS COMPLETE AND NOTHING IS ON THE OTHER END OF IT.
 *
 * `worlds`'s title client makes exactly two calls into a title service:
 *
 *   * `GET /v1/title`     — `worlds/src/titleclient.ts`, inside `describe()`
 *   * `POST /v1/provision` — `worlds/src/titleclient.ts`, inside `provision()`
 *
 * **Neither `micro-emberkin` nor `micro-nda` serves either one.** Both route tables were read:
 * `emberkin/src/server.ts` registers ten routes and `nda/src/server.ts` registers
 * thirty-two across `define` and `defineMutation`; no `/v1/title`
 * and no `/v1/provision` appears in either. They integrate in the ACHIEVEMENT direction only —
 * they call `worlds`, `worlds` does not call them.
 *
 * The bridge handles it correctly rather than blindly. `driveProvision` reads the registered
 * title's declared capabilities and refuses BEFORE making the call
 * (`worlds/src/provisioning.ts`): "Asked BEFORE the call rather than discovered from a
 * 404. A title that cannot do this is a catalogue mistake, and it deserves a row that says so." So
 * the outcome is a terminal `unsupported` row carrying a readable sentence in `lastError`, not a
 * blind 404 and not a silent retry loop.
 *
 * **But a private-world entitlement still ends as a row rather than as a world.** A customer paid,
 * the estate recorded it, and nothing was raised. That is the truth this app renders.
 *
 * ── And nothing registers a title, so a fresh deployment has an EMPTY REGISTRY ────────────────
 *
 * `POST /v1/titles` (`worlds/src/server.ts`) is the only writer of the `titles` table, and it
 * demands `worlds:admin` or `role:admin`. Nothing in the estate calls it: neither title service
 * self-registers on boot — which `worlds/src/titles.ts` anticipates as "the obvious way
 * for a title to declare itself", and which is why `registerTitle` is idempotent on the slug — and
 * no migration, seed or deploy step inserts a row. A `worlds` brought up today answers
 * `GET /v1/titles` with `{"titles":[]}`.
 *
 * That empty answer is a 200. It is NOT a loading state, and this app must never draw it as one:
 * `resourceState` in src/lib/resource.ts already ranks failure above emptiness, and the index page
 * renders `EMPTY` as the finding it is, with this text under it.
 *
 * Held as DATA rather than as prose inside a component so `test/gap.test.ts` can assert that the
 * screens render it.
 *
 * ── WHAT IS WRITTEN HERE, AND FOR WHOM ────────────────────────────────────────────────────────
 *
 * The provenance above is for whoever fixes this. The two entries below are read by somebody
 * deciding whether to buy something, so they say what is true in the words that person already
 * has: no route names, no file paths, no status codes, and no "what would fix it" — none of which
 * a customer can act on. `test/gap.test.ts` holds them to that, and holds them to still saying the
 * unwelcome part rather than softening it away.
 */
export interface KnownGap {
  /** A stable id, used as the test's handle on this entry. */
  readonly id: string
  readonly title: string
  /** What is true today. Written as a finding, never as "coming soon". */
  readonly finding: string
}

export const TITLE_BRIDGE_GAP: KnownGap = {
  id: 'title-bridge-unimplemented',
  title: 'Private worlds cannot be delivered yet',
  finding:
    'A private world is the one thing on this platform you can pay for and not receive. Ninety ' +
    'Days After and Emberkin tell Forge Worlds what you have achieved, but neither can yet be ' +
    'asked to raise a world for you, so a purchase is recorded, stops, and tells you why. Nothing ' +
    'is quietly retrying in the background. Everything else here — your account, what you own, ' +
    'your achievements and the seasons you play through — works today.',
}

export const EMPTY_REGISTRY_GAP: KnownGap = {
  id: 'registry-unpopulated',
  title: 'There are no titles in the register yet',
  finding:
    'This is the real answer rather than a page that has not finished loading. A title appears ' +
    'here once an administrator adds it, and none has been added on this deployment. Nothing is ' +
    'arriving in a moment, so there is nothing to wait for.',
}

export const KNOWN_GAPS: readonly KnownGap[] = [EMPTY_REGISTRY_GAP, TITLE_BRIDGE_GAP]
