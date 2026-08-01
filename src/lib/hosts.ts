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
 *   * `worlds`      — the player-facing product. `subdomain: 'worlds'`, devPort 3001, accent moss
 *                     `#6d9a49`, glyph `▲`, `inSwitcher: true`
 *                     (`ui/packages/ui/src/surfaces.ts:239-250`). **This bundle.**
 *   * `worlds-api`  — "The game platform API". `subdomain: 'worlds-api'`, devPort 4002,
 *                     `inSwitcher: false` (`ui/packages/ui/src/surfaces.ts:495-507`).
 *                     **`micro-worlds`.**
 *
 * So `PRODUCT` and `API_SURFACE` below are different keys, `resolveApiBase` never collapses to `''`,
 * and every request from this bundle is cross-origin by design. That is not a workaround: it is
 * what the registry says this product is, and collapsing the two would be this app asserting a
 * deployment topology the registry does not describe.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── The two disagreements, reported rather than papered over ───────────────────────────────────
 *
 * **1. The dev port.** The registry gives `worlds-api` **devPort 4002**
 * (`ui/packages/ui/src/surfaces.ts:501`). `micro-worlds` binds **4000**: `worlds/src/env.ts:171`
 * defaults `PORT` to 4000 and `worlds/.env.example:38` sets it to 4000. Under `pnpm dev` the
 * registry value is the one this bundle calls, so a `worlds` started from its own example
 * environment is not where this app looks.
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
 * **2. There is no gateway router for `worlds-api.` yet.** `micro-worlds`'s routes are served
 * under `CF_API_HOST` today — `deploy/gateway/dynamic/public-api.yml:142-147` matches
 * `PathPrefix('/v1/titles') || PathPrefix('/v1/players') || PathPrefix('/v1/provisions')` on that
 * host and forwards to `http://worlds:4000` (`:187-189`). No router matches `worlds-api.<apex>`.
 * `ui/packages/ui/src/surfaces.ts:480-483` records the intent — "`api.` still points at the game
 * API, which is renamed to `worlds-api.` first" — so the registry is ahead of the deploy rather
 * than wrong.
 *
 * Resolving against `api` instead would work today and break silently on the day of the rename,
 * and would put this bundle's correctness in a hostname the estate has already decided to change.
 * So it resolves against `worlds-api`, and the README states exactly what the deploy has to add.
 * That is the same choice `micro-mint-web` made about its dev port, for the same reason.
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
 * The surface this application CALLS. `micro-worlds`, at `worlds-api.<apex>`.
 *
 * Separate from `PRODUCT` for the reason in the header. Never a literal, never `api`.
 */
export const API_SURFACE: SurfaceKey = 'worlds-api'

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
 * `worlds-api.<apex>` are two hosts. The comparison is kept rather than replaced with a constant
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
 * worlds API, the account portal, Lantern — resolves one level too deep. The app still renders,
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
