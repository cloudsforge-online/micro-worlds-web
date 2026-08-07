/**
 * A frontend ships its own browser chrome, or it ships none at all.
 *
 * FOUR FINISHED FRONTENDS SHIPPED WITH NO FAVICON AT ALL and went green in CI, because nothing
 * anywhere asserted that a page has an icon (18-build-status.md §3.3e). The checks below are the
 * template's, kept in both directions and unweakened.
 *
 * ── This surface DOES ship an og card, and that is the decision rather than the default ────────
 *
 * `micro-admin-web` asserts the deliberate ABSENCE of one, because §3.3k recorded that nobody
 * shares an operator console outward. The same paragraph draws the opposite conclusion for public
 * surfaces, and Forge Worlds is a clear case in the estate: a title page exists to be sent
 * to somebody. `brand/assets/worlds/` holds `og-1200x630.png`, so it is shipped, linked, and
 * asserted here — in both directions, so removing it later fails the build.
 *
 * ── And the icons must reach the IMAGE, not only the repository ────────────────────────────────
 *
 * The last two tests are the ones that matter most on this surface. The web template's Dockerfile
 * once did not copy `public/`, so every frontend cut from it built an image whose `dist/` had no
 * icons — while a test exactly like this one passed, because it reads the SOURCE tree. That is
 * fixed upstream (`micro-web-template/Dockerfile`) and in every frontend, so the tests below
 * are a guard rather than a correction. They are still worth their lines: reading a Dockerfile is
 * not evidence that an image serves a file, which is why the second of them requires CI to CURL
 * the running container. Here a missing public/ would also 404 `og:image` and blank the link
 * preview on every shared title page.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SURFACE_DESCRIPTION } from '../src/lib/meta.ts'

const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const HTML = readFileSync(at('index.html'), 'utf8')

/** The sizes a browser and an install prompt actually ask for. */
const REQUIRED_ICONS = ['favicon-32x32.png', 'favicon-192x192.png']

/** The card a chat client, a search result and a social post render. */
const OG_CARD = 'og-1200x630.png'

test('the icons a browser asks for are present in public/', () => {
  const missing = REQUIRED_ICONS.filter((f) => !existsSync(at(`public/${f}`)))
  assert.deepEqual(
    missing,
    [],
    `public/ is missing ${missing.join(', ')} — copy them from micro-brand's assets/worlds/`,
  )
})

test('index.html links every icon it ships, and ships every icon it links', () => {
  // Both directions. A link to a file that is not there is a 404 in every tab; a file nobody links
  // is dead weight that looks like it is working.
  for (const f of REQUIRED_ICONS) {
    assert.ok(HTML.includes(f), `index.html does not link /${f}`)
  }
  for (const m of HTML.matchAll(/href="\/(favicon[^"]*)"/g)) {
    assert.ok(existsSync(at(`public/${m[1]}`)), `index.html links /${m[1]}, which is not in public/`)
  }
})

test('the icons are this surface’s own, not the template’s placeholders', () => {
  // The template ships the company marks so that a freshly cut frontend is never iconless. Leaving
  // them in place passes every check above and puts the wrong brand in the tab.
  const brand = '../brand/assets/worlds'
  for (const icon of [...REQUIRED_ICONS, 'favicon-512x512.png', OG_CARD]) {
    const source = at(`${brand}/${icon}`)
    if (!existsSync(source)) continue
    assert.deepEqual(
      readFileSync(at(`public/${icon}`)),
      readFileSync(source),
      `public/${icon} is not the byte-identical copy from brand/assets/worlds/`,
    )
  }
})

test('the og card is shipped, because this surface’s links are shared outward', () => {
  assert.ok(existsSync(at(`public/${OG_CARD}`)), `public/${OG_CARD} is missing`)
  assert.match(HTML, /property="og:image"/, 'index.html declares no og:image')
  assert.match(HTML, /property="og:title"/, 'index.html declares no og:title')
  assert.match(HTML, /property="og:description"/, 'index.html declares no og:description')
})

test('the og:image is a RELATIVE path, so the card resolves against whichever origin served it', () => {
  // An absolute one would be a hostname baked into the bundle — the exact thing this repository
  // has no build-time configuration in order to avoid.
  const m = /property="og:image" content="([^"]+)"/.exec(HTML)
  assert.ok(m, 'no og:image content')
  assert.ok(m[1]?.startsWith('/'), `og:image is ${m[1]}, which is not a relative path`)
  assert.ok(existsSync(at(`public${m[1]}`)), `og:image points at ${m[1]}, which is not in public/`)
})

test('the og metadata is declared ONCE', () => {
  // foresight-web/index.html declares og:type, og:title and og:description twice. The second set
  // silently wins in every crawler and the first is dead text that nobody edits. Reported there.
  for (const property of ['og:type', 'og:title', 'og:description', 'og:image']) {
    const count = [...HTML.matchAll(new RegExp(`property="${property}"`, 'g'))].length
    assert.equal(count, 1, `${property} is declared ${count} times`)
  }
})

test('index.html does NOT tell crawlers to stay away', () => {
  // The mirror of admin-web's assertion, and the reason this file differs from that one. A noindex
  // here would suppress the project pages this product exists to have read.
  assert.doesNotMatch(HTML, /name="robots"[^>]*noindex/)
})

