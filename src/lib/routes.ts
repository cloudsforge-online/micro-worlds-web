/**
 * The route table, as data, in one place.
 *
 * Three files describe this app's addresses and all three have to agree:
 *
 *   1. `src/lib/routes.ts` — this file, from which the sub-navigation is derived,
 *   2. `src/app.tsx`       — which component renders at each path,
 *   3. `nginx.conf`        — which addresses are served the app shell at all.
 *
 * The third is the one that bites, and it bites late. nginx enumerates the real routes and 404s
 * everything else ON PURPOSE, so that a wrong address answers 404 rather than 200 — an app that
 * answers 200 for every address serves its "page not found" screen as a success, which crawlers
 * index and monitors call healthy.
 *
 * The price of that honesty is this list, in triplicate, so `test/routes.test.ts` reads
 * `nginx.conf` and `app.tsx` and fails the build when either has drifted. "Remember to update
 * nginx.conf" is not a mechanism; a test is.
 *
 * This module deliberately imports nothing — not React, not the router — so the test that reads it
 * does not have to boot a browser to find out what the routes are.
 */

export interface AppRoute {
  /** The top-level path segment, without a leading slash. `''` is the index route. */
  readonly path: string
  /** The sub-navigation label, or null for a route that is reachable but not offered. */
  readonly label: string | null
  /** True when the route owns everything beneath it (`/titles/<uuid>`). */
  readonly wildcard: boolean
  /**
   * True when the route renders without a session.
   *
   * Read off the SERVICE rather than chosen. `GET /v1/titles` (`worlds/src/server.ts`),
   * `GET /v1/titles/:id/achievements` and `GET /v1/titles/:id/seasons` contain no
   * `await authenticate(ctx, deps)` at all. Putting a screen built from them behind the session
   * gate would send an anonymous visitor to sign in to read something the service would have
   * handed them — the mirror of the estate's older mistake of sending a bearer to a route that
   * never wanted one.
   */
  readonly public: boolean
}

/**
 * ── WHERE THIS BUNDLE IS MOUNTED ─────────────────────────────────────────────────────────────
 *
 * Forge Worlds used to be a hostname. It is a FOLDER on the apex now: `/worlds`, wave 3e of the
 * consolidation argued in micro-deploy `docs/apex-consolidation.md`.
 *
 *   A ROUTER PATH is what `react-router` matches, relative to the mount: `titles`. Everything in
 *     `ROUTES` below and every `<Link to>`. `basename` in `src/app.tsx` puts the prefix back.
 *
 *   A PUBLIC PATH is what the address bar shows and what a crawler is handed: `/worlds/titles`.
 *     Every `<loc>` in the sitemap and every `location` in `nginx.conf`.
 *
 * `publicPath()` is the one crossing and the only place `BASE` is concatenated.
 *
 * ── THE API DID NOT MOVE, BECAUSE IT WAS NEVER HERE ──────────────────────────────────────────
 *
 * Every wave since 3a has had to remount an API under its mount. This one does not: `API_SURFACE`
 * in `lib/hosts.ts` is `api`, not `worlds` — the service is served on `api.<apex>` and this
 * bundle's requests are ABSOLUTE and cross-origin by design. There are no relative `/v1` calls to
 * break, so there is nothing for the gateway to strip. See that file's header for why the two
 * keys are deliberately different.
 *
 * ── AND THE THREE TITLES NEST UNDER THIS ────────────────────────────────────────────────────
 *
 * `emberkin`, `aetherholm` and `tessera` become `<apex>/worlds/<title>` in their own wave. This
 * repository composes their addresses from the registry (`viewedSurfaceUrl` via `lib/catalogue.ts`
 * `surface`), so nothing here has to change when they do — which is the whole reason those links
 * were never written down as hostnames.
 */
export const BASE = '/worlds'

/** A router path as a public one. No trailing slash: the catalogue is `/worlds`, not `/worlds/`. */
export function publicPath(path: string): string {
  const rooted = path.startsWith('/') ? path : `/${path}`
  return rooted === '/' ? BASE : `${BASE}${rooted}`
}

