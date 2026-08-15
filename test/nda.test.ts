/**
 * THE *NINETY DAYS AFTER* ROUTE TABLE, CHECKED AGAINST THE SERVICE THAT SERVES IT.
 *
 * The sibling of `test/worlds.test.ts`, for the second service this bundle now talks to, and
 * written the same way for the same reason: a test that asserts "the client calls `/v1/worlds/:id`"
 * is a test that the client agrees with itself. So this file reads `nda/src/server.ts` from the
 * sibling checkout and requires that each path and method `src/lib/nda.ts` sends is REGISTERED
 * there — found by SEARCHING for its `define(`/`defineMutation(`, never by line, because a line
 * number in somebody else's repository breaks the day they add an import.
 *
 * Three things are checked here that the micro-worlds file does not have to check, because nda is
 * a different kind of service:
 *
 * **1. WHICH GUARD.** micro-worlds has one gate (`authenticate`) and every route either calls it or
 * does not, so a boolean was enough. nda has five, and they are not interchangeable:
 * `requirePrincipal` takes any authenticated caller, `requireUser` insists the principal IS a user
 * (or a service naming one, with the write scope), `requireAdminPrincipal` demands `role:admin` or
 * the admin scope, `authenticate` is the bare token check `POST /join` uses before it resolves a
 * subject, and `communeContext` is `requireUser` plus "you have settled in this world". Getting
 * this wrong does not fail loudly in a browser — it draws a control that answers 403 for everybody
 * it is drawn for, which is exactly the defect `admin-web` shipped before the guards were asserted.
 * The table below records the guard per route and the check reads the handler.
 *
 * **2. THE IDEMPOTENCY HEADER.** Where micro-worlds asserts NO route reads an `Idempotency-Key`,
 * every one of nda's fifteen mutations is wrapped `defineMutation(..., 'header', ...)` and answers
 * **400** without one. That is a client bug that cannot be caught by reading paths, so the check
 * below is two-directional: nda must declare `'header'` for every mutation in the surface, AND the
 * client must be seen sending the header at each of those call sites.
 *
 * **3. THE DOOR.** nda has no hostname of its own — it is absent from `surfaces.ts`, which is why
 * it sat healthy and unreachable for weeks. This bundle reaches it through the `cf-api-nda` router
 * in `deploy/gateway/dynamic/public-api.yml`, and that router's rule is `PathPrefix(/v1/worlds)`.
 * So a route of nda's OUTSIDE that prefix is not merely uncalled, it is unreachable from any
 * browser, and the check at the end of this file says so out loud rather than letting somebody add
 * a client function for a path the gateway will never forward.
 *
 * ── What happens without the sibling ──────────────────────────────────────────────────────────
 *
 * `micro-nda` is a private repository and `pnpm test` must pass for somebody who has cloned only
 * this one, so a missing checkout SKIPS the cross-repository half — loudly, naming the check that
 * did not run, exactly as the micro-worlds file does. CI checks the service out and the workflow
 * requires the cross-check to have really run.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const here = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

/** Where a micro-nda checkout is, in the order CI and a developer's machine put it. */
const NDA_CANDIDATES = [
  process.env['CLOUDSFORGE_NDA_DIR'],
  here('../nda/src/server.ts'),
  here('.nda/src/server.ts'),
].filter((v): v is string => Boolean(v))

const ndaServer = NDA_CANDIDATES.find((p) => existsSync(p))

/**
 * Which gate a route is behind.
 *
 * `principal` — any authenticated caller. `user` — a user, or a service naming one with the write
 * scope. `admin` — `role:admin` or the admin scope. `session` — the bare token check, used by
 * `POST /join` before it resolves a subject. `commune` — `requireUser` and settled in this world,
 * through `communeContext`. `none` — the HMAC inbox, which no browser may ever call.
 */
type Guard = 'principal' | 'user' | 'admin' | 'session' | 'commune' | 'none'

