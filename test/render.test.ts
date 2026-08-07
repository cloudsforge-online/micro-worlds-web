/**
 * What the screens actually put on the page, checked by reading them.
 *
 * ── Why this is a source-text test and not a rendering test ───────────────────────────────────
 *
 * There is no DOM in this suite, on purpose and in line with the rest of the estate: jsdom is a
 * second browser implementation to keep current, it disagrees with real ones exactly where it
 * matters, and a test that renders a component in it proves the component renders in jsdom.
 *
 * But several of this app's requirements ARE about rendering — "a bound item gets no control at
 * all", "an undeliverable purchase shows the service's own sentence", "a null profile is an
 * invitation and not an empty state". Those are not properties of a pure function; they are
 * properties of a file. So they are asserted against the file, the way `routes.test.ts` asserts
 * the router against `app.tsx`.
 *
 * The limitation is stated plainly: this proves each component IS WIRED to the right data, not
 * that the pixels land. The logic underneath — `provisionTone`, `boundMeaning`, `isSellable`,
 * `resourceState` — is proven properly, as pure functions, by its own tests.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const read = (file: string): string => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/**
 * A source file with its comments removed.
 *
 * Needed for the checks that forbid a STRING, because the files here explain the rules they follow
 * — inventory.tsx quotes "disabled" in order to say why there is no disabled control — and a grep
 * over the raw text therefore matches the rationale and fails a correct file. Six guards in this
 * estate have made exactly that mistake, and every one of them was worked around by rewording the
 * comment, which means the rule quietly deleted its own documentation. A guard that fires on its
 * own explanation trains people to delete the explanation.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

const platform = read('src/pages/platform.tsx')
const player = read('src/pages/player.tsx')
const inventory = read('src/pages/inventory.tsx')
const entitlements = read('src/pages/entitlements.tsx')
const title = read('src/pages/title.tsx')
const notFound = read('src/pages/not-found.tsx')
const shell = read('src/components/shell.tsx')

const PAGES: ReadonlyArray<[string, string]> = [
  ['platform', platform],
  ['player', player],
  ['inventory', inventory],
  ['entitlements', entitlements],
  ['title', title],
]

describe('every screen distinguishes the four states', () => {
  /**
   * A spinner that never resolves, an empty list that was actually a timeout, and a "no results"
   * that was actually a missing scope are the three failures `src/components/states.tsx` exists to
   * prevent. A page that imported only `Loading` would collapse two of them.
   */
  for (const [name, source] of PAGES) {
    it(`${name} renders a loading state`, () => {
      assert.match(source, /<Loading/, `${name} has no loading state`)
    })

    it(`${name} renders a failure with the request id`, () => {
      assert.match(source, /<Failed/, `${name} has no failure state`)
    })
  }

  it('the pages that can be refused render FORBIDDEN separately from FAILED', () => {
    // A 403 is not retryable and a generic failure may be. Offering "try again" for a refusal
    // teaches somebody the app is unreliable. The public pages are excluded deliberately: their
    // routes make no authenticate() call, so a 403 from them is not about authorisation at all.
    for (const [name, source] of [
      ['player', player],
      ['inventory', inventory],
      ['entitlements', entitlements],
    ] as const) {
      assert.match(source, /<Forbidden/, `${name} does not distinguish a refusal`)
    }
  })

  it('the public pages do NOT render a Forbidden screen, because a 403 there is not about roles', () => {
    // `GET /v1/titles` (worlds/src/server.ts) makes no authenticate() call, so a 403 from it
    // came from something in FRONT of the service. Telling somebody to ask an administrator for a
    // role no route checks would send them somewhere that cannot help.
    assert.doesNotMatch(withoutComments(title), /<Forbidden/)
    assert.match(platform, /turned this request away before Forge Worlds saw it/)
  })
})

