/**
 * The app shell: the skip link, the company bar, the section navigation, the page, the footer and
 * the consent banner — in that order, which is also the tab order and is the whole point of it.
 *
 * The bar is `CloudsForgeBar` from @cloudsforge/ui and is never reimplemented. It is passed
 * `PRODUCT` — 'worlds' — so the switcher marks Forge Worlds as current and leaves every other
 * product clickable.
 *
 * Four more pieces arrived with design system 1.1 and none of them is written here: `SkipLink`,
 * `MainRegion`, `CookieBanner`, and the head tags `DocumentMeta` applies. The notes beside each
 * say whether it REPLACED a local copy or closed a defect, because those are different claims and
 * two of the four are the second one.
 *
 * `SubNav` is the fifth, and it is the second kind: the local `.wt-subnav` it replaced did not
 * scroll on a phone and was 16px wider than the bar above it. The note beside it records both.
 *
 * `test/shared-chrome.test.ts` mounts this in a document and asserts them as BEHAVIOUR rather than
 * as imports: the skip link's target takes focus, the head follows the address, and no analytics
 * cookie exists before anybody has agreed to one. Source text proves none of those three.
 */
import { useEffect } from 'react'
import {
  CloudsForgeBar,
  CloudsForgeFooter,
  CookieBanner,
  MainRegion,
  SkipLink,
  SubNav,
  miningOnHub,
} from '@cloudsforge/ui'
import { applyHead, surfaceMeta } from '@cloudsforge/ui/seo'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PRODUCT, hosts } from '../lib/hosts.ts'
import { pageMetaFor } from '../lib/meta.ts'
import { NAV } from '../lib/routes.ts'
import { useSession } from '../lib/auth.tsx'

