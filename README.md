# micro-worlds-web

[![ci](https://github.com/cloudsforge-online/micro-worlds-web/actions/workflows/ci.yml/badge.svg)](https://github.com/cloudsforge-online/micro-worlds-web/actions/workflows/ci.yml)
![licence](https://img.shields.io/badge/licence-MIT-97CA00)
![node](https://img.shields.io/badge/node-%3E%3D22-5FA04E?logo=node.js&logoColor=white)
![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![module](https://img.shields.io/badge/module-ESM-F7DF1E?logo=javascript&logoColor=black)
![tests](https://img.shields.io/badge/tests-in--process%20DOM-6E56CF)

The browser client for **Forge Worlds** — the title registry, one player account that crosses every
title, the inventory that account carries, the achievements and seasons titles report into, and the
entitlement bridge between what somebody bought and what a title raises. It is the customer-facing
half of `micro-worlds`.

> **Forge Worlds is the platform, not a game, and this client is built as one.** *Ninety Days After*
> and *Emberkin* are titles that run on it; they are rows in a registry read at runtime from
> `GET /v1/titles`, not screens in this bundle. No title is named anywhere in this app's route
> table, navigation, components or pages — `test/gap.test.ts` cuts the front page's lede out and
> asserts that no title name remains anywhere else in the file. The one sentence that does name them
> ("Ninety Days After and Emberkin are titles that run here") is the *correction* of the category
> error, not an instance of it.

> **It also refuses to pretend the platform works end to end.** Nothing registers a title, so a
> fresh deployment answers `GET /v1/titles` with `{"titles":[]}`; and no title serves the
> provisioning half of the bridge, so a private-world purchase ends as a row rather than as a world.
> Both are rendered as findings with citations, never as a spinner or an empty state that implies
> "loading". See [Known gaps](#known-gaps).

## What it talks to

One service, `micro-worlds`, plus `micro-identity` for the session.

| Upstream | Routes | When it is down |
| --- | --- | --- |
| `micro-worlds` | the eleven below | every screen shows a failure with the request id on it; nothing is cached and nothing is guessed |
| `micro-identity` | `GET /auth/me` (`identity/src/server.ts:891`), `POST /auth/refresh` | **fail soft** — an unreachable account service must not sign somebody out while they are reading whether a purchase arrived (`src/lib/auth.tsx`) |

### The routes this client calls

Read out of `worlds/src/server.ts`, one at a time. Every line below is verified by
`test/worlds.test.ts` against a real `micro-worlds` checkout, and CI bends a citation to prove the
check can go red.

| Method | Path | Authenticates | Verified at | What it does |
| --- | --- | --- | --- | --- |
| `GET` | `/v1/titles` | **no** | `worlds/src/server.ts:467` | the registry. Public: "a launcher listing games cannot require a token to do it" |
| `GET` | `/v1/players/me` | yes | `worlds/src/server.ts:524` | profile, inventory and unlocked achievements. **Fails open** |
| `PUT` | `/v1/players/me` | yes | `worlds/src/server.ts:551` | replace the profile. A full replace, not a patch |
| `PUT` | `/v1/players/me/cosmetics` | yes | `worlds/src/server.ts:576` | equip or clear a slot. **Fails closed** |
| `GET` | `/v1/players/me/inventory` | yes | `worlds/src/server.ts:598` | what the account carries |
| `POST` | `/v1/players/me/inventory/:id/list` | yes | `worlds/src/server.ts:617` | offer an item to the market |
| `DELETE` | `/v1/players/me/inventory/:id/list` | yes | `worlds/src/server.ts:631` | withdraw the offer |
| `GET` | `/v1/provisions` | yes | `worlds/src/server.ts:642` | what you were sold, and whether it arrived |
| `GET` | `/v1/provisions/:id` | yes | `worlds/src/server.ts:683` | one purchase |
| `GET` | `/v1/titles/:id/achievements` | **no** | `worlds/src/server.ts:701` | a title's achievements |
| `GET` | `/v1/titles/:id/seasons` | **no** | `worlds/src/server.ts:755` | a title's seasons |

**Three routes make no `authenticate()` call** — the three marked **no** above. Their handlers take
a principal nowhere and read no `authorization` header.

The README template warns that a client sending a token to such a route "gets a 403 it cannot
diagnose". **On `worlds` that is not what happens, and the difference is worth stating.** There is
no middleware and no wrapper: `handle()` (`worlds/src/server.ts:284-353`) dispatches straight into
each route's own closure, so a handler that never calls `authenticate` never reaches `requireScope`
and nothing can raise a `ForbiddenError`. A bearer sent to `GET /v1/titles` yields a 200. The real
defect on this service is quieter: a client that *believes* those routes are gated puts them behind
a sign-in wall, and an anonymous visitor is then asked to sign in to read a registry the service
would have handed them. So this app sends `auth: false` on all three and keeps their screens outside
`ProtectedRoute` — asserted in both directions by `test/routes.test.ts` and `test/worlds.test.ts`.

### The routes it declines, and why

Declining is a first-class entry, not an omission: `test/worlds.test.ts` requires this repository to
account for **every** `/v1` route the service registers, so a route that grows and is never read
fails the build instead of going quiet.

| Method | Path | Verified at | Why not here |
| --- | --- | --- | --- |
| `POST` | `/v1/events` | `worlds/src/server.ts:389` | the bridge's front door, HMAC-checked over the exact bytes before `JSON.parse`. A browser cannot hold `OUTBOX_SIGNING_SECRET`, and a bundle that shipped it would *be* the free-worlds endpoint the check exists to prevent |
| `POST` | `/v1/titles` | `worlds/src/server.ts:484` | requires `worlds:admin` or `role:admin` (`:488-489`) |
| `POST` | `/v1/provisions/:id/retry` | `worlds/src/server.ts:667` | requires an administrator (`:669-670`). It is the only way out of `failed`, and the service's own comment at `:645-646` says no view of failed rentals exists anywhere in the estate. That view belongs in the operator console — see [Known gaps](#known-gaps) |
| `PUT` | `/v1/titles/:id/achievements` | `worlds/src/server.ts:714` | `worlds:title` or `role:admin`. A title defines its own |
| `POST` | `/v1/titles/:id/achievements/unlock` | `worlds/src/server.ts:735` | `worlds:title` or `role:admin`. A title reports what a player did; a player does not report it about themselves |
| `POST` | `/v1/titles/:id/seasons` | `worlds/src/server.ts:760` | opening a season sets a money budget. "A title that could set its own reward budget could pay itself" (`:762-763`) |
| `GET` | `/v1/seasons/:id/budget` | `worlds/src/server.ts:779` | an operator's number. "1,412 Shards left in the pot" in front of players is an invitation to race for it, and a season budget exists to bound an exploit (`worlds/src/env.ts:16-23`). It is also unroutable in production — see [Defects found elsewhere](#defects-found-in-other-repositories) |
| `POST` | `/v1/seasons/:id/rewards` | `worlds/src/server.ts:802` | `worlds:title` or `role:admin`. Paying oneself from a browser is the exploit the budget exists to bound |

`/livez` (`:363`), `/readyz` (`:365`) and `/metrics` (`:370`) are served too. They are not called
from a browser.

### No `Idempotency-Key`, and that is a fact rather than an omission

Four wallet routes and five market mutations in this estate answer **400** without one. **None of
`worlds`'s do**: there is no `withIdempotentRoute` wrapper and no such header read anywhere in
`worlds/src/server.ts`. The protection is state instead — `listForSale` runs one conditional UPDATE
guarded by `and bound = false` (`worlds/src/players.ts:424`). So this client sends none, and
`test/worlds.test.ts` asserts the service still reads none, which is what stops somebody "fixing"
this client by adding a header the service ignores — or concluding the reverse.

(The header *does* appear in `worlds/src/titleclient.ts:149`, where `worlds` is the **caller** and
sends the entitlement id to a title. Different direction, different file.)

## What it refuses to do

* **It never presents an entitlement as an advantage.** `docs/ecosystem/01-product-vision.md`
  principle 6: purchasable means cosmetic, convenience or access — never power. `bound` is where the
  platform enforces it (`worlds/src/players.ts:390-391`, from 04-domain-model §7.3: "anything
  conferring power is bound and cannot enter the market"), and this client renders it as the control
  it is rather than as a restriction a buyer suffered. `test/format.test.ts` asserts the vocabulary;
  the `rules` job in CI greps for the rest.
* **A bound item gets no sell control at all** — not a disabled one. `bound` is on the wire
  "because a client that offers a 'sell' button must know before it draws one"
  (`worlds/src/server.ts:861-862`), so the control is not drawn. A disabled button reads as "not
  yet, ask somebody" and gets clicked at.
* **It offers no way to set an age bracket**, though `PUT /v1/players/me` accepts one
  (`worlds/src/server.ts:559-564`). An age bracket is a safeguarding fact
  (`worlds/src/players.ts:8-11`); a form that lets an account assert its own is a form that lets an
  account assert it is an adult. It is displayed, never edited.
* **It has no act-as-anyone primitive.** Every player-scoped route derives the account from the
  token via `subjectUserId`, so there is no `userId` to send. CI greps for one anyway.
* **It never translates the shared 404 into "that belongs to somebody else".**
  `worlds/src/server.ts:688`: "'Does not exist' and 'is not yours' are the same answer on purpose" —
  a distinct answer for the second is an enumeration oracle.

## Screens

| Path | Screen | Session | Reads |
| --- | --- | --- | --- |
| `/` | The platform: what it owns, the registry, and what does not work yet | **public** | `GET /v1/titles` |
| `/player` | The one account: profile, sanctions, wardrobe, achievements | required | `GET`/`PUT /v1/players/me`, `PUT /v1/players/me/cosmetics` |
| `/inventory` | What the account carries, and what may leave it | required | `GET /v1/players/me/inventory`, `POST`/`DELETE …/list` |
| `/entitlements` | What you were sold and whether it arrived | required | `GET /v1/provisions` |
| `/entitlements/:id` | One purchase, with the platform's own refusal if it could not be delivered | required | `GET /v1/provisions/:id` |
| `/titles/:id` | One title's achievements and seasons | **public** | `GET /v1/titles/:id/achievements`, `GET /v1/titles/:id/seasons` |

Which screens are public is **read off the service**, not chosen. `src/lib/routes.ts` carries the
declaration; `nginx.conf` enumerates the same paths; `test/routes.test.ts` reads all three and fails
when any drifts.

**An unknown address answers 404, not 200.** `nginx.conf` enumerates the real routes and everything
else falls through to `error_page 404 /index.html`, which serves the same bundle while keeping the
404 status. The usual `try_files $uri /index.html` serves the app with a 200 for every address in
existence, which makes a "page not found" screen a success: crawlers index it, uptime checks call it
healthy, and a deploy that drops a route looks exactly like a deploy that did not. `/titles/<uuid>`
is a public, shareable address, so this matters here. The CI image job curls a route the app does
not own and requires a 404 with the shell in the body.

## Configuration

**There is none, and that is the property this repository exists to keep.**

No `.env`, no `define`, no `envPrefix`, no `import.meta.env`. Every host is resolved in the browser
from `window.location.hostname` by `cloudsforgeHosts()` (`@cloudsforge/ui`), so one image serves
localhost, a preview deployment, staging and production. An image with an environment baked into it
has to be rebuilt to be promoted, which means the artefact that reaches production is not the
artefact that passed CI.

`test/no-build-time-config.test.ts` greps the whole source tree, and the `rules` job in CI greps
again so deleting the test does not delete the rule.

The only build argument is `RELEASE`, the git sha, stamped into a meta tag that `src/lib/obs.ts`
reads so an error report can name the deploy that produced it. That is an *identity*, not a
configuration.

### Two surfaces, not one

Unique to this app in the estate, and deliberate:

| Key | What | Subdomain | devPort | Registered at |
| --- | --- | --- | --- | --- |
| `worlds` | **this bundle** | `worlds` | 3001 | `ui/packages/ui/src/surfaces.ts:239-250` |
| `worlds-api` | **`micro-worlds`** | `worlds-api` | 4002 | `ui/packages/ui/src/surfaces.ts:771-784` — **but see defect 3: this row is a fossil.** The public API is `api.<apex>`; `worlds-api.<apex>` has no public DNS |

Every other frontend uses one key for both, because for them the bundle and its API share an origin
behind the gateway. Here they do not, so `apiBase()` is always absolute and every request is
cross-origin by design. The origin comparison in `resolveApiBase` is kept anyway, so that a deploy
which ever puts both behind one origin needs no code change.

## Running it

```bash
pnpm install

# The design system is unpublished and resolves through `link:../ui/packages/ui`, so its own
# install must happen first or tsc cannot resolve React from inside the linked sources.
pnpm --dir ../ui install

pnpm dev        # http://localhost:3001 — the registry's own port for this surface
pnpm typecheck
pnpm test
pnpm build
```

### `micro-worlds` must be started on 4002, and here is why

```bash
PORT=4002 pnpm --dir ../worlds dev
```

The surface registry gives `worlds-api` **devPort 4002** (`ui/packages/ui/src/surfaces.ts:501`).
`micro-worlds` binds **4000**: `worlds/src/env.ts:171` defaults `PORT` to 4000 and
`worlds/.env.example:38` sets it to 4000. Under `pnpm dev` the registry value is the one this bundle
calls, so a `worlds` started from its own example environment is not where this app looks.

This is **not** fixed with a literal port in `src/lib/hosts.ts`. A hard-coded host is a second,
unversioned copy of the registry, and the copy is the one that goes stale — the same reasoning
`micro-admin-web` and `micro-mint-web` applied to the same defect. `test/hosts.test.ts` pins both
halves, so the day either moves it fails and names the other, and CI greps `src/lib/hosts.ts` for
any literal host at all.

### The cross-repository tests

`pnpm test` passes with only this repository cloned; the cross-repository half **skips** and says so.
CI checks out `micro-worlds`, `micro-emberkin` and `micro-nda` and makes the absence fatal — a
skipped test is an unmeasured one. Set `CLOUDSFORGE_WORLDS_DIR` to point at a checkout elsewhere.

### The one temporary thing

`@cloudsforge/ui` is consumed as `link:../ui/packages/ui` because it is not published yet. The day
it is, the specifier becomes `^1.0.0`, the `uipkg` build context leaves the Dockerfile, the second
checkout leaves `ci.yml`, and the whole of the `check` and `image` jobs is replaced by a call to
`micro-org`'s reusable `web-ci.yml`.

## Known gaps

Both are rendered in the product, with citations, and neither is drawn as a loading state. They are
held as data in `src/lib/worlds.ts` (`KNOWN_GAPS`) so `test/gap.test.ts` can assert the screens
render them and that the wording never softens into "coming soon".

### 1. Nothing registers a title, so the registry starts empty

`POST /v1/titles` (`worlds/src/server.ts:484`) is the only writer of the `titles` table and it
requires `worlds:admin` or `role:admin` (`:488-489`). No service calls it on boot, no migration seeds
it, and no deploy step inserts a row. **A freshly deployed Forge Worlds knows about no titles at
all.**

An empty list here is a **200 and a true answer**, not a page that has not finished loading. The
front page says exactly that and then states the gap.

*What would close it:* each title service registers itself on boot. `registerTitle` is idempotent on
the slug (`worlds/src/titles.ts:117-123`) precisely so "a deploy that re-registers its title on every
boot — which is the obvious way for a title to declare itself — produces one row rather than a
conflict an operator has to go and clear". Or an operator registers it once with an admin token.

### 2. No title implements the provisioning side of the bridge

`worlds` makes exactly two calls into a title service:

* `GET /v1/title` — `worlds/src/titleclient.ts:122`
* `POST /v1/provision` — `worlds/src/titleclient.ts:134-135`

**Neither `micro-emberkin` nor `micro-nda` serves either.** Both route tables were read:
`emberkin/src/server.ts` registers ten routes (`:238`–`:431`), `nda/src/server.ts` thirty-two across
`define` (`:409`–`:654`) and `defineMutation` (`:431`–`:965`); neither path appears in either. They
integrate in the **achievement direction only** — they call `worlds`; `worlds` cannot ask them for
anything.

**The bridge itself is complete and correct.** `driveProvision` reads the registered title's declared
capabilities and refuses *before* making the call (`worlds/src/provisioning.ts:441-451`): "Asked
BEFORE the call rather than discovered from a 404. A title that cannot do this is a catalogue
mistake, and it deserves a row that says so." So the outcome is a terminal `unsupported` row carrying
a readable sentence, not a blind 404 and not a silent retry loop.

**But a private-world entitlement still ends as a row, not a world.** A customer paid, the estate
recorded it, and nothing was raised. `/entitlements/:id` renders that row with the service's own
`lastError` **verbatim** and no retry control — the treatment `micro-admin-web` gives an action with
no executor (`admin-web/src/lib/catalogue.ts:23-37`), for the same reason: a disabled button reads as
"not yet" and gets clicked at.

*What would close it:* a title serves `GET /v1/title` and `POST /v1/provision`, honouring the
entitlement id as its idempotency key in both the `Idempotency-Key` header and the body
(`worlds/src/titleclient.ts:11-17`), and passes `worlds/src/conformance.ts`.

`test/worlds.test.ts` re-checks this claim against the real repositories on every CI run and **fails
if it ever stops being true** — this app must not go on telling somebody their purchase cannot be
delivered after it can.

### 3. There is still no operator view of failed provisions

`worlds/src/server.ts:645-646` calls it "the fifth of the six missing pieces: there is no view of
failed rentals anywhere in the estate today." `GET /v1/provisions` already serves an administrator the
whole backlog, and `POST /v1/provisions/:id/retry` is the only way out of `failed`.

**This repository deliberately does not close it.** It is a player product; an operator's escape
hatch belongs in `micro-admin-web`, and a player app growing one is how the console ends up spread
across six repositories. Recorded here so the omission is a decision rather than an oversight.

## Defects found in other repositories

Reported, not fixed — none of them blocks this repository.

1. **`micro-ui`: `worlds-api` devPort 4002 is an allocation, not a fact.** `micro-worlds` binds 4000
   (`worlds/src/env.ts:171`, `worlds/.env.example:38`). This is the **fifth** instance of the same
   defect class — `foresight` carried beacon's 4011, `emberkin` carried 3014 while binding 4100,
   `admin` carried 3002 while `admin-api` binds 4014, `create` carries 4004 while `mint` binds 4000.
   `ui/packages/ui/src/surfaces.test.ts:187-206` pins only surfaces whose service binds a
   *distinctive* port, and 4000 is the service-template default half the estate shares — so the
   entry genuinely is an allocation, and what is missing is anything that makes it true. Handled
   here the way `micro-mint-web` handled its own: the README says `PORT=4002 pnpm dev`, in one line,
   next to the citation.

2. **`micro-deploy`: `/v1/seasons` is routed nowhere.**
   `deploy/gateway/dynamic/public-api.yml:143` matches `PathPrefix('/v1/titles')`,
   `PathPrefix('/v1/players')` and `PathPrefix('/v1/provisions')` for worlds, and *not*
   `/v1/seasons`. So `GET /v1/seasons/:id/budget` (`worlds/src/server.ts:779`) and
   `POST /v1/seasons/:id/rewards` (`:802`) fall to the catch-all router at `:151` and are
   blackholed to `http://127.0.0.1:1` (`:196-198`). The second of those is how a **title service
   pays a season reward** — so on the current gateway configuration, no title can be paid through
   the public host at all. This client declines both routes for independent reasons, so it is not
   blocked; the reward path is a real hole.

3. **`micro-ui`: the `worlds-api` registry row is a fossil, and this bundle resolves against it.**
   The rename recorded as pending went **the other way**: `worlds-api.<apex>` was retired and folded
   INTO `api.<apex>`, rather than the API being renamed away from `api.`. Measured on 2026-08-05:

   ```
   api.cloudsforge.online/v1/titles          -> 200 application/json
   api-testnet.cloudsforge.online/v1/titles  -> 200 application/json
   worlds-api.cloudsforge.online             -> no public DNS record
   ```

   Worlds' routes are served under `CF_API_HOST` (`public-api.yml:142-147`), and `public-api.yml:197`
   refers to "folding `worlds-api` into the API host" as something already done. But
   `ui/packages/ui/src/surfaces.ts:771-784` still declares the `worlds-api` row, and its `api` row
   still carries the superseded comment at `:755-756` — "`api.` still points at the game API, which
   is renamed to `worlds-api.` first." **The registry is now behind the deploy, not ahead of it.**

   The consequence for this bundle is concrete: `src/lib/hosts.ts` resolves against `worlds-api`,
   which is a hostname with no public DNS, so in production it must be served with `CF_API_HOST`
   pointing at `api.<apex>` — the local estate router `cf-api-worlds-api`
   (`estate-web.yml:388-389`) covers the compose apex only. Reported to micro-ui; retiring the
   registry row is the real fix and is not this repository's to make.

4. **`micro-web-template` (inherited): `relative()` can never produce a singular unit.** `pick`
   switches unit only above 90 of the smaller one and then rounds, so 60 seconds reads "60 seconds
   ago", 60 minutes reads "60 minutes ago", and by the time minutes exceed 90 the rounded hour count
   is already 2. The `value === 1 ? unit : ...` branch is dead code. Harmless — no string is wrong,
   only never singular — so it is **not** worked around here and the shared helper is not forked in
   a client repository. `test/format.test.ts` asserts the behaviour that exists and records the
   finding.

5. **`foresight-web` (previously reported, still open): `index.html` declares `og:type`, `og:title`
   and `og:description` twice.** The second set silently wins in every crawler and the first is dead
   text nobody edits. Not repeated here; `test/brand-chrome.test.ts` asserts each is declared once.

## Tests

`pnpm test` — 285 tests across 12 files, no DOM.

| File | What it holds |
| --- | --- |
| `worlds.test.ts` | **the route table, against the real service.** Every citation is the line that registers the route; whole path **shapes**, never prefixes; the three unauthenticated routes really are; the two `titleclient.ts` call sites; and the estate-wide check that no title serves them |
| `gap.test.ts` | both gaps are stated as findings with citations, never as loading; the refusal is verbatim; no control beside a gap; no title as structure |
| `routes.test.ts` | `routes.ts`, `app.tsx` and `nginx.conf` agree; public matches unauthenticated; the honest 404; the security headers in every `Cache-Control` location |
| `format.test.ts` | every service state has a distinct word and glyph; `unsupported` is not spelled as a failure; nothing purchasable is described as an advantage; money is never a number |
| `render.test.ts` | a bound item has no control; the four states; no page reaches `/v1` itself |
| `hosts.test.ts` | two surface keys; runtime resolution; the dev-port disagreement pinned in both directions |
| `auth.test.ts` | the nested `/auth/me` shape, the flat fallback, and neither read by accident |
| `brand-chrome.test.ts` | the icons and the og card exist, are linked, are byte-identical to `brand/assets/worlds/`, and the Dockerfile copies `public/` |
| `api.test.ts`, `obs.test.ts`, `resource.test.ts`, `no-build-time-config.test.ts` | the inherited infrastructure, unweakened |

### The shape check, and why it is not a prefix check

`micro-market`'s guard matched `path.startsWith(servedPrefix)` and would have passed two genuinely
dead paths because they *began* with a served prefix — `micro-mint` then shipped exactly that defect.
Worse, a `${scope}` helper standing for two segments collapsed a path so it matched an entirely
*different* route and was reported fine. `matchesShape` in `test/worlds.test.ts` is copied from the
corrected form at `market/src/indexerclient.test.ts:230-249`: same segment count, every segment
agrees, and a `${...}` is exactly one segment.

It also compares the **method**, which the first run of the suite proved necessary: `GET /v1/titles`
is called and `POST /v1/titles` is declined, and they are the same path.

### The mutation step, and the trap it avoids

CI bends a citation and requires the suite to go red, so a `worlds.test.ts` reduced to assertions
that always pass cannot look like a verified client.

`micro-mint-web`'s version of that step once **hardcoded** the line number it mutates. The day
`micro-mint`'s route table moved, the `sed` matched nothing, the mutation did not happen, the suite
passed *unmutated*, and the step reported "the cross-check passed a citation off by one line" when
the truth was that no citation had been bent. So the steps here **read** the number out of the test
file and then **refuse to grade an unmutated file** — they grep for the bent value and exit non-zero
if the write did not land. Both halves are needed; reading the number without checking the write is
the same failure with an extra step.

There are two such steps, because the route citations and the `titleclient.ts` citations are
different assertions in different files and one mutation does not exercise the other.

### A note on greps that read their own explanation

The first run of `gap.test.ts` failed on its own comments: a grep for `disabled` matched the sentence
explaining why there is no disabled button, and a grep for `/retry` matched the comment citing the
route the app declines. Six guards in this estate have made that mistake, and every one was worked
around by rewording the comment — which means the rule quietly deleted its own documentation. The
tests here strip comments first, and the CI greps that run over raw source are restricted to things
that must be *present*.

---

## Provenance

The code in this repository was written by **Claude Opus 5** and **Claude Fable 5**, assets
generated with **FLUX 2 Pro**, under human direction and review.
