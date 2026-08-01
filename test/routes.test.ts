/**
 * The three descriptions of this app's addresses, checked against each other.
 *
 *   1. `src/lib/routes.ts` — the declaration, from which the navigation is derived.
 *   2. `src/app.tsx`       — which component renders at each path.
 *   3. `nginx.conf`        — which addresses are served the app shell at all.
 *
 * The third is what makes this test worth having. nginx enumerates the real routes and 404s
 * everything else on purpose, so that a wrong address answers 404 rather than 200 — an app that
 * answers 200 for every address serves its "page not found" screen as a success, which crawlers
 * index and monitors call healthy.
 *
 * The price of that honesty is that a route added to the router and not to nginx works perfectly
 * under `pnpm dev` and 404s on the first hard refresh in production. That failure survives review
 * because nothing about the diff looks wrong. This test is the mechanism instead.
 *
 * It reads `app.tsx` as TEXT rather than importing it: importing would pull in React, the router
 * and every page, and this suite deliberately has no DOM.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { DEEP_LINK_PATH, NAV, NON_INDEX_PATHS, ROUTES } from '../src/lib/routes.ts'

const read = (file: string): string => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const appSource = read('src/app.tsx')
const nginx = read('nginx.conf')
const ci = read('.github/workflows/ci.yml')

/**
 * nginx.conf with its comments removed.
 *
 * The file's own header quotes the directive it forbids, in order to explain why the routes are
 * enumerated by hand — so a grep over the raw text matches the warning and fails a correct file.
 * The rule is about DIRECTIVES; strip the prose before checking it. Every copy of this check in
 * the estate strips first, and that was verified for this repository rather than assumed.
 */
const directives = nginx
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n')

/** The alternation inside nginx's enumerated `location ~ ^/(…)` block. */
function nginxPaths(): string[] {
  const match = /location\s+~\s+\^\/\(([^)]+)\)/.exec(directives)
  assert.ok(match, 'nginx.conf has no enumerated route block')
  return (match[1] ?? '').split('|').map((p) => p.trim())
}

describe('the route declaration', () => {
  it('is not empty, so this whole file cannot pass for the wrong reason', () => {
    assert.ok(ROUTES.length >= 5, `expected the route table, found ${ROUTES.length} entries`)
  })

  it('has exactly one index route, and it is THE PLATFORM rather than a game', () => {
    // ══════════════════════════════════════════════════════════════════════════════════════════
    // Forge Worlds is the platform: the title registry, one account across every title, inventory,
    // achievements, seasons and the entitlement bridge. Ninety Days After and Emberkin are titles
    // that RUN on it. An index labelled after a game — or built from two game cards — repeats the
    // category error this estate has already made twice on its own front page.
    //
    // Asserted rather than left to review, because it is exactly the kind of thing a redesign
    // quietly undoes.
    // ══════════════════════════════════════════════════════════════════════════════════════════
    const index = ROUTES.filter((r) => r.path === '')
    assert.equal(index.length, 1)
    assert.equal(index[0]?.label, 'The platform')
    assert.equal(index[0]?.public, true)
  })

  it('names no title anywhere in the route table or the navigation', () => {
    // The registry is DATA, read from `GET /v1/titles` at runtime. A title that appeared as a
    // hard-coded route would be this app asserting which games exist — which is the assertion the
    // registry exists to take out of source, and which is false today anyway: nothing has
    // registered a title at all.
    const text = `${JSON.stringify(ROUTES)}${JSON.stringify(NAV)}`.toLowerCase()
    for (const title of ['emberkin', 'nda', 'ninety', 'kindred', 'skirmish']) {
      assert.ok(!text.includes(title), `the route table names a title: ${title}`)
    }
  })

  it('declares no duplicate path', () => {
    const paths = ROUTES.map((r) => r.path)
    assert.equal(new Set(paths).size, paths.length)
  })

  it('declares no path with a slash: these are TOP-LEVEL segments', () => {
    // nginx matches on the first segment and everything under it. A declaration of
    // `entitlements/detail` would produce a location block that does not mean what it says.
    for (const route of ROUTES) {
      assert.ok(!route.path.includes('/'), `${route.path} is not a top-level segment`)
    }
  })

  it('marks entitlements and titles as wildcards, because both have a detail page under them', () => {
    assert.equal(ROUTES.find((r) => r.path === 'entitlements')?.wildcard, true)
    assert.equal(ROUTES.find((r) => r.path === 'titles')?.wildcard, true)
  })

  it('marks the account and inventory screens as leaves', () => {
    assert.equal(ROUTES.find((r) => r.path === 'player')?.wildcard, false)
    assert.equal(ROUTES.find((r) => r.path === 'inventory')?.wildcard, false)
  })

  it('offers everything except the title page, which needs an id to mean anything', () => {
    // `label: null` is "reachable and deliberately not offered". Asserted rather than assumed,
    // because a hidden route is normally a mistake and this is the one place it is not.
    const hidden = ROUTES.filter((r) => r.label === null).map((r) => r.path)
    assert.deepEqual(hidden, ['titles'], 'only the title page may be unlabelled')
  })
})

