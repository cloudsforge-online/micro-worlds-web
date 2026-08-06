/**
 * THE SHARED CHROME RENDERS HERE, AND ITS HOOKS ACTUALLY RUN.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY A TEST WHOSE SUBJECT IS ANOTHER REPOSITORY'S COMPONENT
 *
 * It is not asserting what `@cloudsforge/ui` draws — micro-ui owns that. It is asserting a fact
 * about THIS repository's test process: that `@cloudsforge/ui` and this app end up sharing ONE
 * React. They do not by default. `link:../ui/packages/ui` symlinks the design system's working
 * tree, that tree has its own `react` (a devDependency it genuinely needs to test itself), and
 * Node resolves a bare specifier from the importing file's REALPATH — so the design system's
 * components reach the second copy, share no dispatcher with ours, and the first hook they call
 * throws `Cannot read properties of null (reading 'useState')`.
 *
 * `--import @cloudsforge/ui/test-loader` in the `test` script is what collapses the two. This file
 * is what notices when it stops. Delete the flag and these tests are the first to go red.
 *
 * Publishing `dist` did NOT make that unnecessary, though eight repositories predicted it would:
 * `dist/index.js` has the same realpath as `ui/packages/ui/src/index.tsx`, so it finds the same
 * second copy. What
 * publishing `dist` did fix was the OTHER workaround — the classic JSX transform, and the
 * `globalThis.React` that used to sit in `test/dom.ts`.
 *
 * ── Why it clicks rather than only mounting ───────────────────────────────────────────────────
 *
 * A mount that does not throw is weak evidence: `CloudsForgeLogo` renders perfectly well with two
 * Reacts in the process, because it calls no hook — that was measured. The dropdowns are the ones
 * that break, so each is OPENED, which requires `useState` to hold a value across a re-render and
 * `useId` to have produced the id `aria-controls` names. A second dispatcher cannot fake that.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AccountMenu, CloudsForgeBar, MAIN_ID, ProductSwitcher } from '@cloudsforge/ui'
import { createElement as h } from 'react'
import { App } from '../src/app.tsx'
import { PRODUCT } from '../src/lib/hosts.ts'
import { SURFACE_DESCRIPTION } from '../src/lib/meta.ts'
import * as fx from './fixtures.ts'
import { withScreen, type Screen } from './dom.ts'

/** The address this surface is served from, so `cloudsforgeHosts()` resolves the real apex. */
const ORIGIN = 'https://worlds.cloudsforge.online'

/** The one request the public index makes. */
const REGISTRY = { 'GET /v1/titles': { body: { titles: [fx.title()] } } } as const

/**
 * `allowEmpty` because the subject is a strip of chrome, not a page: the bar's own text is well
 * under the 40 characters `assertMounted` requires of a mounted app. Every test below then asserts
 * on named elements instead, which is a stricter check than the length heuristic it waives.
 */
const CHROME = { allowEmpty: true } as const

/** The dropdown triggers, which is how they are found without hard-coding this surface's label. */
const triggers = (s: Screen): Element[] => [...s.document.querySelectorAll('[aria-haspopup="menu"]')]

test('the company bar renders, signed out', async () => {
  await withScreen(h(CloudsForgeBar, { current: PRODUCT, account: { signedIn: false } }), CHROME, async (s) => {
    assert.ok(s.document.querySelector('[role="banner"]'), 'CloudsForgeBar rendered no banner')
    s.byRole('link', 'CloudsForge home')
    s.byRole('button', 'Sign in')
    assert.equal(triggers(s).length, 1, 'signed out, the switcher is the only dropdown')
    s.clean('the bar, signed out')
  })
})

