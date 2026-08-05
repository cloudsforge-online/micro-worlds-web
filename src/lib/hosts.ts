/**
 * Where this app talks to, resolved at runtime.
 *
 * `cloudsforgeHosts()` reads `window.location.hostname` on every call, so one image serves
 * localhost, a preview deployment and production. Nothing here reads a build-time constant; see
 * the note in vite.config.ts and `test/no-build-time-config.test.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * TWO SURFACE KEYS, NOT ONE, AND THAT IS A FACT ABOUT THIS PRODUCT RATHER THAN A COMPLICATION.
 *
 * Every other frontend in this estate uses one key for both "which product am I" and "where is my
 * API", because for them the two coincide: `micro-mint-web` and `micro-mint` share `create.<apex>`
 * behind the gateway, so its `apiBase()` is `''` and every request is relative.
 *
 * Forge Worlds is registered as TWO surfaces, deliberately:
 *
 *   * `worlds`  — the player-facing product. `subdomain: 'worlds'`, devPort 3001, accent moss
 *                `#6d9a49`, glyph `▲`, `inSwitcher: true`
 *                (`ui/packages/ui/src/surfaces.ts`, the `worlds` row). **This bundle.**
 *   * `api`     — "The public, versioned surface". `subdomain: 'api'`, devPort 4020,
 *                `inSwitcher: false` (`ui/packages/ui/src/surfaces.ts`, the `api` row). The
 *                hostname `micro-worlds`'s routes are actually served on.
 *
 * So `PRODUCT` and `API_SURFACE` below are different keys, `resolveApiBase` never collapses to `''`,
 * and every request from this bundle is cross-origin by design. That is not a workaround: it is
 * what the registry says this product is, and collapsing the two would be this app asserting a
 * deployment topology the registry does not describe.
 *
 * The SECOND key used to be `worlds-api`, and that is the defect this header now exists to keep
 * from being reintroduced. See "the API host is `api.`" below before changing it back.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── The two disagreements, reported rather than papered over ───────────────────────────────────
 *
 * **1. The dev port.** The registry gives `api` **devPort 4020**. `micro-worlds` binds **4000**:
 * `worlds/src/env.ts:171` defaults `PORT` to 4000 and `worlds/.env.example:38` sets it to 4000.
 * Under `pnpm dev` the registry value is the one this bundle calls, so a `worlds` started from its
 * own example environment is not where this app looks.
 *
 * In production this costs nothing — `api.<apex>` is a gateway hostname that routes `/v1/titles`,
 * `/v1/players`, `/v1/provisions` and `/v1/seasons` to `http://worlds:4000` by path prefix
 * (`deploy/gateway/dynamic/public-api.yml`, router `cf-api-worlds`) — and there is no gateway in
 * front of `pnpm dev`, so locally the number has to be met by hand.
 *
 * This is the same shape as `admin` (registry 3002, `admin-api` binds 4014), `emberkin`
 * (registry 3014, service binds 4100), `foresight` (registry 4021 read as beacon's 4011) and
 * `create` (registry 4004, `mint` binds 4000) — the FIFTH instance of a devPort that is an
 * allocation pretending to be a fact. `surfaces.test.ts:187-206` pins only the surfaces whose
 * service binds a DISTINCTIVE port, and `worlds` is not among them because 4000 is the
 * service-template default half the estate shares. It is NOT fixed with a literal port here: a
 * hard-coded host is a second, unversioned copy of the registry, and the copy is the one that
 * goes stale. The README says `PORT=4002 pnpm dev`, in one line, next to the citation.
 *
 * **2. The API host is `api.`, and it is NOT `worlds-api.` — THE FOLD WENT THAT DIRECTION.**
 *
 * This paragraph replaces two claims that were true once, became false, and between them took the
 * product down. What stood here said "There is no gateway router for `worlds-api.` yet … the
 * registry is ahead of the deploy", and cited the `api` row's plan that "`api.` still points at
 * the game API, which is renamed to `worlds-api.` first". **Both are backwards now.** The rename
 * was never carried out and the OPPOSITE was: the game API was consolidated INTO `api.`, and
 * `worlds-api.` was retired. `api.` is the name a third party would be given, so it is the name
 * that had to survive — the deprecation-cycle argument that once pointed at `worlds-api.` is
 * exactly why the direction flipped. `ui/packages/ui/src/surfaces.ts` now records this on both
 * rows: the `api` row under "THIS COMMENT USED TO DESCRIBE THE CONSOLIDATION BACKWARDS", and the
 * `worlds-api` row as "RETIRED AS A HOSTNAME, KEPT AS A ROW".
 *
 * **`worlds-api.<apex>` HAS NO DNS RECORD, ON EITHER NETWORK, AND IS NOT GOING TO GET ONE.**
 * That is the whole failure. Measured against the live estate on 2026-08-05:
 *
 *     https://worlds.cloudsforge.online/               -> 200   (the bundle: always did)
 *     https://api.cloudsforge.online/v1/titles         -> 200   application/json, one title
 *     https://worlds-api.cloudsforge.online/v1/titles  -> 000   the name does not resolve
 *     https://worlds-testnet.cloudsforge.online/       -> 200
 *     https://api-testnet.cloudsforge.online/v1/titles -> 200   application/json, empty registry
 *     https://worlds-api-testnet.cloudsforge.online/   -> 000   the name does not resolve
 *
 * ── AND NOTE WHY THE OLD COMMENT'S OWN TEST WOULD HAVE PASSED ─────────────────────────────────
 *
 * A router for `worlds-api.` DOES exist — `cf-api-worlds-api` in
 * `deploy/gateway/dynamic/estate-web.yml`, `Host(worlds-api{CF_WEB_SUFFIX})` -> `cf-svc-worlds`.
 * So the sentence "no router matches `worlds-api.<apex>`" stopped being the problem, someone added
 * the router, and the page still did not load. **A router is not reachability.** Traefik can only
 * match a `Host()` on a request that arrives, and no request arrives at a name with no `A` record.
 * Anyone re-checking this by reading the gateway config alone will conclude the host is fine; the
 * only check that settles it is a name lookup or a real browser, which is why the test added
 * alongside this change is a live DNS resolution and not a config assertion.
 *
 * Resolving against `api` is therefore not a shim around a missing router — it is the registry's
 * own answer to "where is the game API". CORS is not in the way: the gateway answers this bundle's
 * origin on both the preflight and the GET, verified rather than assumed —
 * `access-control-allow-origin: https://worlds.cloudsforge.online` with `allow-credentials: true`.
 *
 * **3. `/v1/seasons` is not routed at all.** Reported, and it does not affect this bundle:
 * `GET /v1/seasons/:id/budget` (`worlds/src/server.ts:779`) is the one route it would touch, and
 * this app declines it — see src/lib/worlds.ts.
 */
