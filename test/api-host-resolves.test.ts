/**
 * The API hostname this bundle calls must be a name that EXISTS.
 *
 * ── WHY THIS FILE IS NOT `assert.equal(API_SURFACE, 'api')` ───────────────────────────────────
 *
 * On 2026-08-05 the title registry did not load in Forge Worlds. `API_SURFACE` was `'worlds-api'`,
 * a hostname that had been retired and had NO DNS RECORD on either network, so every request the
 * bundle made died in the resolver. The page itself answered 200 throughout — it is a static
 * bundle and it never needed the API to be served — so nothing that checked the product's HTTP
 * status saw anything wrong. **The owner found it by opening the product.** No test did.
 *
 * Every test that could have caught it and didn't, and why:
 *
 *   * `hosts.test.ts` asserted the resolved base equalled `https://worlds-api.cloudsforge.online`.
 *     That is a string comparison against the same registry the bug was in. It was GREEN while the
 *     product was down, and it would have stayed green if the hostname had been `nonsense.invalid`.
 *   * `api.test.ts`, `worlds.test.ts` and every other suite here call `installFetch`
 *     (`test/browser-stubs.ts`), which replaces `globalThis.fetch` with a handler that answers from
 *     a fixture. A stubbed fetch cannot fail to resolve a name. This is the estate's house rule —
 *     **test the seam, not the mock** — and this file is the seam for host resolution.
 *   * Reading `deploy/gateway/dynamic/*.yml` would ALSO have said the host was fine: a Traefik
 *     router `cf-api-worlds-api` matching `Host(worlds-api{CF_WEB_SUFFIX})` existed at the time.
 *     **A router is not reachability.** Traefik matches a `Host()` on requests that ARRIVE, and
 *     none arrive at a name with no `A` record. Any check that reads config rather than doing a
 *     lookup reaches the wrong conclusion here, which is why this one resolves the name for real.
 *     That router has since been deleted, so config and DNS finally agree — but the lesson stands
 *     and this file still does the lookup, because the next disagreement will not announce itself.
 *
 * So this file stubs nothing. It asks the resolver, then it drives `listTitles()` — the app's own
 * function, through its own `apiBase()` and its own `request()` — against the live gateway.
 *
 * ── OFFLINE IS SKIPPED, AND CALIBRATED RATHER THAN ASSUMED ────────────────────────────────────
 *
 * A test that needs the network is worthless if it goes red on a train, and dishonest if it goes
 * green there. So each case first resolves the host this bundle is SERVED from — `worlds.<apex>`,
 * a name that is not under test and whose absence means the resolver itself is unreachable. If the
 * control does not resolve, there is no network and the case skips. If the control resolves and
 * the API host does not, that is the defect, and it is not skippable — which is exactly the state
 * the estate was in.
 *
 * `GET /v1/titles` is unauthenticated by design (`worlds/src/server.ts:507` has no
 * `authenticate` call; see the table at the top of src/lib/worlds.ts), so this needs no credential
 * and prints none.
 */
import assert from 'node:assert/strict'
import { lookup } from 'node:dns/promises'
import { afterEach, describe, it } from 'node:test'
import { API_SURFACE, PRODUCT, apiBase, hosts } from '../src/lib/hosts.ts'
import { listTitles } from '../src/lib/worlds.ts'
import { installWindow, removeWindow } from './browser-stubs.ts'

afterEach(removeWindow)

/** Both networks the estate serves. The testnet fault was identical and separately measured. */
const NETWORKS = [
  { label: 'mainnet', page: 'https://worlds.cloudsforge.online/' },
  { label: 'testnet', page: 'https://worlds-testnet.cloudsforge.online/' },
] as const

/** Whether a hostname has an address record. The whole point of the file: no stub, no config. */
async function resolves(hostname: string): Promise<boolean> {
  try {
    await lookup(hostname)
    return true
  } catch {
    return false
  }
}

/** The hostname part of a base URL, which is what the resolver is asked about. */
const hostnameOf = (base: string): string => new URL(base).hostname

for (const network of NETWORKS) {
  describe(`the API host on ${network.label}`, () => {
    /** The two names, derived through the app's own resolution rather than written out here. */
    function names(): { product: string; api: string } {
      installWindow(network.page)
      const product = hostnameOf(hosts()[PRODUCT])
      const api = hostnameOf(apiBase())
      removeWindow()
      return { product, api }
    }

    it('is a hostname that resolves', async (t) => {
      const { product, api } = names()

      if (!(await resolves(product))) {
        t.skip(`no network: the control host ${product} does not resolve either`)
        return
      }

      assert.ok(
        await resolves(api),
        `${api} has no DNS record, so every request this bundle makes fails in the resolver ` +
          `while ${product} keeps serving the page. API_SURFACE is '${API_SURFACE}' ` +
          `(src/lib/hosts.ts). This is the 2026-08-05 registry outage exactly.`,
      )
    })

    it('is routed: the registry request reaches a service rather than dying in transport', async (t) => {
      const { product } = names()

      if (!(await resolves(product))) {
        t.skip(`no network: the control host ${product} does not resolve either`)
        return
      }

      installWindow(network.page)
      try {
        const url = `${apiBase()}/v1/titles`

        // Unintercepted, and deliberately the raw fetch rather than `listTitles()` here: this
        // assertion needs to tell a TRANSPORT failure apart from an HTTP answer, and the app's
        // error type flattens the two into one message.
        let res: Response
        try {
          res = await fetch(url)
        } catch (err) {
          // No response at all. This is the outage signature — `ERR_FAILED` in the browser — and
          // it is what a retired hostname, a dead router or a wrong surface key all produce.
          assert.fail(
            `${url} produced no HTTP response at all: ` +
              `${err instanceof Error ? err.message : String(err)}. ` +
              `That is the 2026-08-05 signature: the page serves, every request dies in transport, ` +
              `and the registry renders as failed.`,
          )
          return
        }

        // A 404 on the API host means NO GATEWAY ROUTER MATCHED. The name resolved, so the DNS
        // case above passes, but nothing serves this path — which is the other half of "targets a
        // surface that is not really there", and it is squarely this file's business.
        assert.notEqual(
          res.status,
          404,
          `${url} answered 404: the hostname resolves but no gateway router matches this path, ` +
            `so API_SURFACE ('${API_SURFACE}') is pointing somewhere nothing serves.`,
        )

        // ── WHERE THIS TEST DELIBERATELY STOPS ────────────────────────────────────────────────
        //
        // A 5xx means the request resolved, connected, matched a router and reached the service,
        // which is everything src/lib/hosts.ts is responsible for. The service then failed, and
        // that is a DIFFERENT defect with a different owner — `micro-worlds`, not this bundle.
        // Failing here would make a frontend suite go red for a backend outage and would train
        // the next person to ignore it. Service health is owned by beacon's browser smoke
        // (`beacon/src/browser/smoke.ts`, which fails on a `state--failed` node) and by status
        // monitoring. So it is reported loudly and not asserted.
        if (res.status >= 500) {
          t.diagnostic(
            `${url} answered ${res.status}: routed correctly but the service behind it is ` +
              `failing. Not this bundle's defect — see micro-worlds.`,
          )
          return
        }

        assert.equal(res.status, 200, `${url} answered ${res.status}`)

        // Now the app's OWN call, so the green path exercises apiBase() -> request() -> fetch and
        // the shape the registry actually renders from.
        const { titles } = await listTitles()
        assert.ok(
          Array.isArray(titles),
          `${url} answered 200 without a titles array; the registry cannot render`,
        )
      } finally {
        removeWindow()
      }
    })
  })
}
