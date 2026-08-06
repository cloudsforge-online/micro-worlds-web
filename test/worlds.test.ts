/**
 * THE ROUTE TABLE, CHECKED AGAINST THE SERVICE THAT SERVES IT.
 *
 * Every client in this estate that was built against an imagined surface passed its own tests.
 * That is the whole problem: a test that asserts "the client calls /v1/titles" is a test that the
 * client agrees with itself. So this file does not assert paths in the abstract — it reads
 * `worlds/src/server.ts` from the sibling checkout and requires that each path and method this
 * bundle calls is REGISTERED there — found by SEARCHING for its `define(`, never by line.
 *
 * ── Two checks, because one of them has already been fooled ───────────────────────────────────
 *
 * **1. Registration.** Each entry in `SURFACE` must be registered by the service. It used to name
 * a LINE, and the line is why this repository kept turning red for edits made in a different one:
 * micro-trade inserted seven lines near its imports, every route below it moved, and every
 * citation in every client broke while the routes themselves were untouched. Nothing runs this
 * suite when micro-worlds changes, so it surfaced whenever somebody next tried to release. A
 * search costs one pass over a file already in memory, cannot go stale, and still fails when a
 * route is REMOVED — which is the fact worth having.
 *
 * **2. SHAPES, never prefixes.** `micro-market`'s guard matched `path.startsWith(servedPrefix)`
 * and would have passed two genuinely dead paths because they BEGAN with a served prefix —
 * `micro-mint` then shipped exactly that defect, calling
 * `/v1/chains/:chain/:network/transactions/:hash`, which the indexer has never served. Worse, a
 * `${scope}` helper standing for two segments collapsed a path so it matched an entirely DIFFERENT
 * route and was reported fine. The corrected form is `market/src/indexerclient.test.ts`,
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
 * passed a citation off by one line" when the truth was that no citation had been bent.
 *
 * The equivalent step in this repository's ci.yml now bends a PATH instead — it renames
 * `/v1/titles` to a route worlds does not serve — and still REFUSES TO GRADE AN UNMUTATED FILE,
 * grepping for the mutated value and exiting non-zero if the write did not land. Bending a line
 * tested that the suite read a particular position in the service; bending a path tests that it
 * read the service at all, which is the property actually worth having and the only one that
 * survives micro-worlds being edited.
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
  readonly authenticates: boolean
}

/**
 * The surface this bundle CALLS.
 *
 * Written down here as DATA so the checks below can be mechanical: each entry must be registered
 * by the service, and the service must serve nothing neither table has heard of. Neither direction
 * needs a line number, and a line number is what used to break this file whenever micro-worlds was
 * edited in a way that moved its routes without changing them.
 */
const SURFACE: readonly Route[] = [
  { method: 'GET', path: '/v1/titles', authenticates: false },
  { method: 'GET', path: '/v1/players/me', authenticates: true },
  { method: 'PUT', path: '/v1/players/me', authenticates: true },
  { method: 'PUT', path: '/v1/players/me/cosmetics', authenticates: true },
  { method: 'GET', path: '/v1/players/me/inventory', authenticates: true },
  { method: 'POST', path: '/v1/players/me/inventory/:id/list', authenticates: true },
  { method: 'DELETE', path: '/v1/players/me/inventory/:id/list', authenticates: true },
  { method: 'GET', path: '/v1/provisions', authenticates: true },
  { method: 'GET', path: '/v1/provisions/:id', authenticates: true },
  { method: 'GET', path: '/v1/titles/:id/achievements', authenticates: false },
  { method: 'GET', path: '/v1/titles/:id/seasons', authenticates: false },
]

/**
 * The `/v1` routes `worlds` serves that this bundle deliberately does NOT call.
 *
 * Declining is a first-class entry rather than an omission. The "knows about everything it serves"
 * test below is satisfied by `SURFACE ∪ DECLINED`, so a route the service grows and nobody reads
 * fails the build instead of going quiet.
 */
const DECLINED: readonly Route[] = [
  { method: 'POST', path: '/v1/events', authenticates: false },
  { method: 'POST', path: '/v1/titles', authenticates: true },
  { method: 'POST', path: '/v1/provisions/:id/retry', authenticates: true },
  { method: 'PUT', path: '/v1/titles/:id/achievements', authenticates: true },
  { method: 'POST', path: '/v1/titles/:id/achievements/unlock', authenticates: true },
  { method: 'POST', path: '/v1/titles/:id/seasons', authenticates: true },
  { method: 'GET', path: '/v1/seasons/:id/budget', authenticates: true },
  { method: 'POST', path: '/v1/seasons/:id/rewards', authenticates: true },
]

const ALL: readonly Route[] = [...SURFACE, ...DECLINED]

