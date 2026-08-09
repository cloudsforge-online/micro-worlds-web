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
| `micro-identity` | `GET /auth/me` (`identity/src/server.ts`), `POST /auth/refresh` | **fail soft** — an unreachable account service must not sign somebody out while they are reading whether a purchase arrived (`src/lib/auth.tsx`) |

### The routes this client calls

Read out of `worlds/src/server.ts`, one at a time. Every line below is verified by
`test/worlds.test.ts` against a real `micro-worlds` checkout, and CI bends a citation to prove the
check can go red.

| Method | Path | Authenticates | Verified at | What it does |
| --- | --- | --- | --- | --- |
| `GET` | `/v1/titles` | **no** | `worlds/src/server.ts` | the registry. Public: "a launcher listing games cannot require a token to do it" |
| `GET` | `/v1/players/me` | yes | `worlds/src/server.ts` | profile, inventory and unlocked achievements. **Fails open** |
| `PUT` | `/v1/players/me` | yes | `worlds/src/server.ts` | replace the profile. A full replace, not a patch |
| `PUT` | `/v1/players/me/cosmetics` | yes | `worlds/src/server.ts` | equip or clear a slot. **Fails closed** |
| `GET` | `/v1/players/me/inventory` | yes | `worlds/src/server.ts` | what the account carries |
| `POST` | `/v1/players/me/inventory/:id/list` | yes | `worlds/src/server.ts` | offer an item to the market |
| `DELETE` | `/v1/players/me/inventory/:id/list` | yes | `worlds/src/server.ts` | withdraw the offer |
| `GET` | `/v1/provisions` | yes | `worlds/src/server.ts` | what you were sold, and whether it arrived |
| `GET` | `/v1/provisions/:id` | yes | `worlds/src/server.ts` | one purchase |
| `GET` | `/v1/titles/:id/achievements` | **no** | `worlds/src/server.ts` | a title's achievements |
| `GET` | `/v1/titles/:id/seasons` | **no** | `worlds/src/server.ts` | a title's seasons |

**Three routes make no `authenticate()` call** — the three marked **no** above. Their handlers take
a principal nowhere and read no `authorization` header.

The README template warns that a client sending a token to such a route "gets a 403 it cannot
diagnose". **On `worlds` that is not what happens, and the difference is worth stating.** There is
no middleware and no wrapper: `handle()` (`worlds/src/server.ts`) dispatches straight into
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
| `POST` | `/v1/events` | `worlds/src/server.ts` | the bridge's front door, HMAC-checked over the exact bytes before `JSON.parse`. A browser cannot hold `OUTBOX_SIGNING_SECRET`, and a bundle that shipped it would *be* the free-worlds endpoint the check exists to prevent |
| `POST` | `/v1/titles` | `worlds/src/server.ts` | requires `worlds:admin` or `role:admin` |
| `POST` | `/v1/provisions/:id/retry` | `worlds/src/server.ts` | requires an administrator. It is the only way out of `failed`, and the service's own comment there says no view of failed rentals exists anywhere in the estate. That view belongs in the operator console — see [Known gaps](#known-gaps) |
| `PUT` | `/v1/titles/:id/achievements` | `worlds/src/server.ts` | `worlds:title` or `role:admin`. A title defines its own |
| `POST` | `/v1/titles/:id/achievements/unlock` | `worlds/src/server.ts` | `worlds:title` or `role:admin`. A title reports what a player did; a player does not report it about themselves |
| `POST` | `/v1/titles/:id/seasons` | `worlds/src/server.ts` | opening a season sets a money budget. "A title that could set its own reward budget could pay itself" |
| `GET` | `/v1/seasons/:id/budget` | `worlds/src/server.ts` | an operator's number. "1,412 Shards left in the pot" in front of players is an invitation to race for it, and a season budget exists to bound an exploit (`worlds/src/env.ts`). It is also unroutable in production — see [Defects found elsewhere](#defects-found-in-other-repositories) |
| `POST` | `/v1/seasons/:id/rewards` | `worlds/src/server.ts` | `worlds:title` or `role:admin`. Paying oneself from a browser is the exploit the budget exists to bound |

