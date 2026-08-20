/**
 * The sitemap and robots.txt nginx serves for this surface.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THE BODIES ARE IN nginx.conf AT ALL
 *
 * A sitemap must carry ABSOLUTE URLs — the spec requires it and a crawler discards a relative
 * `<loc>` — and nothing built in this repository may name a hostname, because one image is served
 * from localhost, from a preview deployment and from `worlds.<apex>`.
 * `test/no-build-time-config.test.ts` is that rule; this is the one document that cannot obey it
 * and be useful at the same time.
 *
 * nginx is the component that can. It has `$host` on every request, so the addresses are composed
 * per request and the artefact stays environment-free.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * AND WHY THIS SURFACE DOES NOT USE `sitemapXml()` FROM THE DESIGN SYSTEM
 *
 * THE SHARED GENERATOR IS FOR THE APEX. It composes each sibling surface as `<subdomain>.$host`,
 * which is right on the marketing site, where `$host` IS the apex. Here `$host` is already
 * `worlds.<apex>`, so the same call would emit `network.worlds.<apex>` — the two-label shape
 * `@cloudsforge/ui/surfaces.ts` records at length as unreachable, because the edge's Universal SSL
 * is a one-label wildcard and every two-label name fails the handshake.
 *
 * So this surface publishes ITS OWN public routes, derived from the same `ROUTES` table the
 * navigation, the router and nginx's enumerated locations all come from — and `robots.txt`, which
 * has no such problem, IS generated from the design system and compared byte for byte.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * AND WHY EITHER NEEDS A TEST
 *
 * A body pasted into a config file is a copy, and this estate has been bitten by exactly one of
 * those: `site/index.html`'s title drifted from its application's, the suite stayed green, and
 * every search result carried a sentence the owner had asked to have removed until somebody opened
 * the served HTML rather than the page. The block below is therefore treated as GENERATED OUTPUT
 * that happens to live in a config file.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { ENV_LABELS } from '@cloudsforge/ui'
import { robotsTxt } from '@cloudsforge/ui/sitemap'
import { SITEMAP_PATHS, pageMetaFor } from '../src/lib/meta.ts'
import { ROUTES, publicPath } from '../src/lib/routes.ts'

const nginx = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')

/** The single-quoted body of a `return 200 '…';` inside an exact-match location. */
function servedBody(path: string): string {
  const block = new RegExp(`location = ${path.replace('.', '\\.')} \\{([\\s\\S]*?)\\n    \\}`).exec(
    nginx,
  )
  assert.ok(block, `nginx.conf has no exact-match location for ${path}`)
  // Anchored to a `return` at the start of its own line: `/robots.txt` also carries a CONDITIONAL
  // `if ($cf_env) { return 200 '…'; }` above it, and a regex that took the first match would read
  // the non-mainnet body and report the mainnet one as drifted.
  const body = /\n {8}return 200 '([\s\S]*?)';/.exec(block[1] ?? '')
  assert.ok(body, `the ${path} location does not return an unconditional literal body`)
  return body[1] ?? ''
}