/** The helper each guard is spelled with in `nda/src/server.ts`. */
const GUARD_CALL: Record<Guard, string | null> = {
  principal: 'requirePrincipal',
  user: 'requireUser',
  admin: 'requireAdminPrincipal',
  session: 'authenticate',
  commune: 'communeContext',
  none: null,
}

interface Route {
  readonly method: string
  readonly path: string
  readonly guard: Guard
  /** True when nda wraps it `defineMutation(..., 'header', ...)` and answers 400 without a key. */
  readonly idempotent: boolean
}

/**
 * The surface this bundle CALLS.
 *
 * Data, so the checks are mechanical: each entry must be registered by the service with the guard
 * and the idempotency mode written here, and the service must serve nothing neither table has
 * heard of.
 */
const SURFACE: readonly Route[] = [
  { method: 'GET', path: '/v1/worlds', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/map', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/roster', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/leaderboard', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/events', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/me', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/actions', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/reports', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/progress', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/objectives', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/achievements', guard: 'user', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/communes', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/communes/:cid', guard: 'user', idempotent: false },
  { method: 'POST', path: '/v1/worlds/:id/join', guard: 'session', idempotent: true },
  { method: 'PUT', path: '/v1/worlds/:id/actions', guard: 'user', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/skills', guard: 'user', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/objectives/:oid/claim', guard: 'user', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/communes', guard: 'user', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/communes/:cid/join', guard: 'commune', idempotent: true },
  {
    method: 'POST',
    path: '/v1/worlds/:id/communes/:cid/deposit',
    guard: 'commune',
    idempotent: true,
  },
  {
    method: 'POST',
    path: '/v1/worlds/:id/communes/:cid/withdraw',
    guard: 'commune',
    idempotent: true,
  },
  { method: 'POST', path: '/v1/worlds/:id/communes/:cid/leave', guard: 'commune', idempotent: true },
]

/**
 * The routes nda serves that this bundle deliberately does NOT call.
 *
 * Declining is a first-class entry rather than an omission, because an omission and an oversight
 * look identical from here. The reasons are in `src/lib/nda.ts`'s own header, and the check below
 * requires each of these to appear in that table so the reasons cannot quietly rot away.
 */