describe('which routes are public matches which routes worlds leaves unauthenticated', () => {
  /**
   * THE ASSERTION THIS FILE EXISTS FOR, ALONGSIDE THE nginx ONE.
   *
   * `GET /v1/titles` (worlds/src/server.ts:467), `GET /v1/titles/:id/achievements` (:701) and
   * `GET /v1/titles/:id/seasons` (:755) make no `authenticate()` call. Gating a screen built from
   * them would send a visitor to sign in for a page the service would have served them — and the
   * estate has already shipped the mirror-image defect, a client sending a bearer to a route with
   * no `authenticate()` call and then reasoning about a 403 that was never about authorisation.
   *
   * `test/worlds.test.ts` proves the "no authenticate() call" half against the real service. This
   * proves this app acts on it.
   */
  it('the platform index and the title page are public; the rest are gated', () => {
    const publicPaths = ROUTES.filter((r) => r.public).map((r) => r.path)
    assert.deepEqual(publicPaths.sort(), ['', 'titles'])
  })

  it('every gated route is wrapped in ProtectedRoute in app.tsx, and no public one is', () => {
    // Read as text, per the note at the top. EVERY element under a route segment is checked, not
    // only the first — `/entitlements` and `/entitlements/:id` are two elements and gating one of
    // them would otherwise pass.
    for (const route of ROUTES) {
      if (route.path === '') continue
      const elements = [
        ...appSource.matchAll(new RegExp(`path="${route.path}(?:/[^"]*)?"`, 'g')),
      ]
      assert.ok(elements.length > 0, `app.tsx has no route for /${route.path}`)
      for (const match of elements) {
        const at = match.index
        // The element for this route runs from its path attribute to the next `<Route`.
        const next = appSource.indexOf('<Route', at + 1)
        const element = appSource.slice(at, next === -1 ? undefined : next)
        assert.equal(
          element.includes('<ProtectedRoute>'),
          !route.public,
          `${match[0]} is ${route.public ? 'public' : 'gated'} in routes.ts but not in app.tsx`,
        )
      }
    }
  })

  it('the index route is not gated', () => {
    const at = appSource.indexOf('<Route index')
    const next = appSource.indexOf('<Route', at + 1)
    assert.doesNotMatch(appSource.slice(at, next), /ProtectedRoute/)
  })

  it('the client sends no bearer to any of the three unauthenticated routes', () => {
    // The other half of the same rule, at the call site. `auth: false` is what stops this bundle
    // attaching a token to a handler that never asked for one.
    const worlds = read('src/lib/worlds.ts')
    for (const fn of ['listTitles', 'listAchievements', 'listSeasons']) {
      const at = worlds.indexOf(`export function ${fn}`)
      assert.ok(at > 0, `${fn} is missing`)
      assert.match(
        worlds.slice(at, at + 500),
        /auth: false/,
        `${fn} calls an unauthenticated route and must not send a token`,
      )
    }
  })
})

describe('the navigation', () => {
  it('is derived from the declaration rather than restated', () => {
    const labelled = ROUTES.filter((r) => r.label !== null)
    assert.equal(NAV.length, labelled.length)
    assert.deepEqual(
      NAV.map((n) => n.to),
      labelled.map((r) => `/${r.path}`),
    )
  })

  it('points the first entry at the index, with the leading slash a NavLink needs', () => {
    assert.equal(NAV[0]?.to, '/')
  })

  it('offers the account, the inventory and the entitlements', () => {
    assert.ok(NAV.some((n) => n.to === '/player'))
    assert.ok(NAV.some((n) => n.to === '/inventory'))
    assert.ok(NAV.some((n) => n.to === '/entitlements'))
  })

  it('does NOT offer the title page, which needs an id to mean anything', () => {
    assert.ok(!NAV.some((n) => n.to === '/titles'))
  })
})

describe('the router', () => {
  it('renders a route element for every non-index path', () => {
    for (const path of NON_INDEX_PATHS) {
      assert.match(
        appSource,
        new RegExp(`path="${path}(/:id)?"`),
        `app.tsx has no route for /${path}`,
      )
    }
  })

  it('renders the two detail routes', () => {
    assert.match(appSource, /path="entitlements\/:id"/)
    assert.match(appSource, /path="titles\/:id"/)
  })

  it('has an index route', () => {
    assert.match(appSource, /<Route\s+index/)
  })

  it('has a catch-all, so an unknown address renders inside the shell', () => {
    assert.match(appSource, /path="\*"/)
  })
})