const client = readFileSync(here('src/lib/worlds.ts'), 'utf8')

/**
 * Is a route written down in the client's own doc-comment table?
 *
 * Matched on the METHOD and PATH cells rather than on a citation string, because the citation is
 * the same file for all nineteen now and proves nothing about any one of them.
 */
const citesRoute = (route: Route): boolean =>
  new RegExp(`\\|\\s*\`${route.method}\`\\s*\\|\\s*\`${route.path.replace(/[/:]/g, '\\$&')}\`\\s*\\|`).test(
    client,
  )

/* ------------------------------------------------ shapes, never prefixes */

/**
 * Does a requested path match a served pattern? Same segment count, and every segment agrees.
 *
 * **Segment counts, never prefixes.** Copied from `market/src/indexerclient.test.ts`, which
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
 * `api()` defaults to GET (`src/lib/api.ts`), so a call site with no `method:` is a GET. The
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

  it('names every route in its own table, and says which file it read them from', () => {
    // The doc comment in `src/lib/worlds.ts` is a table of METHOD and PATH, and this requires the
    // two tables to agree. It used to require the client to repeat a LINE NUMBER for each route,
    // which made three copies of one fact — the service, this table and the client's prose — of
    // which two were in repositories that never see micro-worlds change. The method and the path
    // are the parts the client actually depends on, and the check below proves they are real.
    for (const route of ALL) {
      assert.ok(citesRoute(route), `${route.method} ${route.path} is not in src/lib/worlds.ts's table`)
    }
    assert.ok(
      client.includes('worlds/src/server.ts'),
      'src/lib/worlds.ts no longer says which service source its surface was read from',
    )
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
      DECLINED.every(citesRoute),
      'a declined route is missing from the client\'s own table',
    )
  })
})

describe('every route this bundle names is really registered by the service', () => {
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

  /**
   * Where a route is registered, found by SEARCHING for it rather than by citing a line.
   *
   * This used to be a line number in the tables above, and the line number is why this repository
   * kept turning red for edits made in a different one: micro-trade inserted seven lines near its
   * imports and every route below moved, so every citation pointed at the wrong line while the
   * routes themselves were untouched. Nothing runs this suite when micro-worlds changes, so it
   * surfaced whenever somebody next tried to release — the worst possible moment.
   *
   * Searching costs one pass over a file already in memory and cannot go stale. A service edit
   * that MOVES a route can no longer break this; one that REMOVES a route still does.
   */
  const indexOfRoute = (method: string, path: string): number => {
    const re = new RegExp(`^\\s{4}define\\('${method}',\\s*'${path.replace(/[/:]/g, '\\$&')}'`)
    return lines.findIndex((l) => re.test(l))
  }

  for (const route of ALL) {
    it(`${route.method} ${route.path} is registered in worlds/src/server.ts`, () => {
      assert.ok(
        indexOfRoute(route.method, route.path) >= 0,
        `${route.method} ${route.path} is not registered in worlds/src/server.ts at all`,
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
      const start = indexOfRoute(route.method, route.path)
      assert.ok(start >= 0, `${route.method} ${route.path} is not registered in worlds/src/server.ts`)
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

  /**
   * The two calls worlds makes INTO a title, named by the FUNCTION that makes each one.
   *
   * These were line numbers until micro-trade proved what a line number in somebody else's
   * repository is worth: seven inserted lines moved every route below them and broke every client
   * that had cited one. `describe()` and `provision()` move with the code; lines 122 and 135 did
   * not, and nothing here runs when micro-worlds is edited.
   */
  const TITLE_CALLS: ReadonlyArray<{ fn: string; fragment: string }> = [
    { fn: 'describe', fragment: "'/v1/title'" },
    { fn: 'provision', fragment: "'/v1/provision'" },
  ]

  for (const call of TITLE_CALLS) {
    it(`worlds calls ${call.fragment} from ${call.fn}() in worlds/src/titleclient.ts`, () => {
      // `async <name>(` and not merely `<name>(`: the interface above the implementation declares
      // both names too, and anchoring on the declaration would grade a signature rather than a
      // call. That is the same defect as citing a line — a check that reads the wrong place and
      // passes anyway.
      const at = lines.findIndex((l) => new RegExp(`^\\s*async ${call.fn}\\(`).test(l))
      assert.ok(at >= 0, `${call.fn}() is gone from worlds/src/titleclient.ts`)
      // The path literal must appear in that function, not merely somewhere in the file — a
      // whole-file `includes` would go on passing after the call moved into a different one.
      const body = lines.slice(at, at + 40).join('\n')
      assert.ok(
        body.includes(call.fragment),
        `${call.fn}() in worlds/src/titleclient.ts no longer requests ${call.fragment}`,
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
