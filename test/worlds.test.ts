/**
 * THE ROUTE TABLE, CHECKED AGAINST THE SERVICE THAT SERVES IT.
 *
 * Every client in this estate that was built against an imagined surface passed its own tests.
 * That is the whole problem: a test that asserts "the client calls /v1/titles" is a test that the
 * client agrees with itself. So this file does not assert paths in the abstract — it reads
 * `worlds/src/server.ts` from the sibling checkout and requires that each path and method this
 * bundle calls is REGISTERED there, at the line the citation names.
 *
 * ── Two checks, because one of them has already been fooled ───────────────────────────────────
 *
 * **1. Citations.** Each entry in `SURFACE` names a line; the line must contain the `define(` that
 * registers exactly that method and path.
 *
 * **2. SHAPES, never prefixes.** `micro-market`'s guard matched `path.startsWith(servedPrefix)`
 * and would have passed two genuinely dead paths because they BEGAN with a served prefix —
 * `micro-mint` then shipped exactly that defect, calling
 * `/v1/chains/:chain/:network/transactions/:hash`, which the indexer has never served. Worse, a
 * `${scope}` helper standing for two segments collapsed a path so it matched an entirely DIFFERENT
 * route and was reported fine. The corrected form is `market/src/indexerclient.test.ts:230-249`,
 * and `matchesShape` below is copied from it rather than invented a third time: same segment
 * count, every segment agrees, and a `${...}` is exactly one segment.
 *
 * ── What happens without the sibling ──────────────────────────────────────────────────────────
 *
 * The service is a private repository. `pnpm test` must pass for somebody who has cloned only this
 * one, so a missing checkout SKIPS the cross-repository half — and, because a skipped test is an
 * unmeasured one, CI is where absence becomes a failure: the `check` job checks micro-worlds out
 * and the workflow asserts the cross-check REALLY RAN by requiring the count in the output.
 * Neither half can go quiet on its own.
 *
 * ── And the mutation that proves the check can fail ───────────────────────────────────────────
 *
 * `micro-mint-web`'s CI bends a citation and requires the suite to go red. It once HARDCODED the
 * line number it mutates: the day micro-mint's route table moved, the `sed` matched nothing, the
 * mutation did not happen, the suite passed unmutated, and the step reported "the cross-check
 * passed a citation off by one line" when the truth was that no citation had been bent. So the
 * equivalent step in this repository's ci.yml READS the number out of this file, and REFUSES TO
 * GRADE AN UNMUTATED FILE — it greps for the bent value and exits non-zero if the mutation did not
 * apply. A mutation test that names the value it mutates goes stale exactly when the thing it
 * guards changes.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const here = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

/** Where a micro-worlds checkout is, in the order CI and a developer's machine put it. */
const WORLDS_CANDIDATES = [
  process.env['CLOUDSFORGE_WORLDS_DIR'],
  here('../worlds/src/server.ts'),
  here('.worlds/src/server.ts'),
].filter((v): v is string => Boolean(v))

const worldsServer = WORLDS_CANDIDATES.find((p) => existsSync(p))

interface Route {
  readonly method: string
  readonly path: string
  readonly line: number
  readonly authenticates: boolean
}

/**
 * The surface this bundle CALLS, with the line each was read from.
 *
 * Written down here as DATA so the checks below can be mechanical. If one of these citations is
 * wrong, the test fails and names it — which is the property a comment does not have.
 */
const SURFACE: readonly Route[] = [
  { method: 'GET', path: '/v1/titles', line: 531, authenticates: false },
  { method: 'GET', path: '/v1/players/me', line: 588, authenticates: true },
  { method: 'PUT', path: '/v1/players/me', line: 615, authenticates: true },
  { method: 'PUT', path: '/v1/players/me/cosmetics', line: 640, authenticates: true },
  { method: 'GET', path: '/v1/players/me/inventory', line: 662, authenticates: true },
  { method: 'POST', path: '/v1/players/me/inventory/:id/list', line: 681, authenticates: true },
  { method: 'DELETE', path: '/v1/players/me/inventory/:id/list', line: 695, authenticates: true },
  { method: 'GET', path: '/v1/provisions', line: 706, authenticates: true },
  { method: 'GET', path: '/v1/provisions/:id', line: 747, authenticates: true },
  { method: 'GET', path: '/v1/titles/:id/achievements', line: 765, authenticates: false },
  { method: 'GET', path: '/v1/titles/:id/seasons', line: 819, authenticates: false },
]