describe('a bound item gets no control at all', () => {
  /**
   * `worlds/src/players.ts`: "`bound` is the anti-pay-to-win control: anything conferring
   * power is bound and cannot enter the market." `bound` is on the wire "because a client that
   * offers a 'sell' button must know before it draws one" (`worlds/src/server.ts`).
   *
   * NOT a disabled button. A disabled button reads as "not yet, ask somebody", and this is not
   * "not yet" — it is never. `micro-admin-web` reached the same conclusion about an action with no
   * executor (`admin-web/src/lib/catalogue.ts`).
   */
  const code = withoutComments(inventory)

  it('renders the listing control only when the item is not bound', () => {
    assert.match(code, /\{!item\.bound && <Listing/)
  })

  it('never disables a control on the strength of `bound`', () => {
    assert.doesNotMatch(code, /disabled=\{[^}]*bound/)
  })

  it('says the rule in the control’s place', () => {
    assert.match(code, /boundMeaning\(item\.bound\)/)
  })

  it('marks a bound row with a word and a glyph, not only a colour', () => {
    assert.match(code, /BOUND/)
    assert.match(code, /⊘/)
  })
})

describe('an undeliverable entitlement is rendered honestly', () => {
  const code = withoutComments(entitlements)

  it('renders the service’s own lastError rather than a paraphrase', () => {
    assert.match(code, /<ServiceRefusal[\s\S]{0,120}reason=\{provision\.lastError\}/)
  })

  it('handles a terminal row with no recorded reason instead of rendering nothing', () => {
    assert.match(code, /provision\.lastError === null/)
  })

  it('renders every one of the five provision states through one tone function', () => {
    // A page with its own switch would drift from `format.ts`, where the completeness of the five
    // is proven.
    assert.match(code, /provisionTone\(provision\.state\)/)
  })

  it('says that nothing was raised, as a sentence rather than an em dash', () => {
    assert.match(code, /no title has produced anything against it/)
  })

  it('offers no control on a terminal row', () => {
    assert.doesNotMatch(code, /<button/i)
  })
})

describe('the account page treats a null profile as a new player', () => {
  const code = withoutComments(player)

  it('branches on `profile === null` rather than on an empty state', () => {
    assert.match(code, /profile === null/)
  })

  it('invites a name rather than saying nothing is here', () => {
    assert.match(code, /Set up your profile/)
  })

  it('submits the whole document, because PUT is a replace and not a patch', () => {
    // `worlds/src/server.ts` writes `avatarAssetUrn` as null when it is not a string, so a
    // partial submit would silently clear an avatar somebody set from inside a title.
    assert.match(code, /displayName:/)
    assert.match(code, /avatarAssetUrn:/)
  })

  it('never offers to set an age bracket', () => {
    // A safeguarding fact (`worlds/src/players.ts`). A form that lets an account assert its
    // own is a form that lets an account assert it is an adult. It is DISPLAYED and never edited.
    assert.doesNotMatch(code, /setAgeBracket|ageBracket:\s*[a-z]/)
    assert.match(code, /profile\.ageBracket/)
  })

  it('groups the wardrobe by title rather than flattening it', () => {
    // `worlds/src/players.ts`: flattening is an information loss with no migration back.
    assert.match(code, /equippedCosmetics/)
    assert.match(code, /CROSS_TITLE/)
  })
})

describe('the shell and the 404', () => {
  it('the shell marks this surface current in the switcher', () => {
    assert.match(shell, /current=\{PRODUCT\}/)
  })

  it('the shell offers a skip link before anything else', () => {
    // ELEMENTS are compared, not bare names: `SkipLink` and `CloudsForgeBar` both appear in the
    // import list at the top of the file, so comparing the raw names would put the bar before
    // everything and pass this test for a reason that has nothing to do with the DOM order.
    //
    // `<SkipLink` rather than the `<a className="ww-skip">` this file used to look for: the anchor
    // is the shared one now, and the reason is not tidiness — the local one pointed at a `<main>`
    // with no `tabIndex`, so following it scrolled the page and left focus on the link.
    // test/shared-chrome.test.ts proves the target end of that in a real document, which source
    // text cannot.
    const code = withoutComments(shell)
    const skip = code.indexOf('<SkipLink')
    const bar = code.indexOf('<CloudsForgeBar')
    assert.ok(skip > 0, 'the shell has no skip link')
    assert.ok(bar > 0, 'the shell does not render the company bar')
    assert.ok(skip < bar, 'the skip link must come first in the DOM')
  })

  it('the consent banner is LAST, so it is last in the tab order', () => {
    // A consent dialog that traps focus is the coercion the regulation is about; this one is
    // explicitly not modal, and being last in the document is how a reader gets to ignore it,
    // read the page, and answer afterwards.
    const code = withoutComments(shell)
    const banner = code.indexOf('<CookieBanner')
    assert.ok(banner > 0, 'the shell renders no consent banner')
    assert.ok(banner > code.indexOf('<CloudsForgeFooter'), 'the banner must come after the footer')
    assert.ok(banner > code.indexOf('<MainRegion'), 'the banner must come after the page')
  })

  it('the shell carries no analytics tag of its own, and never may', () => {
    // The tag is injected from exactly one place in the estate — the Accept button inside
    // `CookieBanner` — and a second call site here would be an analytics cookie set before the
    // question was asked. Raw source, deliberately: this must not appear even in a comment.
    assert.doesNotMatch(shell, /googletagmanager|gtag\(/)
  })

  it('the 404 page says the SERVER answered 404, not merely that the page is missing', () => {
    // nginx keeps the real status through `error_page 404 /index.html`. Saying so is what stops a
    // reader assuming the app is broken when the address is simply wrong.
    assert.match(notFound, /404 rather than a 200/)
  })

  it('the 404 page offers a way back to the platform', () => {
    assert.match(notFound, /to="\/"/)
  })
})

describe('no page reaches the API directly', () => {
  it('every /v1 path lives in src/lib/worlds.ts, where it is cited', () => {
    // The rule CI restates. A page that called `api()` itself would be a route with no citation
    // and no cross-check against the service.
    //
    // A REQUEST is a path in a string or template literal.
    for (const [name, source] of PAGES) {
      const code = withoutComments(source)
      assert.doesNotMatch(code, /['"`]\/v1\//, `${name} requests a /v1 path directly`)
      assert.doesNotMatch(code, /\bapi</, `${name} calls api() directly`)
    }
  })

  it('and no page shows a route name to a reader either', () => {
    /*
     * THE INVERSE OF WHAT USED TO STAND HERE, which REQUIRED the platform page to display
     * `GET /v1/titles` inside a <code> element — the reasoning being that naming the route made
     * "an empty list is a real answer" checkable.
     *
     * It made it checkable by an engineer. The person reading that sentence is deciding whether to
     * make an account, and a route name tells them nothing they can act on: the claim they need is
     * that the list is empty because nobody has added anything, which the page now says in those
     * words. The route lives in `src/lib/worlds.ts`, which is where a request is made from.
     */
    for (const [name, source] of PAGES) {
      const code = withoutComments(source)
      assert.doesNotMatch(
        code,
        /\b(GET|POST|PUT|PATCH|DELETE) \/v\d/,
        `${name} prints an HTTP route at a reader`,
      )
    }
  })
})

describe('money is never put through Number', () => {
  it('no page parses a Shard amount', () => {
    // Both Shard fields arrive as decimal strings and stay strings — `worlds/src/server.ts`,
    // "A budget is money." The formatter is the only thing that touches them.
    for (const [name, source] of PAGES) {
      const code = withoutComments(source)
      assert.doesNotMatch(code, /Number\((.*)Shards/, `${name} parses a Shard amount`)
      assert.doesNotMatch(code, /parseInt|parseFloat/, `${name} parses a number out of a string`)
    }
  })

  it('the title page renders both Shard fields through the formatter', () => {
    assert.match(withoutComments(title), /shards\(season\.rewardBudgetShards\)/)
    assert.match(withoutComments(title), /shards\(season\.rewardsGrantedShards\)/)
  })
})