import { cloudsforgeHosts, type CloudsForgeHosts, type SurfaceKey } from '@cloudsforge/ui'

/**
 * The surface this application IS.
 *
 * It selects the switcher entry marked current and it names the accent. `surfaces.ts:239-250`
 * registers `worlds` as a product with `inSwitcher: true`, accent `#6d9a49`, glyph `▲`, subdomain
 * `worlds` and `markId: 'mark-worlds'`.
 */
export const PRODUCT: SurfaceKey = 'worlds'

/**
 * The surface this application CALLS: `micro-worlds`, reached at `api.<apex>`.
 *
 * Separate from `PRODUCT` for the reason in the header — two keys, cross-origin by design.
 *
 * **NEVER `worlds-api`.** That hostname is retired and has no DNS record on any network; setting
 * it here is precisely the outage this file's header documents, in which the page loaded, every
 * request failed with `ERR_FAILED`, and the registry rendered empty. Never a literal either: the
 * registry is the one place a hostname is decided.
 */
export const API_SURFACE: SurfaceKey = 'api'

/** The name reported to the observability ingest and shown in error copy. */
export const APP_NAME = 'worlds-web'

/**
 * The base URL for this app's API, which is `micro-worlds`.
 *
 * The relative-versus-absolute decision is derived by COMPARING ORIGINS rather than by a `DEV`
 * flag, because a flag is a build-time constant and this repository has none: an image built for
 * production and opened on localhost would then point at a host that is not there.
 *
 * For this app the comparison always answers "different", because `worlds.<apex>` and
 * `api.<apex>` are two hosts. The comparison is kept rather than replaced with a constant
 * anyway: the day somebody puts the bundle and the service behind one origin, this returns `''`
 * and nothing else changes. A hard-coded absolute would need a code change to notice.
 */
export function resolveApiBase(pageOrigin: string, hosts: CloudsForgeHosts, key: SurfaceKey): string {
  const own = hosts[key]
  // With no page origin there is nothing for a relative URL to resolve against, so the absolute
  // form is the only correct answer.
  if (!pageOrigin) return own
  // A surface may carry a basePath (the wallet is a path inside Hub), so compare ORIGINS rather
  // than whole URLs — otherwise every such surface would look cross-origin to itself.
  return new URL(own).origin === pageOrigin ? '' : own
}

/** The same four names `cloudsforgeHosts()` treats as development. Kept in step by test. */
export function isLocal(hostname: string): boolean {
  return (
    hostname === '' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  )
}

/**
 * Whether this bundle is being served from an address the surface registry knows.
 *
 * `cloudsforgeHosts()` derives the apex by stripping a KNOWN subdomain prefix. Served from an
 * unknown name, the whole name becomes the apex, and every CloudsForge URL derived from it — the
 * public API, the account portal, Lantern — resolves one level too deep. The app still renders,
 * because it has a public page worth showing and nothing here is a security boundary; but it says
 * so, once, in the shell.
 *
 * The comparison is against `PRODUCT`, which is where this bundle lives — not against
 * `API_SURFACE`, which is a host it calls and never a host it is served from.
 */
export function isRegisteredPlacement(pageOrigin: string, hostname: string, hosts: CloudsForgeHosts): boolean {
  if (isLocal(hostname)) return true
  if (!pageOrigin) return true
  try {
    return new URL(hosts[PRODUCT]).origin === pageOrigin
  } catch {
    return false
  }
}

/** Every CloudsForge base URL, for the current environment. */
export function hosts(): CloudsForgeHosts {
  return cloudsforgeHosts()
}

/** This app's API base, resolved now. Call it per request; never cache it in a module constant. */
export function apiBase(): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return resolveApiBase(origin, cloudsforgeHosts(), API_SURFACE)
}

/** The page origin, or a stable placeholder when there is no document (tests, prerender). */
export function pageOrigin(): string {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin
}

/** Whether the current address is one the registry knows. Read by the shell. */
export function placementIsKnown(): boolean {
  if (typeof window === 'undefined') return true
  return isRegisteredPlacement(window.location.origin, window.location.hostname, cloudsforgeHosts())
}