export const ROUTES: readonly AppRoute[] = [
  // ────────────────────────────────────────────────────────────────────────────────────────────
  // THE INDEX IS THE PLATFORM, NOT A GAME, AND NOT A LIST OF TWO GAMES.
  //
  // Forge Worlds owns the title registry, one shared account, inventory, achievements, seasons and
  // the entitlement bridge. Ninety Days After and Emberkin are titles that RUN on it. An index
  // that opened with two game cards would say the platform is those two games, which is the
  // category error this estate has already made twice on its own front page — and it would also
  // be false today, because nothing has registered a title at all (see EMPTY_REGISTRY_GAP in
  // src/lib/worlds.ts).
  //
  // Public, because `GET /v1/titles` is public.
  // ────────────────────────────────────────────────────────────────────────────────────────────
  { path: '', label: 'The platform', wildcard: false, public: true },
  // ────────────────────────────────────────────────────────────────────────────────────────────
  // WHERE THE GAMES ARE ACTUALLY PLAYED.
  //
  // Wildcard: `/play` lists the worlds open to settle in and `/play/<uuid>` IS the game — the
  // homestead, the map, the day's actions, the reports, the commune. It is a platform route rather
  // than a title's own address for the same reason the index is not two game cards: the register
  // decides which titles exist, and a route named after one of them would have to be added and
  // removed by hand every time that changes. The name of the game appears in the DATA, never here.
  //
  // Gated, and read off the service rather than chosen: every route behind this screen passes
  // through `requirePrincipal`, `requireUser` or `communeContext` in `nda/src/server.ts`, and the
  // one that settles you in a world resolves a subject from your token. There is nothing here an
  // anonymous visitor could be shown.
  // ────────────────────────────────────────────────────────────────────────────────────────────
  { path: 'play', label: 'Play', wildcard: true, public: false },
  // Your account across every title: profile, reputation, sanctions, the wardrobe keyed by title.
  // Behind the gate: `GET /v1/players/me` authenticates (`worlds/src/server.ts`).
  { path: 'player', label: 'Your account', wildcard: false, public: false },
  // Everything the account owns, and what may leave it. `GET /v1/players/me/inventory`.
  { path: 'inventory', label: 'Inventory', wildcard: false, public: false },
  // What you were sold and whether it was delivered — including the rows that never will be.
  // Wildcard: `/entitlements/<uuid>` is one provision. `GET /v1/provisions`.
  { path: 'entitlements', label: 'Entitlements', wildcard: true, public: false },
  // ────────────────────────────────────────────────────────────────────────────────────────────
  // REACHABLE AND DELIBERATELY NOT OFFERED, which is what `label: null` is for.
  //
  // `/titles/<uuid>` is one title's achievements and seasons. There is nothing to navigate TO
  // without an id — a nav entry would lead to a screen that can only say "pick one", and today it
  // would lead to a screen that can only say "there are none". It is arrived at from the index. It
  // is enumerated in nginx and covered by the route test exactly like the others; it is only
  // absent from the bar.
  //
  // Public, because both routes behind it are.
  // ────────────────────────────────────────────────────────────────────────────────────────────
  { path: 'titles', label: null, wildcard: true, public: true },
]

/** What the sub-navigation renders, with the leading slash a `NavLink` wants. */
export const NAV: ReadonlyArray<{ to: string; label: string }> = ROUTES.filter(
  (route): route is AppRoute & { label: string } => route.label !== null,
).map((route) => ({ to: `/${route.path}`, label: route.label }))

/** Every path nginx has to serve the shell for, excluding the index. */
export const NON_INDEX_PATHS: readonly string[] = ROUTES.filter((r) => r.path !== '').map(
  (r) => r.path,
)

/**
 * A route this app owns, deep enough to prove the SPA fallback works.
 *
 * Passed to CI as the deep-link probe. It must be a REAL address — a probe against a path the app
 * does not own proves only that the 404 page renders, which is the opposite of what the check is
 * for. This one is a single entitlement, which is the address a customer is most likely to reload
 * while waiting to find out whether something they paid for arrived.
 */
export const DEEP_LINK_PATH = '/entitlements/5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'