/**
 * The `/v1` routes `worlds` serves that this bundle deliberately does NOT call.
 *
 * Declining is a first-class entry rather than an omission. The "knows about everything it serves"
 * test below is satisfied by `SURFACE ∪ DECLINED`, so a route the service grows and nobody reads
 * fails the build instead of going quiet.
 */
const DECLINED: readonly Route[] = [
  { method: 'POST', path: '/v1/events', line: 411, authenticates: false },
  { method: 'POST', path: '/v1/titles', line: 548, authenticates: true },
  { method: 'POST', path: '/v1/provisions/:id/retry', line: 731, authenticates: true },
  { method: 'PUT', path: '/v1/titles/:id/achievements', line: 778, authenticates: true },
  { method: 'POST', path: '/v1/titles/:id/achievements/unlock', line: 799, authenticates: true },
  { method: 'POST', path: '/v1/titles/:id/seasons', line: 824, authenticates: true },
  { method: 'GET', path: '/v1/seasons/:id/budget', line: 848, authenticates: true },
  { method: 'POST', path: '/v1/seasons/:id/rewards', line: 871, authenticates: true },
]

const ALL: readonly Route[] = [...SURFACE, ...DECLINED]

const client = readFileSync(here('src/lib/worlds.ts'), 'utf8')

/* ------------------------------------------------ shapes, never prefixes */

/**
 * Does a requested path match a served pattern? Same segment count, and every segment agrees.
 *
 * **Segment counts, never prefixes.** Copied from `market/src/indexerclient.test.ts:230-249`, which
 * is itself the corrected form of a guard that matched by prefix and would have passed a dead path
 * because it began with a served one. A count is not a shape, and a prefix is not a shape.
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

/**
 * `${...}` is exactly ONE segment.
 *
 * So a helper standing for two — a `${scope}` holding `chain/network` — produces a path one segment
 * short of every pattern and is refused rather than guessed at. That is deliberate: a checker that
 * accepts a path whose shape it cannot see would have passed the defect it exists to catch.
 */
const placeholder = (path: string): string => path.replace(/\$\{[^}]*\}/g, 'x')

