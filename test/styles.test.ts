/**
 * WHAT THIS SURFACE'S STYLESHEET IS ALLOWED TO CONTAIN.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * Two rules, both from measurements taken on 2026-08-10 across the estate's frontends.
 *
 * 1. A CLASS THE DESIGN SYSTEM DOES NOT DECLARE FAILS SILENTLY. `className="cf-subnav"` on a
 *    landmark whose rule does not exist renders an unstyled `<nav>`: no sticky offset, no measure,
 *    no scroll — in a browser that reports nothing and a build that stays green. This is the same
 *    failure mode as an undefined custom property, where `var(--cf-nope)` invalidates the whole
 *    declaration at computed-value time and removes the border rather than falling back to one.
 *    `micro-explorer-web/test/tokens.test.ts` records the estate shipping both.
 *
 * 2. A PRIVATE COPY BESIDE A SHARED ONE AGES, AND NOTHING FAILS WHILE IT DOES. Ten frontends
 *    declared the section strip in their own stylesheet under six class prefixes — `wt-` here —
 *    from what was plainly one original that had been copied and then edited in place. This
 *    repository's copy was one of the nine that did not survive a phone, and one of the five that
 *    was 16px wider than the chrome above and below it. So the deletion of `.wt-subnav*` is pinned
 *    in BOTH directions: the shared classes must exist, and the local ones must be gone.
 *
 * The checks read the stylesheet the bundle actually links — `@cloudsforge/ui` resolves through
 * `node_modules`, which is the same symlinked working tree Vite and the test loader use — rather
 * than a sibling checkout that may or may not be there.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

/**
 * This app's stylesheet with its comments stripped.
 *
 * The same lesson as `withoutComments` in test/render.test.ts and the nginx grep: the header of
 * src/styles.css QUOTES `.wt-subnav` and `76rem` in order to explain why they are gone, and a scan
 * over the raw text matches that explanation and fails a correct file. A guard that fires on its
 * own rationale is a guard somebody satisfies by deleting the rationale.
 */
const CSS = readFileSync(at('src/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The design system's stylesheet, resolved the way the bundle resolves it.
 *
 * Through the export map rather than by walking to a sibling checkout: `@cloudsforge/ui/ui.css` is
 * the specifier src/main.tsx imports, so this reads the bytes that will be served. micro-ui commits `dist/`
 * deliberately — no consumer builds it — and its own `src/dist.test.ts` recompiles on every run and
 * fails if a committed byte differs from the source, so this cannot be reading a stale copy.
 */
const require_ = createRequire(import.meta.url)
const UI = readFileSync(require_.resolve('@cloudsforge/ui/ui.css'), 'utf8')

/** Every `cf-` class ui.css declares a rule for. */
const declared = new Set([...UI.matchAll(/\.(cf-[a-z0-9_-]+)/g)].map((m) => m[1] ?? ''))

describe('the shared sub-nav exists and the local copy is gone', () => {
  it('reads a design system stylesheet with classes in it', () => {
    // So that everything below cannot pass on an empty match — the failure mode of every check
    // written against a file that moved.
    assert.ok(declared.size >= 20, `found ${declared.size} cf- classes in ui.css`)
  })

  it('ui.css declares every class src/components/shell.tsx now names', () => {
    for (const present of [
      'cf-subnav',
      'cf-subnav__inner',
      'cf-subnav__link',
      'cf-subnav__link--current',
    ]) {
      assert.ok(declared.has(present), `.${present} is missing from ui.css`)
    }
  })

  it('src/styles.css declares no .wt-subnav rule of any kind', () => {
    // Not the block and not an element of it. The point of adopting a shared thing is that there is
    // no second copy left to drift beside it.
    const survivors = [...CSS.matchAll(/\.wt-subnav[a-z0-9_-]*/g)].map((m) => m[0])
    assert.deepEqual(
      survivors,
      [],
      `src/styles.css still declares ${survivors.join(', ')}; the strip is SubNav's now`,
    )
  })

  it('the current-section modifier really did move off `is-active`', () => {
    // `is-active` was this repository's spelling; the shared one is `cf-subnav__link--current`. A
    // stylesheet still styling `.is-active` would mean a link somewhere is still asking for it.
    assert.doesNotMatch(CSS, /\.is-active\b/, 'the local current-section modifier is back')
    assert.doesNotMatch(CSS, /is-active/, 'a className is still composing `is-active`')
  })

  it('the shared strip is the one that survives a phone, which the local copy did not', () => {
    // Asserted about the sheet that will actually be served. `.wt-subnav__inner` was a flex row
    // with neither of these, so five labels squeezed and broke mid-word on a narrow viewport.
    const inner = /\n\.cf-subnav__inner\s*\{([^}]*)\}/.exec(UI)?.[1] ?? ''
    assert.match(inner, /overflow-x:\s*auto/, 'the shared sub-nav has nowhere to scroll')
    const link = /\n\.cf-subnav__link\s*\{([^}]*)\}/.exec(UI)?.[1] ?? ''
    assert.match(link, /white-space:\s*nowrap/, 'the shared sub-nav still breaks labels mid-word')
  })
})

describe('the page is measured with the same token as the chrome around it', () => {
  it('spends no 76rem anywhere', () => {
    // 76rem is 1216px; `.cf-bar__inner` and `.cf-foot__inner` are 1200px from `var(--cf-max-w)`.
    // The difference put this app's content 8px proud of the bar and the footer on each side, on
    // every wide screen — measured 2026-08-10, on five of the estate's ten frontends.
    assert.doesNotMatch(CSS, /76rem/, 'the page measure is a literal again')
  })

  it('takes the measure from --cf-max-w, which is what the bar and the footer take it from', () => {
    const main = /\n\.wt-main\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    assert.match(main, /max-width:\s*var\(--cf-max-w\)/, '.wt-main lost its measure')
    // And the two it has to agree with really do read that token, so this is one shared fact
    // rather than two rules that happen to be spelled the same way.
    assert.match(/\n\.cf-bar__inner\s*\{([^}]*)\}/.exec(UI)?.[1] ?? '', /var\(--cf-max-w\)/)
    assert.match(/\n\.cf-foot__inner\s*\{([^}]*)\}/.exec(UI)?.[1] ?? '', /var\(--cf-max-w\)/)
  })
})