test('the product switcher opens, which means its useState held', async () => {
  await withScreen(h(CloudsForgeBar, { current: PRODUCT, account: { signedIn: false } }), CHROME, async (s) => {
    const trigger = triggers(s)[0] as Element
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(s.document.querySelector('[role="menu"]'), null, 'the menu is closed to begin with')

    await s.click(trigger)

    assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'the click did not reach state')
    const menu = s.document.querySelector('[role="menu"][aria-label="CloudsForge products"]')
    assert.ok(menu, 'the switcher opened no menu')
    assert.ok(
      menu.querySelectorAll('[role="menuitem"]').length > 1,
      'an open switcher with fewer than two products is not a switcher',
    )
    // `aria-controls` names the menu by an id from `useId`, which is the other hook in play.
    assert.equal(menu.getAttribute('id'), trigger.getAttribute('aria-controls'))
    s.clean('opening the product switcher')
  })
})

test('the account menu opens for a signed-in viewer, and offers sign out', async () => {
  const account = { signedIn: true, handle: 'ada' }
  await withScreen(h(CloudsForgeBar, { current: PRODUCT, account }), CHROME, async (s) => {
    const trigger = triggers(s)[1] as Element
    assert.match(s.textOf(trigger), /ada/, 'the second dropdown is not the account menu')

    await s.click(trigger)

    const menu = s.document.querySelector('[role="menu"][aria-label="Account"]')
    assert.ok(menu, 'the account menu opened nothing')
    assert.match(s.textOf(menu), /Sign out/)
    s.clean('opening the account menu')
  })
})

test('ProductSwitcher and AccountMenu also render standing alone', async () => {
  // Named directly, not only through the bar: these are the two components measured to throw
  // without deduplication, and a test that reached them only via a parent would stop covering
  // them the day the bar stopped composing them.
  await withScreen(h(ProductSwitcher, { current: PRODUCT }), CHROME, async (s) => {
    assert.equal(triggers(s).length, 1)
    s.clean('ProductSwitcher alone')
  })
  await withScreen(h(AccountMenu, { account: { signedIn: false } }), CHROME, async (s) => {
    s.byRole('button', 'Sign in')
    s.clean('AccountMenu alone')
  })
})

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   The 1.1 chrome the shell adds: the skip link, the main region, the per-address head and the
   consent banner.

   These are asserted by MOUNTING THE APP rather than by reading src/components/shell.tsx, and that
   distinction is the whole reason they are here rather than in render.test.ts. Each is a property
   a correct-looking source file can get wrong:

     - a skip link whose target is not focusable scrolls the page and leaves focus behind, which is
       exactly what this surface shipped — `<main id="main">` with no `tabIndex`, and a `.ww-skip`
       anchor pointing at it. The source read as a working skip link for as long as it existed;
     - a head applied by a component that never mounts applies nothing;
     - a consent banner is a claim about what happens BEFORE anybody answers it, and only a
       document can be asked whether a cookie was set.

   Source text proves none of those. A document does.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

test('the skip link is first, and its target is a main region that can take focus', async () => {
  await withScreen(h(App), { url: `${ORIGIN}/`, routes: { ...REGISTRY } }, async (s) => {
    await s.settle(20)

    const skip = s.tabbables()[0]
    assert.ok(skip, 'nothing is tabbable at all')
    assert.equal(skip.tagName, 'A', 'the first tabbable is not a link')
    assert.equal(skip.getAttribute('href'), `#${MAIN_ID}`, 'the skip link points somewhere else')
    assert.match(s.textOf(skip), /Skip to the page/)

    // The half that was broken rather than merely duplicated. A <main> is not focusable by
    // default, so without this the fragment scrolls the page, focus stays on the link, and the
    // next Tab goes back to the second item in the company bar.
    const main = s.document.getElementById(MAIN_ID)
    assert.ok(main, `the skip link targets #${MAIN_ID}, which is not in the document`)
    assert.equal(main.tagName, 'MAIN')
    assert.equal(main.getAttribute('tabindex'), '-1', 'the main region cannot take focus')
    assert.equal(s.allByRole('main').length, 1, 'a page has exactly one main landmark')

    // The class the page's own layout hangs off. `MainRegion` takes it as a prop, so a rename
    // upstream would silently drop the max-width and the padding rather than fail to compile.
    assert.ok(main.classList.contains('wt-main'), 'the main region lost this surface’s layout class')

    s.clean('the shell, at the platform page')
  })
})

