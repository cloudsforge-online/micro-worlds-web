/**
 * What this surface says about one of its own addresses, as data.
 *
 * `@cloudsforge/ui/seo` composes the tags — title, description, robots, Open Graph, canonical —
 * from the surface registry, and it is right about almost all of it. This module is the two things
 * the registry cannot know: which of THIS app's addresses is which, and the one field where the
 * registry is wrong about Forge Worlds.
 *
 * It imports nothing but the route table, for the same reason `routes.ts` imports nothing at all:
 * the test that reads it does not have to boot a browser to find out what the head will say.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THE DESCRIPTION IS OVERRIDDEN RATHER THAN DERIVED
 *
 * `surfaceMeta(PRODUCT)` builds a description out of the registry's `blurb`, and every other
 * surface in the estate takes it. This one does not, because `worlds`' blurb names a title —
 * `ui/packages/ui/src/surfaces.ts`, the `worlds` row — and a title in the description IS the
 * category error this whole repository is arranged against. Forge Worlds owns the title registry,
 * one account across every title, inventory, achievements, seasons and the entitlement bridge;
 * the titles are rows in it. `src/lib/routes.ts`, `src/pages/platform.tsx` and two CI rules all
 * say so, and letting the head say the opposite would put the error in the one place a stranger
 * reads BEFORE arriving — a search result and a social card.
 *
 * So the sentence is declared here, and it is the same sentence `index.html` carries statically.
 * Two copies, because two different readers need them: a link-preview fetcher gets the shell's and
 * generally does not execute JavaScript, and a browser gets this one on every navigation.
 * `test/brand-chrome.test.ts` compares them byte for byte, which is the mechanism that stops the
 * pair drifting — `site/index.html` records having shipped exactly that drift.
 *
 * The registry blurb is REPORTED rather than edited: `@cloudsforge/ui` is another repository, and
 * a frontend reaching into the design system to reword a product's own one-line summary is a
 * change nobody reviewing this surface would see.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { ROUTES } from './routes.ts'

/**
 * The description of Forge Worlds, in one place.
 *
 * Byte-identical to `<meta name="description">` in index.html. If you change one, change both —
 * or rather, change this one and let the test tell you about the other.
 */
export const SURFACE_DESCRIPTION =
  'The platform games run on: one title registry, one account across every title, the inventory ' +
  'it carries, the achievements and seasons titles report into, and the bridge that turns a ' +
  'purchase into something a title raises.'

/** The shape `surfaceMeta()` takes, restated so this module imports no React and no design system. */
export interface PageMeta {
  readonly title?: string
  readonly description: string
  readonly path: string
  readonly robots?: string
}

/**
 * What this app can say about one of its addresses that the registry cannot.
 *
 * Read off `ROUTES` rather than restated, so a route added there is titled here without anybody
 * remembering — the same rule the sub-navigation and nginx.conf already follow.
 *
 * ── THE INDEX DELIBERATELY TAKES NO PAGE TITLE ────────────────────────────────────────────────
 *
 * `surfaceMeta()` then returns the bare surface name, which is byte-for-byte what index.html's
 * `<title>` and `og:title` already carry. Titling it "The platform — Forge Worlds" would make the
 * shell and the application disagree about the front page, which is the drift this arrangement is
 * most likely to produce and the one `site` records having shipped.
 *
 * ── ROBOTS IS OVERRIDDEN FOR THE GATED ADDRESSES, AND FOR AN ADDRESS THAT IS NOT ONE ──────────
 *
 * The registry knows `worlds` serves a public UI, which is true of `/` and of `/titles/<id>`. It
 * cannot know that `/player`, `/inventory` and `/entitlements` render a redirect to sign in for
 * anybody without a session — and an indexed sign-in redirect is a search result that helps
 * nobody. `follow` is kept: the links out of those pages are ordinary.
 *
 * An unknown address gets `noindex` too, and this is the half that pairs with nginx: the server
 * answers a REAL 404 for it (`error_page 404 /index.html`), so the head must not then invite the
 * indexing of the page the reader is actually looking at.
 *
 * This is the same decision the sitemap in nginx.conf makes, made twice on purpose — a sitemap is
 * an invitation and a robots directive is an instruction, and the two must not disagree.
 * `test/sitemap.test.ts` asserts they do not.
 */
export function pageMetaFor(pathname: string): PageMeta {
  const segment = pathname.split('/')[1] ?? ''
  const route = ROUTES.find((r) => r.path === segment)

  if (route === undefined) {
    return {
      title: 'Not found',
      description: SURFACE_DESCRIPTION,
      path: pathname,
      robots: 'noindex, follow',
    }
  }

  // `label` is null on `titles`, which is reachable and deliberately not offered: there is nothing
  // to navigate to without an id, and the shell cannot know a title's name — "Title" would be a
  // second declaration of something no reader is helped by. The bare surface name is honest.
  const title = route.path === '' ? null : route.label

  return {
    description: SURFACE_DESCRIPTION,
    path: pathname,
    ...(title === null ? {} : { title }),
    ...(route.public ? {} : { robots: 'noindex, follow' }),
  }
}

/**
 * Every address of this surface a crawler should be handed, derived rather than restated.
 *
 * Read by `test/sitemap.test.ts` and compared against the `<loc>` list nginx serves, in both
 * directions, so the sitemap cannot gain an address the app does not own or lose one it does.
 *
 * ── WHAT IS IN IT: ONE ADDRESS ────────────────────────────────────────────────────────────────
 *
 * `/` — the platform page. Public because `GET /v1/titles` is public.
 *
 * ── AND WHY THE OTHER PUBLIC ROUTE IS NOT ─────────────────────────────────────────────────────
 *
 * `titles` is `public: true` and `wildcard: true`, and it is the one address on this surface most
 * worth reading: `/titles/<uuid>` is a title's achievements and seasons, and both routes behind it
 * make no `authenticate()` call. It stays out because the set is UNBOUNDED and knowable only to
 * the service — one address per registered title, minted by `POST /v1/titles`. A static list here
 * would be a second opinion about which titles exist, stale the moment one is registered, and it
 * would be an empty list today. They are discovered from `/`, which IS the list of them.
 *
 * Bare `/titles` is not a destination either: `app.tsx` routes `titles/:id` and nothing else, so
 * the address renders the not-found page. nginx serves it a shell — the location matches the
 * segment and everything under it — and that is fine; a sitemap entry for it would not be.
 *
 * The three gated routes are absent for the plainer reason: a crawler following them reaches a
 * sign-in redirect.
 */
export const SITEMAP_PATHS: readonly string[] = ROUTES.filter(
  (route) => route.public && !route.wildcard,
).map((route) => `/${route.path}`)