const DECLINED: readonly Route[] = [
  { method: 'POST', path: '/v1/events', guard: 'none', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/archive', guard: 'principal', idempotent: false },
  { method: 'GET', path: '/v1/worlds/:id/cosmetics', guard: 'user', idempotent: false },
  { method: 'PUT', path: '/v1/worlds/:id/cosmetics', guard: 'user', idempotent: true },
  { method: 'POST', path: '/v1/worlds', guard: 'admin', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/start', guard: 'admin', idempotent: true },
  { method: 'PUT', path: '/v1/worlds/:id/bots', guard: 'admin', idempotent: true },
  { method: 'POST', path: '/v1/worlds/:id/tick', guard: 'admin', idempotent: true },
]

const ALL: readonly Route[] = [...SURFACE, ...DECLINED]

const client = readFileSync(here('src/lib/nda.ts'), 'utf8')

/** Is a route written down in the client's own doc-comment table? Method cell and path cell. */
const citesRoute = (route: Route): boolean =>
  new RegExp(
    `\\|\\s*\`${route.method}\`\\s*\\|\\s*\`${route.path.replace(/[/:]/g, '\\$&')}\`\\s*\\|`,
  ).test(client)

/* ------------------------------------------------ shapes, never prefixes */

/**
 * Does a requested path match a served pattern? Same segment count, and every segment agrees.
 *
 * Copied from `test/worlds.test.ts`, which took it from `market/src/indexerclient.test.ts` rather
 * than inventing it a third time. A prefix is not a shape: `micro-mint` shipped a call to
 * `/v1/chains/:chain/:network/transactions/:hash`, a path that BEGINS with a served one and has
 * never existed, and a prefix check passed it.
 */
function matchesShape(requested: string, pattern: string): boolean {
  const asked = requested.split('/')
  const serves = pattern.split('/')
  if (asked.length !== serves.length) return false
  return serves.every((segment, index) => {
    const mine = asked[index] ?? ''
    return segment.startsWith(':') ? mine.length > 0 : segment === mine
  })
}

/** `${...}` is exactly ONE segment, so a helper standing for two is refused rather than guessed. */
const placeholder = (path: string): string => path.replace(/\$\{[^}]*\}/g, 'x')

/** The executable part of the client: prose stripped, so a sentence is never read as a request. */
function codeOf(source: string): string {
  // COMMENTS FIRST. The client's header quotes every declined path in a table — including the four
  // admin mutations it must never send — and a checker that cannot tell a request from a sentence
  // about one would assert the exact opposite of the truth.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

/**
 * Every call site as a METHOD, a path, and whether an idempotency key went with it.
 *
 * `api()` defaults to GET (`src/lib/api.ts`), so a call site with no `method:` is a GET. The options
 * object follows the path in the same call, which is why the method and the header are looked for
 * between this path literal and the next one — and why `src/lib/nda.ts` writes every path out in
 * full instead of assembling it from a helper. A path built from fragments is a path this cannot
 * see.
 */
function requestedCalls(
  source: string,
): ReadonlyArray<{ method: string; path: string; sendsKey: boolean }> {
  const code = codeOf(source)
  const matches = [...code.matchAll(/['"`](\/v1\/[^'"`]*)['"`]/g)]
  return matches.map((match, index) => {
    const from = (match.index ?? 0) + match[0].length
    const to = matches[index + 1]?.index ?? code.length
    const options = code.slice(from, to)
    return {
      method: /method:\s*'([A-Z]+)'/.exec(options)?.[1] ?? 'GET',
      path: match[1] ?? '',
      sendsKey: /'idempotency-key'/i.test(options),
    }
  })
}

describe('the game client calls only routes it has cited', () => {
  const calls = requestedCalls(client)

  it('every path in the client is a WHOLE ROUTE SHAPE the service serves', () => {
    // Stated positively so this cannot go vacuous by the extractor breaking and finding nothing.
    assert.ok(calls.length >= 20, `expected the call sites, found ${calls.length}`)

    for (const call of calls) {
      assert.ok(
        SURFACE.some((r) => matchesShape(placeholder(call.path), r.path)),
        `src/lib/nda.ts requests ${call.path}, which is not a whole route shape in the surface`,
      )
    }
  })

  it('and it never requests a path the service does not serve, including a served PREFIX', () => {
    // Every path here BEGINS with something nda really serves. A prefix check passes all of them.
    const dead = [
      '/v1/worlds/${id}/map/tiles',
      '/v1/worlds/${id}/communes/${cid}/stockpile',
      '/v1/worlds/${id}/reports/${day}',
      '/v1/worlds/${id}/players',
      // A two-segment helper collapsing a path: `${scope}` holding `worlds/${id}` gives one
      // segment too few, and matches nothing rather than matching the wrong thing.
      '/v1/${scope}/roster',
    ]
    for (const path of dead) {
      assert.equal(
        SURFACE.some((r) => matchesShape(placeholder(path), r.path)),
        false,
        `${path} is not served by micro-nda, but this check accepted it`,
      )
    }

    // And it is not simply refusing everything: every route in the surface matches itself.
    for (const route of SURFACE) {
      assert.ok(matchesShape(route.path, route.path), route.path)
    }
  })

  it('names every route in its own table, and says which file it read them from', () => {
    for (const route of ALL) {
      assert.ok(citesRoute(route), `${route.method} ${route.path} is not in src/lib/nda.ts's table`)
    }
    assert.ok(
      client.includes('nda/src/server.ts'),
      'src/lib/nda.ts no longer says which service source its surface was read from',
    )
  })

  it('every call site uses a method the surface table cites for that shape', () => {
    // `GET /v1/worlds/:id/actions` reads the queue and `PUT` replaces it; they are one path and two
    // routes. A client that sent the wrong verb to the right path would be refused by the service
    // and would have passed a path-only check here.
    for (const call of calls) {
      assert.ok(
        SURFACE.some((r) => r.method === call.method && matchesShape(placeholder(call.path), r.path)),
        `src/lib/nda.ts sends ${call.method} ${call.path}, which is not in the verified surface`,
      )
    }
  })

  it('every declined route says why, and none of them is called', () => {
    for (const route of DECLINED) {
      assert.ok(
        calls.every(
          (c) => !(c.method === route.method && matchesShape(placeholder(c.path), route.path)),
        ),
        `${route.method} ${route.path} is declined but src/lib/nda.ts requests it`,
      )
    }
  })

  it('sends an Idempotency-Key at every mutation call site, and at no read', () => {
    // nda answers 400 — not 500, not silently — when a mutation arrives without the header, so a
    // missing key is a button that never works. The reverse matters less but is still a lie about
    // what the route is, so both directions are asserted.
    for (const call of calls) {
      const route = SURFACE.find(
        (r) => r.method === call.method && matchesShape(placeholder(call.path), r.path),
      )
      assert.ok(route, `${call.method} ${call.path}`)
      assert.equal(
        call.sendsKey,
        route.idempotent,
        `${call.method} ${call.path}: nda ${route.idempotent ? 'requires' : 'does not read'} an ` +
          `Idempotency-Key and this client ${call.sendsKey ? 'sends' : 'omits'} one`,
      )
    }
  })

  it('derives each key from the DECISION, not from the world, so a changed mind is not a 409', () => {
    // ══════════════════════════════════════════════════════════════════════════════════════════
    // The trap this exists to stop somebody walking back into.
    //
    // `withIdempotency` stores a fingerprint of the request beside the key and throws
    // `IdempotencyKeyReuseError` when the same key returns with a DIFFERENT body. A key naming
    // only the world — the shape `admin-web` can safely use, because an operator creating a world
    // twice means it twice — would let a player queue `[work, work]`, change their mind to
    // `[rest]`, and be refused by the service with nothing on screen to explain it.
    //
    // So the queue key must carry a fingerprint of the actions and the stockpile keys must carry
    // the amounts. Asserted on the source because the alternative is asserting it in a comment.
    // ══════════════════════════════════════════════════════════════════════════════════════════
    const code = codeOf(client)
    assert.match(
      code,
      /idempotencyKeyFor\(\s*'queue',\s*`\$\{worldId\}-\$\{actionsFingerprint\(actions\)\}`/,
      'the action-queue key no longer fingerprints the actions: changing your mind will 409',
    )
    for (const scope of ['deposit', 'withdraw']) {
      assert.match(
        code,
        new RegExp(`idempotencyKeyFor\\(\\s*'${scope}',\\s*\`\\$\\{communeId\\}-\\$\\{bagFingerprint`),
        `the ${scope} key no longer carries the amounts: a second, different ${scope} will 409`,
      )
    }
    // And the per-decision subjects, which are the same defect one level down: two perks are two
    // decisions, and two objectives are two claims.
    assert.match(code, /idempotencyKeyFor\('perk', `\$\{worldId\}-\$\{perkId\}`/)
    assert.match(code, /idempotencyKeyFor\('claim', objectiveId/)
  })
})

describe('every route this bundle names is really registered by micro-nda', () => {
  if (ndaServer === undefined) {
    // NOT a silent pass. It says which check did not run, and CI makes the absence fatal.
    it('SKIPPED: no micro-nda checkout — CI checks one out and requires this to run', () => {
      assert.ok(true)
    })
    return
  }

  const source = readFileSync(ndaServer, 'utf8')
  const lines = source.split('\n')

  /** `define(` is GET-only in nda and throws at module load otherwise; writes use `defineMutation(`. */
  const REGISTRATION = /^\s{4}define(?:Mutation)?\('([A-Z]+)',\s*'([^']+)'(?:,\s*'([a-z]+)')?/

  it('reads a server with a route table in it, so this cannot pass on an empty file', () => {
    const registrations = lines.filter((l) => REGISTRATION.test(l))
    assert.ok(registrations.length >= 30, `expected nda's route list, found ${registrations.length}`)
  })

  /** Where a route is registered, found by SEARCHING for it rather than by citing a line. */
  const indexOfRoute = (method: string, path: string): number => {
    const re = new RegExp(
      `^\\s{4}define(?:Mutation)?\\('${method}',\\s*'${path.replace(/[/:]/g, '\\$&')}'`,
    )
    return lines.findIndex((l) => re.test(l))
  }

  /** A handler runs to the next registration, or to the `];` that closes the route array. */
  const bodyOf = (start: number): string => {
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i] ?? ''
      if (REGISTRATION.test(line) || /^\s{2}\];/.test(line)) {
        end = i
        break
      }
    }
    return lines.slice(start, end).join('\n')
  }

  for (const route of ALL) {
    it(`${route.method} ${route.path} is registered in nda/src/server.ts`, () => {
      assert.ok(
        indexOfRoute(route.method, route.path) >= 0,
        `${route.method} ${route.path} is not registered in nda/src/server.ts at all`,
      )
    })
  }

  it('this bundle knows about every /v1 route nda serves — called or declined', () => {
    // Both directions. A route the service grew that neither table has heard of is not a failure of
    // the app, but it IS the moment somebody should look.
    const registered = lines
      .map((l) => REGISTRATION.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => `${m[1]} ${m[2]}`)
      .filter((r) => r.includes('/v1/'))
    const known = ALL.map((r) => `${r.method} ${r.path}`)
    assert.deepEqual(
      registered.filter((r) => !known.includes(r)),
      [],
      'nda serves a /v1 route this app has never read. Read it, then add it to SURFACE or DECLINED.',
    )
  })

  it('each route is behind the guard this app thinks it is behind', () => {
    // The defect this asserts against is a control drawn for everybody that answers 403 for
    // everybody — a screen gated on the wrong authority, which looks perfectly fine until somebody
    // who is not an administrator opens it.
    for (const route of ALL) {
      const start = indexOfRoute(route.method, route.path)
      assert.ok(start >= 0, `${route.method} ${route.path} is not registered in nda/src/server.ts`)
      const body = bodyOf(start)
      const expected = GUARD_CALL[route.guard]

      if (expected === null) {
        for (const helper of Object.values(GUARD_CALL)) {
          if (helper === null) continue
          assert.doesNotMatch(
            body,
            new RegExp(`(?<![A-Za-z])${helper}\\(ctx`),
            `${route.method} ${route.path}: this app treats it as unauthenticated and it calls ${helper}`,
          )
        }
        continue
      }

      assert.match(
        body,
        new RegExp(`(?<![A-Za-z])${expected}\\(ctx`),
        `${route.method} ${route.path}: this app expects ${expected} and the handler does not call it`,
      )
      // `requirePrincipal` is `authenticate` with a name, so a route behind it legitimately shows
      // neither more nor less; what must not appear is a STRICTER gate the app has not accounted
      // for. A `requireUser` route drawn as if any principal could reach it is the same bug as an
      // admin route drawn for a player.
      for (const stricter of ['requireAdminPrincipal', 'requireUser'] as const) {
        if (stricter === expected) continue
        if (route.guard === 'commune' && stricter === 'requireUser') continue
        assert.doesNotMatch(
          body,
          new RegExp(`(?<![A-Za-z])${stricter}\\(ctx`),
          `${route.method} ${route.path}: this app expects ${expected} and the handler calls ${stricter}`,
        )
      }
    }
  })

  it('every mutation this app sends is one nda declares idempotent, and no read is', () => {
    // The other half of the header check above: the client sends a key exactly where the service
    // demands one, and the service is the one asked.
    for (const route of ALL) {
      const start = indexOfRoute(route.method, route.path)
      const declared = REGISTRATION.exec(lines[start] ?? '')?.[3]
      assert.equal(
        declared === 'header',
        route.idempotent,
        `${route.method} ${route.path}: nda declares '${declared}' and this app assumed ` +
          `${route.idempotent ? "'header'" : 'no key was needed'}`,
      )
    }
  })

  it('the mirrored perk catalogue still matches the engine, name for name', () => {
    // `GET /v1/worlds/:id/progress` returns `perks` as a list of IDS and nda serves no catalogue
    // route, so `PERKS` in src/lib/nda.ts is a copy — the only way to draw a skill tree instead of
    // drawing `farmer_2` at a player. A copy that can drift silently is worse than no copy, which
    // is what this reads the real `rules.ts` for.
    const rules = ndaServer.replace(/server\.ts$/, 'rules.ts')
    if (!existsSync(rules)) {
      assert.ok(true, 'SKIPPED: no nda/src/rules.ts beside the server checkout')
      return
    }
    const engine = [...readFileSync(rules, 'utf8').matchAll(/\{\s*id:\s*'([a-z_0-9]+)',\s*branch:\s*'([a-z]+)',\s*name:\s*'([^']+)',\s*tier:\s*(\d+),\s*(?:requires:\s*'([a-z_0-9]+)',\s*)?description:\s*'([^']+)'/g)].map(
      (m) => ({
        id: m[1],
        branch: m[2],
        name: m[3],
        tier: Number(m[4]),
        requires: m[5] ?? null,
        description: m[6],
      }),
    )
    assert.ok(engine.length >= 15, `expected nda's SKILL_PERKS, parsed ${engine.length} of them`)

    const mirrored = [
      ...client.matchAll(/\{\s*id:\s*'([a-z_0-9]+)',\s*branch:\s*'([a-z]+)',\s*name:\s*'([^']+)',\s*tier:\s*(\d+),\s*requires:\s*(?:'([a-z_0-9]+)'|null),\s*description:\s*'([^']+)'/g),
    ].map((m) => ({
      id: m[1],
      branch: m[2],
      name: m[3],
      tier: Number(m[4]),
      requires: m[5] ?? null,
      description: m[6],
    }))

    assert.deepEqual(
      mirrored,
      engine,
      'src/lib/nda.ts mirrors nda/src/rules.ts SKILL_PERKS and they have drifted apart',
    )
  })

  it('every route this app calls is behind the gateway prefix that can reach nda at all', () => {
    // nda is absent from `surfaces.ts` and has no hostname. The ONLY way a browser reaches it is
    // the `cf-api-nda` router in `deploy/gateway/dynamic/public-api.yml`, whose rule is
    // `Host(api.<apex>) && PathPrefix(/v1/worlds)`. A client function for a path outside that
    // prefix would be a function that cannot be called from a browser, however correct it looked
    // here — which is the exact shape of the fault that kept this whole title in `draft`.
    const REACHABLE = '/v1/worlds'
    for (const route of SURFACE) {
      assert.ok(
        route.path === REACHABLE || route.path.startsWith(`${REACHABLE}/`),
        `${route.method} ${route.path} is called but sits outside ${REACHABLE}, which is the only ` +
          'prefix the cf-api-nda router forwards',
      )
    }
    // And the one route that really is outside it is one this app declines, for a reason that has
    // nothing to do with the gateway: no browser may ever hold the outbox HMAC key.
    assert.ok(
      DECLINED.some((r) => r.path === '/v1/events'),
      'POST /v1/events must stay declined: it is the HMAC outbox inbox',
    )
  })
})