`/livez`, `/readyz` and `/metrics` are served too. They are not called
from a browser.

### No `Idempotency-Key`, and that is a fact rather than an omission

Four wallet routes and five market mutations in this estate answer **400** without one. **None of
`worlds`'s do**: there is no `withIdempotentRoute` wrapper and no such header read anywhere in
`worlds/src/server.ts`. The protection is state instead — `listForSale` runs one conditional UPDATE
guarded by `and bound = false` (`worlds/src/players.ts`). So this client sends none, and
`test/worlds.test.ts` asserts the service still reads none, which is what stops somebody "fixing"
this client by adding a header the service ignores — or concluding the reverse.

(The header *does* appear in `worlds/src/titleclient.ts`, where `worlds` is the **caller** and
sends the entitlement id to a title. Different direction, different file.)

## What it refuses to do

* **It never presents an entitlement as an advantage.** `docs/ecosystem/01-product-vision.md`
  principle 6: purchasable means cosmetic, convenience or access — never power. `bound` is where the
  platform enforces it (`worlds/src/players.ts`, from 04-domain-model §7.3: "anything
  conferring power is bound and cannot enter the market"), and this client renders it as the control
  it is rather than as a restriction a buyer suffered. `test/format.test.ts` asserts the vocabulary;
  the `rules` job in CI greps for the rest.
* **A bound item gets no sell control at all** — not a disabled one. `bound` is on the wire
  "because a client that offers a 'sell' button must know before it draws one"
  (`worlds/src/server.ts`), so the control is not drawn. A disabled button reads as "not
  yet, ask somebody" and gets clicked at.
* **It offers no way to set an age bracket**, though `PUT /v1/players/me` accepts one
  (`worlds/src/server.ts`). An age bracket is a safeguarding fact
  (`worlds/src/players.ts`); a form that lets an account assert its own is a form that lets an
  account assert it is an adult. It is displayed, never edited.
* **It has no act-as-anyone primitive.** Every player-scoped route derives the account from the
  token via `subjectUserId`, so there is no `userId` to send. CI greps for one anyway.
* **It never translates the shared 404 into "that belongs to somebody else".**
  `worlds/src/server.ts`: "'Does not exist' and 'is not yours' are the same answer on purpose" —
  a distinct answer for the second is an enumeration oracle.

## Screens

| Path | Screen | Session | Reads |
| --- | --- | --- | --- |
| `/` | The platform: what it owns, the registry, and what does not work yet | **public** | `GET /v1/titles` |
| `/player` | The one account: profile, sanctions, wardrobe, achievements | required | `GET`/`PUT /v1/players/me`, `PUT /v1/players/me/cosmetics` |
| `/inventory` | What the account carries, and what may leave it — including a sealed season's [rank banner](#the-rank-banners-a-sealed-season-pays-out), drawn | required | `GET /v1/players/me/inventory`, `POST`/`DELETE …/list` |
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

## The rank banners a sealed season pays out

A sealed Aetherholm season mints ranked heraldry onto the **shared** player profile — bound,
`titleScope: '*'`, one item per victor member, one URN per rank
(`worlds/src/heraldry.ts`):

```
cf:aetherholm:heraldry:<seasonId>:rank:<n>
```

That service's own header says why the rank is on the URN: "so first place and fifth place are
different artwork, decided by the asset pipeline later — the urn is an identity, not a file path."
The pipeline made that decision — **sixteen FLUX 2 Pro pieces** in
`micro-aetherholm-assets/assets/heraldry/`, four fields, eight charges and four rank crests, set out
in that repository's README §5 — and **nothing read it**. A player who held first place was shown a
shortened URN (micro-org#185, measured 2026-08-10). The art is not Aetherholm's to draw: heraldry is
cross-title, so `micro-aetherholm-web` names all sixteen in its own `UNSHIPPED` table with the
reason "no rank exists in this client", and this bundle is the consumer they were made for.

`src/lib/heraldry.ts` composes a banner from **field + charge + crest**, and the split between the
three is the point:

| Layer | Where it comes from | What it is |
| --- | --- | --- |
| crest | the rank on the URN, clamped to four tiers | **data.** Gold closed laurel, blued silver open wreath, bronze circlet, and the iron pennon bar for rank 4 and below — metal, silhouette and coverage stepping down together so the tiers survive monochrome |
| field | the season id, mixed | **illustration.** Four, rank-neutral, "combine freely" (set README §5) |
| charge | the season id, mixed | **illustration.** Eight, the same |

No season carries a field on any wire in this estate. The pair is derived from the season's own id
so a banner is **stable** — the same season shows the same picture on every visit and to every
player, and two members of one alliance placed second and fourth can see they were in the same
season — and the inventory row **says so in a sentence**, because the rank is a fact and the other
two are decoration and all three share one frame. That is the line `micro-aetherholm-web` draws
around island biomes, applied to the one other place in the estate where art direction sits beside
data. `test/heraldry.test.ts` asserts the sentence rather than trusting it: if it goes, the field
and the charge go with it and the crest stands alone.

`grantHeraldry` walks `input.victors.entries()` and the list is **unbounded**, so "every declared
rank" is every positive integer rather than four. The suite walks ranks 1 to 60 against five season
ids and requires all three layers to resolve for each — a rank that renders nothing fails the build.

### Where the files come from

`pnpm sync-heraldry` copies the sixteen PNGs out of a sibling `micro-aetherholm-assets` checkout
into `public/art/heraldry/`, writes the generated catalogue `src/art/heraldry.ts`, and writes
`public/art/heraldry/MANIFEST.json` — **the sixteen manifest entries verbatim, with the AI
disclosure and the licence**. The art is AI-generated; the disclosure is served beside the pictures
rather than summarised by the code that displays them, which is how `micro-aetherholm-web` serves
its whole manifest for all 101. The FLUX prompt of every image is about 2.5 kB and stays out of the
bundle.

`pnpm sync-heraldry:check` fails if the committed files are stale. CI checks the set out and
`test/heraldry.test.ts` compares the pictures **byte for byte** against it — "copied once" is not a
property that stays true — and the image job curls four of them, requires a **404** for one that is
not there, and checks the `immutable` header. Without `location /art/` in `nginx.conf`, a missing
picture would fall through to the app shell with a 200 and anything probing the URL would be told
the file is fine.

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
| `worlds` | **this bundle** | `worlds` | 3001 | `ui/packages/ui/src/surfaces.ts` |
| `api` | **`micro-worlds`**, on the public API host | `api` | 4020 | `ui/packages/ui/src/surfaces.ts`, the `api` row. **Not `worlds-api`** — that hostname was folded into this one, never had a DNS record, and its registry row was deleted on 2026-08-05; see "the registry outage" below |

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

### `micro-worlds` must be started on 4020, and here is why

```bash
PORT=4020 pnpm --dir ../worlds dev
```

The surface registry gives `api` **devPort 4020** (`ui/packages/ui/src/surfaces.ts`, the `api` row).
`micro-worlds` binds **4000**: `worlds/src/env.ts` defaults `PORT` to 4000 and
`worlds/.env.example` sets it to 4000. Under `pnpm dev` the registry value is the one this bundle
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

`POST /v1/titles` (`worlds/src/server.ts`) is the only writer of the `titles` table and it
requires `worlds:admin` or `role:admin`. No service calls it on boot, no migration seeds
it, and no deploy step inserts a row. **A freshly deployed Forge Worlds knows about no titles at
all.**

An empty list here is a **200 and a true answer**, not a page that has not finished loading. The
front page says exactly that and then states the gap.

*What would close it:* each title service registers itself on boot. `registerTitle` is idempotent on
the slug (`worlds/src/titles.ts`) precisely so "a deploy that re-registers its title on every
boot — which is the obvious way for a title to declare itself — produces one row rather than a
conflict an operator has to go and clear". Or an operator registers it once with an admin token.

### 2. No title implements the provisioning side of the bridge

`worlds` makes exactly two calls into a title service:

* `GET /v1/title` — `worlds/src/titleclient.ts`
* `POST /v1/provision` — `worlds/src/titleclient.ts`

**Neither `micro-emberkin` nor `micro-nda` serves either.** Both route tables were read:
`emberkin/src/server.ts` registers ten routes, `nda/src/server.ts` thirty-two across
`define` and `defineMutation`; neither path appears in either. They
integrate in the **achievement direction only** — they call `worlds`; `worlds` cannot ask them for
anything.

**The bridge itself is complete and correct.** `driveProvision` reads the registered title's declared
capabilities and refuses *before* making the call (`worlds/src/provisioning.ts`): "Asked
BEFORE the call rather than discovered from a 404. A title that cannot do this is a catalogue
mistake, and it deserves a row that says so." So the outcome is a terminal `unsupported` row carrying
a readable sentence, not a blind 404 and not a silent retry loop.

**But a private-world entitlement still ends as a row, not a world.** A customer paid, the estate
recorded it, and nothing was raised. `/entitlements/:id` renders that row with the service's own
`lastError` **verbatim** and no retry control — the treatment `micro-admin-web` gives an action with
no executor (`admin-web/src/lib/catalogue.ts`), for the same reason: a disabled button reads as
"not yet" and gets clicked at.

*What would close it:* a title serves `GET /v1/title` and `POST /v1/provision`, honouring the
entitlement id as its idempotency key in both the `Idempotency-Key` header and the body
(`worlds/src/titleclient.ts`), and passes `worlds/src/conformance.ts`.

`test/worlds.test.ts` re-checks this claim against the real repositories on every CI run and **fails
if it ever stops being true** — this app must not go on telling somebody their purchase cannot be
delivered after it can.

### 3. There is still no operator view of failed provisions

`worlds/src/server.ts` calls it "the fifth of the six missing pieces: there is no view of
failed rentals anywhere in the estate today." `GET /v1/provisions` already serves an administrator the
whole backlog, and `POST /v1/provisions/:id/retry` is the only way out of `failed`.

**This repository deliberately does not close it.** It is a player product; an operator's escape
hatch belongs in `micro-admin-web`, and a player app growing one is how the console ends up spread
across six repositories. Recorded here so the omission is a decision rather than an oversight.

## Defects found in other repositories

Reported, not fixed — none of them blocks this repository.

1. **`micro-ui`: the API surface's devPort is an allocation, not a fact.** The registry gives `api`
   devPort 4020; `micro-worlds` binds 4000 (`worlds/src/env.ts`, `worlds/.env.example`).
   This is the **fifth** instance of the same defect class — `foresight` carried beacon's 4011, `emberkin` carried 3014 while binding 4100,
   `admin` carried 3002 while `admin-api` binds 4014, `create` carries 4004 while `mint` binds 4000.
   `ui/packages/ui/src/surfaces.test.ts` pins only surfaces whose service binds a
   *distinctive* port, and 4000 is the service-template default half the estate shares — so the
   entry genuinely is an allocation, and what is missing is anything that makes it true. Handled
   here the way `micro-mint-web` handled its own: the README says `PORT=4020 pnpm dev`, in one line,
   next to the citation. It costs nothing in production, where `api.<apex>` is a gateway hostname
   that routes to `worlds:4000` by path prefix; there is no gateway in front of `pnpm dev`.

2. **`micro-deploy`: `/v1/seasons` is routed nowhere.**
   `deploy/gateway/dynamic/public-api.yml` matches `PathPrefix('/v1/titles')`,
   `PathPrefix('/v1/players')` and `PathPrefix('/v1/provisions')` for worlds, and *not*
   `/v1/seasons`. So `GET /v1/seasons/:id/budget` (`worlds/src/server.ts`) and
   `POST /v1/seasons/:id/rewards` fall to that file's catch-all router and are
   blackholed to `http://127.0.0.1:1`. The second of those is how a **title service
   pays a season reward** — so on the current gateway configuration, no title can be paid through
   the public host at all. This client declines both routes for independent reasons, so it is not
   blocked; the reward path is a real hole.

3. **FIXED HERE ON 2026-08-05 — this bundle called a hostname that does not exist.**
   `src/lib/hosts.ts` was `export const API_SURFACE: SurfaceKey = 'worlds-api'`, and
   `worlds-api.<apex>` **has no DNS record on either network**. So every request this bundle made
   died in the resolver with `ERR_NAME_NOT_RESOLVED` while the page itself kept answering 200, and
   **the title registry did not load**. The owner found it by opening the product; no test did.

   The rename this file used to cite as pending went **the other way**: `worlds-api.` was retired
   and folded INTO `api.`, rather than the API being renamed away from `api.`. `api.` is the name a
   third party would be given, so it is the one that survived. Measured on 2026-08-05:

   ```
   worlds.cloudsforge.online/                -> 200   (the bundle: served throughout the outage)
   api.cloudsforge.online/v1/titles          -> 200 application/json
   api-testnet.cloudsforge.online/v1/titles  -> 200 application/json
   worlds-api.cloudsforge.online             -> no DNS record
   worlds-api-testnet.cloudsforge.online     -> no DNS record
   ```

   `API_SURFACE` is now `'api'`. Note that a gateway router for `worlds-api.` **did** exist at the
   time (`estate-web.yml`, `cf-api-worlds-api`) — a router is not reachability, and reading the
   gateway config alone gave the wrong answer. `test/api-host-resolves.test.ts` resolves the name
   for real and drives the live endpoint, because every existing test either compared the host to a
   string or stubbed `fetch`.

   **Closed out on 2026-08-05.** The rest of the estate has caught up: the `cf-api-worlds-api`
   router is deleted, both tunnel ingress entries are gone, and `micro-ui` no longer carries the
   `worlds-api` row at all — so `SurfaceKey` would now reject the old value and this cannot be
   reverted by accident.

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

`pnpm test` — **402 tests across 18 files**, of which 401 run and 1 skips itself when a sibling
checkout is absent (CI checks the siblings out and requires the skip not to happen). Measured
2026-08-10; the line said "285 across 12, no DOM" and all three had gone stale — the journey tier
in `test/dom.ts` brought a document in deliberately, and its own header argues the case.

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
| `heraldry.test.ts` | **the reward the platform mints has a picture.** The URN template read out of `worlds/src/heraldry.ts`; every rank from 1 to 60 against five season ids resolves all three layers; the four crest tiers and the clamp above them; a field and charge stable per season and shared across its ranks; the sixteen pictures byte-identical to the asset set and on disk; nothing under `/art/` that the catalogue does not name; the disclosure served beside them; and the inventory page really importing it |
| `api.test.ts`, `obs.test.ts`, `resource.test.ts`, `no-build-time-config.test.ts` | the inherited infrastructure, unweakened |

### The shape check, and why it is not a prefix check

`micro-market`'s guard matched `path.startsWith(servedPrefix)` and would have passed two genuinely
dead paths because they *began* with a served prefix — `micro-mint` then shipped exactly that defect.
Worse, a `${scope}` helper standing for two segments collapsed a path so it matched an entirely
*different* route and was reported fine. `matchesShape` in `test/worlds.test.ts` is copied from the
corrected form at `market/src/indexerclient.test.ts`: same segment count, every segment
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