export function AppShell({ unregistered = false }: { unregistered?: boolean }) {
  const { account, signIn, signOut } = useSession()

  return (
    <>
      {/*
        The skip link is the first focusable thing in the document, and it is now the SHARED one.
        This app had its own — a `.ww-skip` anchor pointing at `#main` — and it was half of the
        pattern. The anchor worked; its TARGET did not. `<main id="main">` carried no
        `tabIndex={-1}`, and a `<main>` is not focusable by default, so in Chrome and Safari
        following the link scrolled the page, left focus on the link, and sent the next Tab back to
        the second item in the company bar. It looked like it worked and did not, and it is
        invisible to everything except a person using it. `MainRegion` below is the missing half:
        it sets the id and the tabindex together, and the id is `MAIN_ID` (`cf-main`), which the
        shared `SkipLink` composes its href from — so the two cannot disagree.

        The wording stays this surface's own: the inventory list and the entitlement list are long,
        and "the page" is what a reader of them is skipping to.
      */}
      <SkipLink>Skip to the page</SkipLink>
      <DocumentMeta />
      {/*
        `mining` is the design system's own control, and the bar puts it immediately before the
        account menu — which is to say on every address this surface serves, rather than on one
        page of one other one.

        What is passed is `miningOnHub()`, the control's `elsewhere` state, and that is not a
        degraded version of it. A session is a WebSocket to the pool plus two Web Workers, pinned
        to one origin and one page; `hub.<apex>` is not this origin, and nothing in this bundle can
        start, observe or stop a session over there. So the control renders an ANCHOR to the
        surface that can — middle-clickable, openable in a new tab, and readable by everything that
        reads links, which is the same argument the shared `SkipLink` above makes about targets
        this file used to express by hand.

        `hosts().hub` and never a written-out URL: `hosts()` derives the apex from the address the
        page was served from, which is the whole reason `unregistered` below exists. A literal
        would be right on the apex and wrong on localhost and on every preview host.
      */}
      <CloudsForgeBar
        current={PRODUCT}
        account={account}
        onSignIn={() => signIn()}
        onSignOut={signOut}
        mining={miningOnHub(hosts().hub)}
      />
      {/*
        The sections strip is the SHARED one now. It was `.wt-subnav` in src/styles.css — inherited
        from the web template — and the census taken on 2026-08-10 found ten frontends carrying that
        same strip under six class prefixes, each edited in place. This copy had drifted in two ways
        a reader can see:

          - it did not survive a phone. `.wt-subnav__inner` was a `display: flex` row with no
            `overflow-x` and no `white-space: nowrap`, so the five section labels squeezed and broke
            mid-word on a narrow viewport and the ones past the edge could not be reached at all.
            Only hub-web's copy scrolled;
          - it was 16px wider than the chrome above and below it. `max-width: 76rem` is 1216px,
            while `.cf-bar__inner` and `.cf-foot__inner` use `var(--cf-max-w)` — 1200px — so this
            row sat 8px proud of the bar on each side on every wide screen.

        `SubNav` carries the sticky offset (`var(--cf-bar-h)`, the bar's own height token, never a
        number copied out of it), the scroll behaviour and the measure. The LINKS stay here, because
        the active state is react-router's `NavLink` and the design system does not depend on
        react-router. The modifier changes name with the strip: this repo spelled it `is-active`,
        the shared one is `cf-subnav__link--current`.

        The label stays this surface's own wording. `SubNav` requires one rather than defaulting it:
        the company bar is the document's other `<nav>`, and two landmarks called "Navigation" are
        two landmarks nobody can tell apart.
      */}
      <SubNav label="Sections">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `cf-subnav__link${isActive ? ' cf-subnav__link--current' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </SubNav>
      {/*
        `MainRegion` rather than a hand-written `<main>`: it sets `id={MAIN_ID}` and `tabIndex={-1}`
        together, which is the pair the skip link needs and the pair this file used to get half
        right. The id is `cf-main` now rather than `main` — nothing else in this app referenced the
        old one, checked by grep across src/ and test/.
      */}
      <MainRegion className="wt-main">
        {/*
          Not fatal, so not a refusal — this app has public pages worth serving and nothing here is
          a security boundary. But not silent either. `cloudsforgeHosts()` derives the apex by
          stripping a KNOWN subdomain, so an address the registry does not know makes every estate
          URL resolve one level too deep: the worlds API, and the account portal with it. The
          symptom is a site that cannot sign anybody in and says nothing about why.
        */}
        {unregistered && (
          <p className="ww-note ww-note--warn" role="status">
            <span className="ww-note__icon" aria-hidden="true">
              ▲
            </span>
            {/*
              The sentence is wrapped, and it has to be. `.ww-note` is a flex container, and a flex
              container makes an item out of every child INCLUDING each anonymous run of text — so
              this note used to lay out as four items and rendered the `worlds` code element and
              the words after it on the line ABOVE the words before them. Every word was present
              and the order on screen was wrong, which is a defect no source read finds.
            */}
            <span className="ww-note__body">
              This page is being served from an address CloudsForge does not recognise, so the
              links it works out from it — including the one to your account — point somewhere
              wrong. Open Forge Worlds from its own address instead.
            </span>
          </p>
        )}
        <Outlet />
      </MainRegion>

      {/*
        The company footer, from @cloudsforge/ui. Not written here, and deliberately not
        `<footer>` markup of this app's own: the estate had four hand-rolled footers and nine
        surfaces with none, and the registry's `developers` row has been claiming all along that
        the developer console is "reached from the footer" — a navigation path that existed
        nowhere. Every link in it is derived from SURFACES, so a new product appears here without
        this file changing.

        `account` is passed for one reason: it decides whether the operator surfaces are offered.
        Omitting it would hide them, which is safe, but this app already knows and a signed-in
        operator should be able to reach Admin from any page.
      */}
      <CloudsForgeFooter current={PRODUCT} account={account} />

      {/*
        Last in the document, and therefore last in the tab order. That is deliberate: the banner
        is a dialog and is explicitly NOT modal, so a reader who came here to find out whether the
        thing they paid for was delivered can read that answer and reply to this afterwards. A
        consent banner that traps focus is the coercion the regulation is about.

        It renders nothing at all until it knows the reader has not already answered, and nothing
        on an origin where analytics would not report anyway — so a local `pnpm dev` never sees it.
        Reject and Accept share one class with no modifier, and that symmetry is a compliance
        requirement rather than a preference; see `.cf-consent__choice` in ui.css.
      */}
      <CookieBanner />
    </>
  )
}

/**
 * Keep `document.title`, the description, the Open Graph tags and the canonical link in step with
 * the address.
 *
 * A component in the shell rather than a hook each page calls, because the failure mode of the
 * second shape is the page that forgets — and the page that forgets is the one added last, which
 * is the one nobody has bookmarked yet and therefore the one nobody notices is titled with the
 * previous page's title. Before this, every address on this surface was titled "Forge Worlds",
 * including the entitlement page a customer reloads while waiting to find out whether something
 * they paid for arrived.
 *
 * The construction of the tags is a pure function in `@cloudsforge/ui/seo`, with its own tests
 * upstream. This is only the part that touches the DOM. What is left — which of this app's
 * addresses is which, and the description the registry gets wrong — is `src/lib/meta.ts`, which
 * imports no React and is tested without one.
 *
 * ── WHAT THIS DOES NOT REPLACE ────────────────────────────────────────────────────────────────
 *
 * The static tags in `index.html`. They are what a link-preview fetcher gets — the ones used by
 * chat and social clients generally do not execute JavaScript — so the shell keeps its own title,
 * description and card, and this is the layer a browser and the crawlers that do execute
 * JavaScript see. That trade is inherited rather than introduced; it is written down at the top of
 * `@cloudsforge/ui/seo`.
 */
function DocumentMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    applyHead(surfaceMeta(PRODUCT, pageMetaFor(pathname)), window.location.origin)
  }, [pathname])

  return null
}