test('public/ holds no stray brand asset that nothing links', () => {
  // A file nobody links is dead weight that looks like it is working, and this is how an old
  // product's mark survives a rebrand in one repository.
  const linked = new Set([...HTML.matchAll(/(?:href|content)="\/([^"]+\.png)"/g)].map((m) => m[1]))
  const stray = readdirSync(at('public')).filter((f) => f.endsWith('.png') && !linked.has(f))
  assert.deepEqual(stray, [], `public/ holds ${stray.join(', ')}, which index.html does not link`)
})

test('the accent and substrate are declared on <html>, before React can paint', () => {
  // Set by React, the page paints the default ember and then changes colour. `worlds` has its own
  // block in tokens.css (`ui/packages/ui/src/tokens.css`); admin's did not, and the console
  // wore the company's colour by accident for as long as that was true.
  assert.match(HTML, /data-cf-product="worlds"/)
  assert.match(HTML, /data-cf-substrate="warm"/)
})

test('so is the scheme, which is the third of the three and the reason light mode works', () => {
  // Statically, for the same reason as the other two: a theme flash is worse than a theme nobody
  // asked for. `auto` follows the reader's operating system; tokens.css scopes its
  // `prefers-color-scheme` query to `[data-cf-scheme='auto']`, so without this attribute the light
  // palette is unreachable no matter what the reader's system says.
  assert.match(HTML, /data-cf-scheme="auto"/)
})

test('the color-scheme meta is spelled the way the standard spells it', () => {
  /*
   * `colour-scheme` was here: correct English, and not a registered meta name, so no browser has
   * ever read it. The declaration meant to tell the browser which form controls and scrollbars to
   * draw did nothing at all — on a surface whose account page and inventory rows are made of text
   * inputs.
   *
   * Both values, not just `dark`: with `data-cf-scheme="auto"` above, the page resolves whichever
   * palette the reader's system asks for, and declaring only `dark` here would leave the chrome
   * the browser draws disagreeing with the page around it.
   */
  assert.doesNotMatch(HTML, /name="colour-scheme"/, 'the British spelling is inert; no browser reads it')
  assert.match(HTML, /<meta name="color-scheme" content="dark light" \/>/)
})

test('the shell names the analytics property and carries no tag for it', () => {
  /*
   * THE MEASUREMENT ID, AND NOT THE TAG. The stock snippet fetches a third-party script and sets
   * `_ga` on load — before any banner has been drawn, let alone answered — and under ePrivacy
   * Art. 5(3) an analytics cookie set before consent is a violation a banner underneath it does
   * not cure. `@cloudsforge/ui/consent` injects it from exactly one place: the Accept button.
   *
   * The second assertion is the one with teeth, and it is stated as an absence over the WHOLE file
   * rather than as a search for one vendor's domain: any `<script src>` in this shell is a
   * third-party fetch on load, because the only first-party script here is the module entry point
   * that Vite rewrites.
   */
  assert.match(HTML, /<meta name="cf-analytics" content="G-[A-Z0-9]+" \/>/)
  const sources = [...HTML.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1])
  assert.deepEqual(sources, ['/src/main.tsx'], `index.html fetches a script it should not: ${sources.join(', ')}`)
})

test('the static description is byte-identical to the one applyHead uses', () => {
  /*
   * TWO COPIES, ONE SENTENCE, AND A TEST BECAUSE THE ESTATE HAS ALREADY SHIPPED THE DRIFT.
   * `site/index.html` records that its shell's title disagreed with its own application's for as
   * long as it took somebody to open the served HTML rather than the page, and every search result
   * carried a sentence the owner had asked to have removed.
   *
   * The two exist because two different readers need them: this one is what a link-preview fetcher
   * gets, and those generally do not execute JavaScript; `SURFACE_DESCRIPTION` is what
   * `applyHead()` writes on every navigation.
   */
  const m = /<meta\s+name="description"\s+content="([^"]+)"/.exec(HTML.replace(/\s+/g, ' '))
  assert.ok(m, 'index.html declares no description')
  assert.equal(m[1], SURFACE_DESCRIPTION)
})

test('the description says platform, and names no title', () => {
  // The category error this estate has already made twice on its own front page, in the one place
  // a stranger reads BEFORE arriving. It is also why the description is NOT derived from the
  // surface registry: `worlds`' blurb there names a title. See src/lib/meta.ts.
  for (const title of ['Emberkin', 'Ninety Days', 'Kindred']) {
    assert.ok(
      !SURFACE_DESCRIPTION.includes(title),
      `the surface description names a title: ${title}`,
    )
  }
  assert.match(SURFACE_DESCRIPTION, /platform/i)
})

test('the Dockerfile copies public/ into the build context', () => {
  // Without it Vite has no publicDir to copy into dist, and the image ships with no icons at all
  // while this very test passes, because it reads the SOURCE tree. That is how four frontends
  // shipped iconless. Fixed in the template at micro-web-template/Dockerfile; pinned here so it
  // cannot be lost again, and backed by the container probe below, which is the only check that
  // could have caught it in the first place.
  const dockerfile = readFileSync(at('Dockerfile'), 'utf8')
  assert.match(
    dockerfile,
    /^COPY public \.\/public$/m,
    'the Dockerfile does not copy public/, so the built image will have no favicon',
  )
})

test('CI probes the running container for the icons AND the card', () => {
  // The test above reads a file; only a request to the image proves the artefact serves them.
  const ci = readFileSync(at('.github/workflows/ci.yml'), 'utf8')
  for (const asset of [...REQUIRED_ICONS, OG_CARD]) {
    assert.ok(ci.includes(asset), `ci.yml does not probe /${asset} against the image`)
  }
})