/** The executable part of the client: prose stripped, so a sentence is never read as a request. */
function codeOf(source: string): string {
  // COMMENTS STRIPPED FIRST. This file and the client both quote declined paths in prose — the
  // whole DECLINED table above is a list of paths this bundle must never send — and a checker that
  // cannot tell a request from a sentence about one is not a checker. Without this, every declined
  // route would be read as a call site and the test would assert the opposite of the truth.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

/** Every request path this client sends, read out of its source with the PROSE STRIPPED. */
export function requestedPaths(source: string): readonly string[] {
  return [...codeOf(source).matchAll(/['"`](\/v1\/[^'"`]*)['"`]/g)].map((m) => m[1] ?? '')
}

/**
 * Every call site as a METHOD AND a path.
 *
 * The method matters, and finding that out is what this test caught on its first run: `GET
 * /v1/titles` is called and `POST /v1/titles` is declined, and they are the same PATH. A checker
 * that compared paths alone reported the called route as a violation of the declined one — the
 * mirror of the estate's prefix bug, one level up. A shape is a method and a path together.
 *
 * `api()` defaults to GET (`src/lib/api.ts:271`), so a call site with no `method:` is a GET. The
 * options object follows the path in the same call, so the method is looked for between this path
 * literal and the next one.
 */
function requestedCalls(source: string): ReadonlyArray<{ method: string; path: string }> {
  const code = codeOf(source)
  const matches = [...code.matchAll(/['"`](\/v1\/[^'"`]*)['"`]/g)]
  return matches.map((match, index) => {
    const from = (match.index ?? 0) + match[0].length
    const to = matches[index + 1]?.index ?? code.length
    const method = /method:\s*'([A-Z]+)'/.exec(code.slice(from, to))?.[1]
    return { method: method ?? 'GET', path: match[1] ?? '' }
  })
}

describe('the client calls only routes it has cited', () => {
  it('every path in the client is a WHOLE ROUTE SHAPE the service serves', () => {
    const paths = requestedPaths(client)
    // Stated positively so the assertion below cannot go vacuous by the extractor breaking and
    // finding nothing at all.
    assert.ok(paths.length >= 9, `expected the call sites, found ${paths.length}: ${paths.join(', ')}`)

    for (const path of new Set(paths)) {
      const shape = placeholder(path)
      assert.ok(
        SURFACE.some((r) => matchesShape(shape, r.path)),
        `src/lib/worlds.ts requests ${path}, which is not a whole route shape in the verified surface`,
      )
    }
  })

  it('and it never requests a path the service does not serve, including a served PREFIX', () => {
    // ══════════════════════════════════════════════════════════════════════════════════════════
    // THE MUTATION, IN THE SUITE.
    //
    // It is not enough that the check says "all good". It has to be shown that it can say
    // otherwise, and specifically on the case a prefix version would pass. Every path below BEGINS
    // with something `worlds` really serves.
    // ══════════════════════════════════════════════════════════════════════════════════════════
    const dead = [
      // The `micro-mint` defect's shape: a served prefix with a resource bolted on.
      '/v1/titles/${id}/achievements/${key}',
      '/v1/players/me/inventory/${id}',
      // Right resource, one segment too many.
      '/v1/provisions/${id}/retry/latest',
      // Right shape, wrong resource — this is what a prefix check cannot see.
      '/v1/players/me/wardrobe',
      // A two-segment helper collapsing a path. `/v1/titles/x/seasons` has five segments; a
      // `${scope}` standing for `titles/${id}` gives four, matching nothing.
      '/v1/${scope}/seasons',
    ]
    for (const path of dead) {
      assert.equal(
        SURFACE.some((r) => matchesShape(placeholder(path), r.path)),
        false,
        `${path} is not served by micro-worlds, but this check accepted it`,
      )
    }

    // And it is not simply refusing everything: every route in the surface matches itself.
    for (const route of SURFACE) {
      assert.ok(matchesShape(route.path, route.path), route.path)
    }
  })

  it('cites a line for every route, in the doc comment as well as here', () => {
    for (const route of ALL) {
      assert.ok(
        client.includes(`worlds/src/server.ts:${route.line}`),
        `${route.method} ${route.path} has no citation in src/lib/worlds.ts`,
      )
    }
  })

  it('every call site uses a method the surface table cites for that shape', () => {
    // The other half of "shape". `POST /v1/titles` and `GET /v1/titles` are one path and two
    // routes, with two different authorities behind them — the first demands `worlds:admin`. A
    // client that sent the wrong verb to the right path would be refused by the service and would
    // have passed a path-only check here.
    const calls = requestedCalls(client)
    assert.ok(calls.length >= 9, `expected the call sites, found ${calls.length}`)
    for (const call of calls) {
      assert.ok(
        SURFACE.some((r) => r.method === call.method && matchesShape(placeholder(call.path), r.path)),
        `src/lib/worlds.ts sends ${call.method} ${call.path}, which is not in the verified surface`,
      )
    }
  })

  it('every declined route says why, and none of them is called', () => {
    const calls = requestedCalls(client)
    for (const route of DECLINED) {
      assert.ok(
        calls.every(
          (call) => !(call.method === route.method && matchesShape(placeholder(call.path), route.path)),
        ),
        `${route.method} ${route.path} is declined but src/lib/worlds.ts requests it`,
      )
    }
    // The declined table is only honest while the reasons are written down. Each one appears in
    // the client's own header table, keyed by its citation.
    assert.ok(
      DECLINED.every((route) => client.includes(`worlds/src/server.ts:${route.line}`)),
      'a declined route has no citation in the client',
    )
  })
})

describe('the cited lines are the lines that register the routes', () => {
  if (worldsServer === undefined) {
    // NOT a silent pass. It says which check did not run, and CI makes the absence fatal.
    it('SKIPPED: no micro-worlds checkout — CI checks one out and requires this to run', () => {
      assert.ok(true)
    })
    return
  }

  const source = readFileSync(worldsServer, 'utf8')
  const lines = source.split('\n')

  it('reads a server with a route table in it, so this cannot pass on an empty file', () => {
    const defines = lines.filter((l) => /^\s{4}define\('/.test(l))
    assert.ok(defines.length >= 20, `expected worlds' route list, found ${defines.length} defines`)
  })

  for (const route of ALL) {
    it(`${route.method} ${route.path} is registered at worlds/src/server.ts:${route.line}`, () => {
      // 1-indexed citation, 0-indexed array.
      const line = lines[route.line - 1] ?? ''
      assert.match(
        line,
        new RegExp(`define\\('${route.method}',\\s*'${route.path.replace(/[/:]/g, '\\$&')}'`),
        `worlds/src/server.ts:${route.line} is:\n  ${line.trim()}`,
      )
    })
  }

  it('this bundle knows about every /v1 route worlds serves — called or declined', () => {
    // Both directions. A route the service grew that neither table has heard of is not a failure
    // of the app, but it IS the moment somebody should look — the citations are only trustworthy
    // while somebody is re-reading them.
    const registered = lines
      .map((l) => /^\s{4}define\('([A-Z]+)',\s*'([^']+)'/.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => `${m[1]} ${m[2]}`)
      .filter((r) => r.includes('/v1/'))
    const known = ALL.map((r) => `${r.method} ${r.path}`)
    assert.deepEqual(
      registered.filter((r) => !known.includes(r)),
      [],
      'worlds serves a /v1 route this app has never read. Read it, then add it to SURFACE or DECLINED.',
    )
  })

  it('the three routes called without a token really make no authenticate() call', () => {
    // The defect this asserts against is a client sending a bearer to a handler that never wanted
    // one — and its mirror, a client gating a screen the service serves to anybody.
    for (const route of ALL) {
      const start = route.line - 1
      // The handler runs to the next `define(` at the same indentation, or to the end.
      let end = lines.length
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\s{4}define\('/.test(lines[i] ?? '')) {
          end = i
          break
        }
      }
      const body = lines.slice(start, end).join('\n')
      assert.equal(
        /await authenticate\(ctx, deps\)/.test(body),
        route.authenticates,
        `${route.method} ${route.path}: this app treats it as ` +
          `${route.authenticates ? 'authenticated' : 'unauthenticated'} and the handler disagrees`,
      )
    }
  })

  it('no route on worlds requires an Idempotency-Key, which is why this client sends none', () => {
    // Four wallet routes and five market mutations in this estate answer 400 without the header.
    // Worlds has no such wrapper on its OWN routes, and asserting it here is what stops somebody
    // "fixing" this client by adding a header the service ignores — or, worse, concluding the
    // reverse. The header does appear in `worlds/src/titleclient.ts`, where worlds is the CALLER
    // and sends the entitlement id to a title; that file is not this one.
    assert.doesNotMatch(source, /idempotency-key/i, 'worlds now reads an Idempotency-Key header')
    assert.doesNotMatch(source, /withIdempotentRoute/, 'worlds now wraps a route for idempotency')
  })
})

/* ------------------------------------------------ the gap, against the real thing */

describe('the title bridge gap is real, and is stated as it is', () => {
  const titleClient = WORLDS_CANDIDATES.map((p) => p.replace('/server.ts', '/titleclient.ts')).find(
    (p) => existsSync(p),
  )

  if (titleClient === undefined) {
    it('SKIPPED: no micro-worlds checkout — CI checks one out and requires this to run', () => {
      assert.ok(true)
    })
    return
  }

  const lines = readFileSync(titleClient, 'utf8').split('\n')

  // The two calls worlds makes INTO a title, cited by line in src/lib/worlds.ts. If either moves,
  // this fails and names it rather than letting the README describe a file that has changed.
  const TITLE_CALLS: ReadonlyArray<{ line: number; fragment: string }> = [
    { line: 122, fragment: "'/v1/title'" },
    { line: 135, fragment: "'/v1/provision'" },
  ]

  for (const call of TITLE_CALLS) {
    it(`worlds calls ${call.fragment} at worlds/src/titleclient.ts:${call.line}`, () => {
      const line = lines[call.line - 1] ?? ''
      assert.ok(
        line.includes(call.fragment),
        `worlds/src/titleclient.ts:${call.line} is:\n  ${line.trim()}`,
      )
    })
  }

  it('and neither micro-emberkin nor micro-nda serves either of them', () => {
    // Read from the real files when they are there. Absent, this is skipped rather than asserted
    // from memory — the one thing worse than not checking is asserting a stale check passed.
    const titles: ReadonlyArray<{ name: string; path: string }> = [
      { name: 'emberkin', path: here('../emberkin/src/server.ts') },
      { name: 'nda', path: here('../nda/src/server.ts') },
    ].filter((t) => existsSync(t.path))

    if (titles.length === 0) {
      // Not a silent pass: the assertion is that we KNOW we did not check.
      assert.ok(true, 'no title checkout; the estate-wide half of this claim was not verified here')
      return
    }

    for (const title of titles) {
      const body = readFileSync(title.path, 'utf8')
      // Whole route shapes, not substrings: `/v1/titles` in worlds is not `/v1/title`, and a
      // substring check would confuse the two in either direction.
      const registered = body
        .split('\n')
        .map((l) => /define(?:Mutation)?\('([A-Z]+)',\s*'([^']+)'/.exec(l))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => m[2] ?? '')
      assert.ok(
        !registered.some((p) => matchesShape('/v1/title', p)),
        `${title.name} now serves GET /v1/title — the bridge gap has closed and this app still says it has not`,
      )
      assert.ok(
        !registered.some((p) => matchesShape('/v1/provision', p)),
        `${title.name} now serves POST /v1/provision — the bridge gap has closed and this app still says it has not`,
      )
    }
  })
})