test('the head follows the address rather than staying on the shell’s title', async () => {
  await withScreen(h(App), { url: `${ORIGIN}/`, routes: { ...REGISTRY } }, async (s) => {
    await s.settle(20)

    /*
     * The index route deliberately takes no page title, so this is the bare surface name — which
     * is byte-for-byte what index.html carries. The one drift this arrangement can produce is the
     * shell and the application disagreeing about the front page, and that is the failure `site`
     * records having shipped.
     */
    assert.equal(s.document.title, 'Forge Worlds')

    const content = (selector: string): string =>
      s.document.head.querySelector(selector)?.getAttribute('content') ?? ''

    // Composed against the serving origin, never a hostname typed into the bundle.
    assert.equal(
      s.document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      `${ORIGIN}/`,
    )
    assert.equal(content('meta[property="og:url"]'), `${ORIGIN}/`)
    assert.equal(content('meta[property="og:image"]'), `${ORIGIN}/og-1200x630.png`)

    // Public and invited: the platform page is the address a stranger arrives at, and nginx.conf
    // lists exactly this one in the sitemap. The two must not disagree.
    assert.match(content('meta[name="robots"]'), /^index, follow/)

    // NOT the registry-derived description. `worlds`' blurb in surfaces.ts names a title, which is
    // the category error this whole surface is arranged against — see src/lib/meta.ts.
    assert.equal(content('meta[name="description"]'), SURFACE_DESCRIPTION)
    assert.equal(content('meta[property="og:description"]'), SURFACE_DESCRIPTION)

    s.clean('the head, at the platform page')
  })
})

test('a gated address is titled, and told not to be indexed', async () => {
  // `/inventory` renders a redirect to sign in for anybody without a session, and an indexed
  // sign-in redirect is a search result that helps nobody. The registry cannot know that; this
  // app can, and nginx keeps the address out of the sitemap for the same reason.
  await withScreen(h(App), { url: `${ORIGIN}/inventory`, routes: {} }, async (s) => {
    await s.settle(20)
    assert.equal(s.document.title, 'Inventory — Forge Worlds')
    assert.match(
      s.document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
      /^noindex/,
    )
  })
})

test('an address this app does not own is titled as such, and tells crawlers to stay away', async () => {
  // nginx answers a real 404 for it; the head must not then invite the indexing of the page the
  // reader is actually looking at. Both halves of the same honesty.
  await withScreen(h(App), { url: `${ORIGIN}/nothing-here`, routes: {} }, async (s) => {
    await s.settle(20)
    assert.equal(s.document.title, 'Not found — Forge Worlds')
    assert.match(
      s.document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
      /^noindex/,
    )
  })
})

test('nothing is stored and nothing is fetched before anybody has been asked', async () => {
  /*
   * `CookieBanner` renders nothing when the shell carries no measurement ID, and nothing on an
   * origin analytics would not report from. This harness's document has no `cf-analytics` meta —
   * it mounts components, not index.html — which is exactly the shape of a local `pnpm dev`.
   *
   * SO THE BANNER'S ABSENCE HERE PROVES LESS THAN IT LOOKS, AND THAT IS SAID RATHER THAN RELIED
   * ON: that Accept injects the tag, that Reject does not, and that the two buttons carry one
   * class with no modifier, are proven against the BUILT IMAGE in a real browser on a hostname
   * where `analyticsAllowedHere()` is true. What this asserts is the invariant that holds
   * everywhere and is the one the regulation is about: consent precedes storage.
   */
  await withScreen(h(App), { url: `${ORIGIN}/`, routes: { ...REGISTRY } }, async (s) => {
    await s.settle(20)
    assert.equal(s.document.querySelector('[role="dialog"]'), null, 'a banner with nothing to ask')
    assert.doesNotMatch(s.document.cookie, /_ga/, 'an analytics cookie was set without consent')
    assert.equal(
      s.document.querySelector('script[src*="googletag" i]'),
      null,
      'an analytics tag was injected without a click on Accept',
    )
    // And no request left this bundle other than the one the page is for.
    assert.deepEqual(
      s.api.wire.map((w) => w.path),
      ['/v1/titles'],
    )
  })
})