describe('the sitemap nginx serves', () => {
  it('names no hostname — every address is composed from $host', () => {
    /*
     * THE ASSERTION THAT KEEPS THE ARTEFACT ENVIRONMENT-FREE, and the reason a document with
     * absolute URLs in it is allowed here at all. A single literal apex would make the image wrong
     * on a preview deployment and on testnet, silently, in the one document a crawler treats as
     * authoritative.
     */
    const xml = servedBody('/worlds/sitemap.xml')
    assert.ok(!xml.includes('cloudsforge.online'), 'the sitemap names the production apex')
    assert.ok(!xml.includes('localhost'), 'the sitemap names localhost')
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1] ?? '')
    assert.ok(locs.length > 0, 'the sitemap lists nothing at all')
    for (const loc of locs) {
      // No subdomain is composed here, unlike the apex's sitemap: `$host` IS this surface.
      assert.match(loc, /^\$scheme:\/\/\$host(\/|$)/, `a <loc> is not composed: ${loc}`)
    }
  })

  it('lists every address this surface offers a crawler', () => {
    const xml = servedBody('/worlds/sitemap.xml')
    for (const path of SITEMAP_PATHS) {
      // `publicPath()`, the same crossing the app uses: every `<loc>` carries the mount now, and
      // the index is `/worlds` rather than a bare host — a trailing slash is the classic way one
      // page acquires two addresses and splits its own indexing.
      const address = `$scheme://$host${publicPath(path)}`
      assert.ok(xml.includes(`<loc>${address}</loc>`), `${path} is missing from the sitemap`)
    }
  })

  it('lists nothing else, and in particular not one title', () => {
    /*
     * The other direction, and on this surface it is the half that matters. `/titles/<uuid>` is
     * PUBLIC — both routes behind it make no `authenticate()` call — and it is the address this
     * product most wants read. It is still out, because the set is unbounded and minted by the
     * service: a static list would be a second opinion about which titles exist, stale the moment
     * one is registered, and empty today. `/titles` bare is not a destination either, and the
     * three gated routes would lead a crawler to a sign-in redirect.
     */
    const xml = servedBody('/worlds/sitemap.xml')
    const listed = [...xml.matchAll(/<loc>\$scheme:\/\/\$host([^<]*)<\/loc>/g)].map((m) => m[1] ?? '')
    // Compared as PUBLIC paths — mount and all — because that is what a `<loc>` is. The route table
    // stays router paths and `publicPath()` is the one crossing, exactly as in the app.
    assert.deepEqual([...listed].sort(), SITEMAP_PATHS.map(publicPath).sort())
    assert.ok(!xml.includes('/titles'), 'the sitemap lists an unbounded family of addresses')
    for (const gated of ['/player', '/inventory', '/entitlements']) {
      assert.ok(!xml.includes(gated), `the sitemap invites a crawler to the gated ${gated}`)
    }
  })

  it('is a well-formed urlset in the only schema crawlers implement', () => {
    const xml = servedBody('/worlds/sitemap.xml')
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/)
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)
    assert.match(xml, /<\/urlset>$/)
  })

  it('is served as XML, because a sitemap sent as text/html is a sitemap nobody reads', () => {
    // `types { }` as well as `default_type`: without emptying the table for this location, nginx
    // maps the `.xml` in the URI to `text/xml` from its own mime types and `default_type` never
    // applies.
    assert.match(
      nginx,
      /location = \/worlds\/sitemap\.xml \{[\s\S]*?types \{ \}[\s\S]*?default_type application\/xml;/,
    )
  })

  it('is derived from the route table rather than typed a fourth time', () => {
    // `src/lib/routes.ts` already decides the router, the navigation and nginx's enumerated
    // locations. This asserts the derivation in src/lib/meta.ts is real: a public, non-wildcard
    // route added there appears here, and the two that are not destinations stay out.
    assert.deepEqual(SITEMAP_PATHS, ['/'])
    assert.equal(ROUTES.find((r) => r.path === 'titles')?.public, true)
    assert.equal(ROUTES.find((r) => r.path === 'titles')?.wildcard, true)
  })
})

describe('the sitemap and the robots directive agree with each other', () => {
  /**
   * A sitemap is an INVITATION and a robots meta is an INSTRUCTION, and a surface that invites a
   * crawler to an address it then tells the crawler not to index is a surface arguing with itself.
   * Both are derived from `ROUTES`, so this is a check that the two derivations agree rather than a
   * check that somebody remembered.
   */
  it('every address in the sitemap is one the head invites indexing of', () => {
    for (const path of SITEMAP_PATHS) {
      const robots = pageMetaFor(path).robots
      assert.ok(
        robots === undefined || !robots.startsWith('noindex'),
        `${path} is in the sitemap and sends ${String(robots)}`,
      )
    }
  })

  it('every gated address sends noindex, and none of them is in the sitemap', () => {
    for (const route of ROUTES.filter((r) => !r.public)) {
      const path = `/${route.path}`
      assert.match(pageMetaFor(path).robots ?? '', /^noindex/, `${path} is gated and indexable`)
      assert.ok(!SITEMAP_PATHS.includes(path), `${path} is gated and in the sitemap`)
    }
  })

  it('an address this app does not own sends noindex too', () => {
    // nginx answers a REAL 404 for it (`error_page 404 /index.html`), so the head must not then
    // invite the indexing of the page the reader is looking at. `follow` is kept: the way back to
    // the platform is an ordinary link and worth crawling.
    assert.equal(pageMetaFor('/nope/not/a/route').robots, 'noindex, follow')
    assert.equal(pageMetaFor('/nope/not/a/route').title, 'Not found')
  })
})