describe('nginx serves exactly the routes that exist', () => {
  it('enumerates every non-index path', () => {
    const served = nginxPaths()
    for (const path of NON_INDEX_PATHS) {
      assert.ok(served.includes(path), `nginx.conf does not serve /${path}`)
    }
  })

  it('enumerates nothing that is not a route', () => {
    for (const path of nginxPaths()) {
      assert.ok(
        NON_INDEX_PATHS.includes(path),
        `nginx.conf serves /${path}, which is not in the route table`,
      )
    }
  })

  it('serves the index', () => {
    assert.match(directives, /location = \/\s*\{/)
  })

  it('does NOT use the SPA 200-fallback', () => {
    // `try_files $uri /index.html` serves the bundle with a 200 for every address in existence.
    assert.doesNotMatch(directives, /try_files\s+\$uri\s+(\$uri\/\s+)?\/index\.html/)
  })

  it('keeps the honest 404 through error_page', () => {
    assert.match(directives, /error_page 404 \/index\.html/)
  })

  it('404s a missing asset rather than serving the shell for it', () => {
    // A JavaScript request answered with HTML fails with a syntax error naming the wrong file.
    assert.match(directives, /location \/assets\/\s*\{\s*try_files \$uri =404/)
  })

  it('sets the three security headers at the server level', () => {
    for (const header of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']) {
      assert.match(directives, new RegExp(`add_header ${header}`), header)
    }
  })

  it('allows same-origin framing, because this surface has legitimate embeds inside Hub', () => {
    // The operator console uses DENY and has to: it has no embeds and a session that can authorise
    // a ledger reversal. This one is a public product surface. Asserted in both directions so the
    // difference stays a decision.
    assert.match(directives, /X-Frame-Options "SAMEORIGIN"/)
    assert.doesNotMatch(directives, /X-Frame-Options "DENY"/)
  })

  it('does NOT tell robots to stay away: this is a public surface with shareable pages', () => {
    assert.doesNotMatch(directives, /X-Robots-Tag/)
  })

  it('restates the security headers in EVERY location that sets Cache-Control', () => {
    // nginx's add_header is all-or-nothing per level: a location that declares ANY add_header
    // inherits NONE from its parent. The template's `location /assets/` stripped nosniff from
    // every hashed script in every frontend cut from it.
    const blocks = directives.split(/location\s/).slice(1)
    for (const block of blocks) {
      if (!block.includes('Cache-Control')) continue
      assert.match(
        block,
        /X-Content-Type-Options/,
        `a Cache-Control location without nosniff: ${block.slice(0, 40)}`,
      )
      assert.match(
        block,
        /X-Frame-Options/,
        `a Cache-Control location without frame-options: ${block.slice(0, 40)}`,
      )
      assert.match(
        block,
        /Referrer-Policy/,
        `a Cache-Control location without referrer-policy: ${block.slice(0, 40)}`,
      )
    }
  })

  it('never caches the shell', () => {
    const root = /location = \/\s*\{([^}]*)\}/.exec(directives)?.[1] ?? ''
    assert.match(root, /Cache-Control "no-store"/)
  })

  it('caches hashed assets immutably', () => {
    const assets = /location \/assets\/\s*\{([^}]*)\}/.exec(directives)?.[1] ?? ''
    assert.match(assets, /immutable/)
  })
})

describe('the CI deep-link probe names a real route', () => {
  it('is a path this app owns', () => {
    const segment = DEEP_LINK_PATH.split('/')[1] ?? ''
    assert.ok(
      NON_INDEX_PATHS.includes(segment),
      `${DEEP_LINK_PATH} starts at /${segment}, which is not a route`,
    )
  })

  it('is deep enough to exercise the wildcard rather than the top-level location', () => {
    assert.ok(DEEP_LINK_PATH.split('/').length >= 3, `${DEEP_LINK_PATH} is not a deep link`)
  })

  it('lands under a route declared as a wildcard', () => {
    const segment = DEEP_LINK_PATH.split('/')[1]
    assert.equal(ROUTES.find((r) => r.path === segment)?.wildcard, true)
  })

  it('is the path CI actually probes', () => {
    // A probe against a path the app does not own proves only that the 404 page renders, which is
    // the opposite of what the check is for.
    assert.ok(ci.includes(DEEP_LINK_PATH), `ci.yml does not probe ${DEEP_LINK_PATH}`)
  })

  it('CI also probes an address the app does NOT own, and requires a 404', () => {
    assert.match(ci, /nope\/not\/a\/route/)
    assert.match(ci, /"404"/)
  })
})