describe('an environment that is not mainnet', () => {
  /**
   * The `map` that decides it, and the alternation of labels inside it.
   *
   * A testnet estate carries test EMBER, a faucet and a registry full of half-built titles.
   * Indexed beside the real one, its title pages look exactly like pages describing a game a
   * player could buy something for — which makes this a support problem before it is an SEO one.
   */
  function alternation(): string[] {
    const map = /map \$host \$cf_env \{[\s\S]*?~\^[^\n]*?\(\?:([^)]*)\)\\\./.exec(nginx)
    assert.ok(map, 'the $cf_env map is missing from nginx.conf')
    return (map[1] ?? '').split('|')
  }

  it('recognises exactly the labels the registry reserves', () => {
    /*
     * ENV_LABELS is the estate's single list — `deploy/scripts/check-apex-prefix.py` reads the
     * same export. An alternation here that had drifted from it would either miss an environment
     * (and index it) or refuse a surface (and de-index a real one), and both fail silently.
     */
    assert.deepEqual(alternation().sort(), [...ENV_LABELS].sort())
  })

  it('refuses every crawler and serves no sitemap', () => {
    // Both halves matter and neither is sufficient: robots.txt stops the fetch, and a sitemap that
    // still answered would be an invitation contradicting the instruction beside it.
    // ONE HALF LEFT HERE. The robots half moved to micro-site with the document — see the
    // `robots.txt` block above — and micro-site already had an identical `$cf_env` refusal, so a
    // testnet apex answers `Disallow: /` and covers this surface without a second copy of the rule
    // living where nothing reads it. The sitemap half is still this file's to enforce.
    assert.match(nginx, /location = \/worlds\/sitemap\.xml \{[\s\S]*?if \(\$cf_env\) \{ return 404; \}/)
  })

  it('matches a suffixed subdomain as well as a bare environment apex', () => {
    // The environment is a SUFFIX on the first label now (`worlds-testnet.`) and was an apex prefix
    // (`testnet.`) before, which put this surface at the two-label `worlds.testnet.<apex>`. Both
    // shapes still resolve — surfaces.ts keeps the old one deliberately — so the pattern has to
    // catch both or half the estate stays indexable.
    const map = /map \$host \$cf_env \{[\s\S]*?\n\}/.exec(nginx)
    assert.ok(map, 'the $cf_env map is missing')
    assert.match(map[0], /\(\?:\[\^\.\]\+-\)\?/, 'the map does not allow a suffixed subdomain')
  })

  it('is decided in http context, above the server block, because that is where `map` is legal', () => {
    // A `map` inside a server block is a configuration error nginx refuses to start on, and the
    // container would then serve nothing at all rather than serve this wrongly.
    assert.ok(
      nginx.indexOf('map $host $cf_env') < nginx.indexOf('server {'),
      'the $cf_env map is inside the server block, where `map` is not allowed',
    )
  })
})

describe('robots.txt — which this surface no longer serves', () => {
  it('is GONE from this repository, and its one line moved to the apex', () => {
    // A crawler reads robots.txt at the ORIGIN ROOT and nowhere else. Wave 3e made this bundle
    // `<apex>/worlds`, so `<apex>/worlds/robots.txt` is a file nothing will ever request — a block
    // here could only be dead configuration that READS like a policy, which is the most expensive
    // kind because the rule looks enforced and is not.
    //
    // There was nothing to carry but the `Sitemap:` line and the `if ($cf_env)` refusal. micro-site
    // announces `https://$host/worlds/sitemap.xml` from the one robots.txt this origin has, and it
    // already had an identical `$cf_env` branch — so a testnet apex answers `Disallow: /` and
    // covers this surface by construction rather than by a second copy of the rule.
    //
    // This surface disallowed NOTHING, so it declares no `noIndexPaths` on its registry row: its
    // five route families are public and there is no client-side search minting an address per
    // `?q=`. Checked rather than assumed.
    // ── AGAINST THE DIRECTIVES, NOT THE FILE ───────────────────────────────────────────────
    //
    // The block that used to be here left a COMMENT in its place saying so, and that comment
    // contains the words `location = /robots.txt`. Matched against the raw file this assertion
    // fails on its own gravestone — which is a false negative that would have been read as "the
    // deletion did not happen" by whoever hit it next.
    const served = nginx
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n')
    assert.doesNotMatch(served, /location\s*=\s*\/robots\.txt/, 'this surface still serves a robots.txt')
    assert.doesNotMatch(served, /^Disallow:/m)
    assert.doesNotMatch(served, /^User-agent:/m)
    // `Sitemap:` is checked WITHOUT the `m` flag on purpose: it must not appear anywhere in this
    // file, not merely at the start of a line, because the only place it could appear is inside a
    // `return 200 '…'` body — which is exactly the document that moved.
    assert.doesNotMatch(served, /Sitemap:/, 'a Sitemap: line survived where nothing fetches it')
  })

  it('is not a static file, which an exact-match location would have shadowed', () => {
    /*
     * `location = /robots.txt` wins over the `location /` prefix that serves the static tree, so a
     * file in `public/` would be deployed, unreachable, and edited by the next reader to no effect
     * — the worst of the three states, worse than either serving it or not having it.
     */
    for (const name of ['robots.txt', 'sitemap.xml']) {
      let present = true
      try {
        readFileSync(new URL(`../public/${name}`, import.meta.url))
      } catch {
        present = false
      }
      assert.equal(present, false, `public/${name} exists, and nginx will never serve it`)
    }
  })
})

describe('the security headers on the documents this file adds', () => {
  it('are repeated in both new locations, because add_header does not accumulate', () => {
    // A location that declares ANY add_header inherits NONE from the server level. Both blocks set
    // Cache-Control, so both have to restate the three security headers or ship without them.
    // ONE DOCUMENT NOW, NOT TWO. `robots.txt` left this repository in wave 3e: a crawler reads it
    // at the ORIGIN ROOT and nowhere else, so `<apex>/worlds/robots.txt` is a file nothing ever
    // fetches. micro-site serves the one this origin has. The sitemap stayed, because a sitemap is
    // fetched at whatever address announces it — and micro-site's robots.txt announces this one.
    for (const path of ['/worlds/sitemap.xml']) {
      const block = new RegExp(
        `location = ${path.replace('.', '\\.')} \\{([\\s\\S]*?)\\n    \\}`,
      ).exec(nginx)
      assert.ok(block, `no location for ${path}`)
      const body = block[1] ?? ''
      assert.match(body, /X-Content-Type-Options "nosniff"/)
      assert.match(body, /X-Frame-Options "SAMEORIGIN"/)
      assert.match(body, /Referrer-Policy "strict-origin-when-cross-origin"/)
    }
  })

  it('are repeated in /assets/ too, which is the location that serves the code', () => {
    // The defect several surfaces in this estate shipped: `/assets/` declared Cache-Control and
    // therefore inherited none of the three, sending the whole JavaScript bundle with no nosniff.
    // This repository already had it right; asserted so it stays that way.
    const block = /location \/worlds\/assets\/ \{([\s\S]*?)\n    \}/.exec(nginx)
    assert.ok(block, 'no /assets/ location')
    assert.match(block[1] ?? '', /X-Content-Type-Options "nosniff"/)
  })
})
