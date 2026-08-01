/**
 * Where this bundle talks to, and how it decides.
 *
 * The rule the whole file exists to keep: NOTHING here is a build-time constant. Every host is
 * derived from `window.location` on the call, so one image serves localhost, a preview deployment
 * and production — and the tests install different windows to prove it rather than trusting a
 * comment.
 *
 * The second thing under test is that this app uses TWO surface keys — `worlds` for what it is and
 * `worlds-api` for what it calls — because the registry declares two surfaces. Every other
 * frontend in the estate uses one, so this is the property most likely to be "simplified" back
 * into a single key by somebody who has only read the others.
 *
 * The third is the dev-port disagreement, asserted as a FACT rather than fixed with a literal: the
 * registry gives `worlds-api` 4002 and `micro-worlds` binds 4000 (`worlds/src/env.ts:171`,
 * `worlds/.env.example:38`). See the header of src/lib/hosts.ts.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { SURFACES, cloudsforgeHosts, type CloudsForgeHosts } from '@cloudsforge/ui'
import {
  API_SURFACE,
  APP_NAME,
  PRODUCT,
  apiBase,
  isLocal,
  isRegisteredPlacement,
  resolveApiBase,
} from '../src/lib/hosts.ts'
import { installWindow, removeWindow } from './browser-stubs.ts'

afterEach(removeWindow)

/**
 * A file in this repository, as text.
 *
 * vite.config.ts and app.tsx are READ rather than imported: the first pulls in a Vite plugin and
 * the second the whole React tree, and this suite deliberately has no DOM.
 */
const read = (file: string): string => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/** The production host table, as `cloudsforgeHosts()` derives it from an apex hostname. */
function production(): CloudsForgeHosts {
  installWindow('https://worlds.cloudsforge.online/')
  const hosts = cloudsforgeHosts()
  removeWindow()
  return hosts
}

describe('the surface this app IS', () => {
  it('is the worlds surface, which is what the switcher marks current', () => {
    assert.equal(PRODUCT, 'worlds')
  })

  it('is registered as a product, in the switcher, with its own subdomain', () => {
    const surface = SURFACES.find((s) => s.key === PRODUCT)
    assert.ok(surface, 'worlds is not in the surface registry')
    assert.equal(surface.kind, 'product')
    assert.equal(surface.inSwitcher, true)
    assert.equal(surface.subdomain, 'worlds')
    assert.equal(surface.name, 'Forge Worlds')
  })

  it('reports a name to the observability ingest that names the bundle, not the product', () => {
    // Lantern groups on it, and "worlds" is the surface while "worlds-web" is the artefact that
    // threw. An error report that cannot name the bundle cannot be pinned to a deploy.
    assert.equal(APP_NAME, 'worlds-web')
  })
})

describe('the surface this app CALLS is a different one, and that is deliberate', () => {
  it('is worlds-api, which the registry describes as the game platform API', () => {
    assert.equal(API_SURFACE, 'worlds-api')
    const surface = SURFACES.find((s) => s.key === API_SURFACE)
    assert.ok(surface, 'worlds-api is not in the surface registry')
    assert.equal(surface.subdomain, 'worlds-api')
    // Not in the switcher: it is a host, not a destination.
    assert.equal(surface.inSwitcher, false)
  })

  it('is NOT the same key as the product, so a simplification to one key fails here', () => {
    assert.notEqual(PRODUCT, API_SURFACE)
  })

  it('is not the `api` surface, which the registry says is being renamed away from this role', () => {
    // `ui/packages/ui/src/surfaces.ts:480-483`: "`api.` still points at the game API, which is
    // renamed to `worlds-api.` first." Resolving against `api` would work today and break silently
    // on the day of the rename.
    assert.notEqual(API_SURFACE, 'api')
  })
})

describe('the API base is an origin comparison, never a flag', () => {
  const hosts = production()

  it('is absolute in production, because the bundle and the API are two hosts', () => {
    assert.equal(
      resolveApiBase('https://worlds.cloudsforge.online', hosts, API_SURFACE),
      'https://worlds-api.cloudsforge.online',
    )
  })

  it('would be relative if they ever shared an origin, which is why the comparison is kept', () => {
    // Nothing in the estate does this today. The branch exists so that a deploy which puts the
    // bundle and the service behind one origin needs no code change to stop sending absolute URLs.
    assert.equal(resolveApiBase('https://worlds-api.cloudsforge.online', hosts, API_SURFACE), '')
  })

  it('is absolute when there is no page origin at all', () => {
    // With nothing to resolve a relative URL against, the absolute form is the only right answer.
    assert.equal(resolveApiBase('', hosts, API_SURFACE), hosts[API_SURFACE])
  })

  it('resolves from the window on every call, so one image serves every environment', () => {
    installWindow('https://worlds.cloudsforge.online/entitlements')
    assert.equal(apiBase(), 'https://worlds-api.cloudsforge.online')
    removeWindow()

    installWindow('http://localhost:3001/entitlements')
    assert.match(apiBase(), /^http:\/\/localhost:\d+$/)
  })
})

describe('the dev port disagreement, recorded rather than papered over', () => {
  /**
   * A hard-coded host would be a second, unversioned copy of the registry, and the copy is the one
   * that goes stale — so this app resolves 4002 and the README tells a developer to start worlds on
   * it. The test pins BOTH halves so the day either moves, this fails and names the other.
   *
   * This is the FIFTH instance of the same defect class: `foresight` carried beacon's 4011,
   * `emberkin` carried 3014 while binding 4100, `admin` carried 3002 while `admin-api` binds 4014,
   * and `create` carries 4004 while `mint` binds 4000.
   */
  it('the registry gives worlds-api devPort 4002', () => {
    assert.equal(SURFACES.find((s) => s.key === 'worlds-api')?.devPort, 4002)
  })

  it('and this app therefore calls 4002 on localhost, which is what the README explains', () => {
    installWindow('http://localhost:3001/')
    assert.equal(apiBase(), 'http://localhost:4002')
  })

  it('the vite dev port is the registry’s number for THIS bundle, not for the API', () => {
    // The registry's `worlds` devPort names where the bundle is served; `worlds-api`'s names where
    // the API answers. admin-web had to draw this distinction after its own entry was read as the
    // latter. Both halves are pinned so that confusing them again fails here.
    const vite = /server:\s*\{\s*port:\s*(\d+)/.exec(read('vite.config.ts'))
    assert.ok(vite, 'vite.config.ts declares no dev server port')
    assert.equal(Number(vite[1]), SURFACES.find((s) => s.key === 'worlds')?.devPort)
    assert.notEqual(Number(vite[1]), SURFACES.find((s) => s.key === 'worlds-api')?.devPort)
  })

  it('src/lib/hosts.ts names no literal port or hostname', () => {
    // The whole point of reporting the disagreement rather than fixing it locally.
    const hosts = read('src/lib/hosts.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
      .join('\n')
    assert.doesNotMatch(hosts, /localhost:\d+/, 'a literal dev host in the code')
    assert.doesNotMatch(hosts, /cloudsforge\.online/, 'a literal production host in the code')
  })
})

describe('local development is exempt, in exactly the four names cloudsforgeHosts() exempts', () => {
  it('treats the four as local', () => {
    for (const hostname of ['', 'localhost', '127.0.0.1', 'dev.local']) {
      assert.equal(isLocal(hostname), true, hostname)
    }
  })

  it('treats a real hostname as not local', () => {
    for (const hostname of ['worlds.cloudsforge.online', 'example.test', 'localhost.evil.test']) {
      assert.equal(isLocal(hostname), false, hostname)
    }
  })
})

describe('the placement warning', () => {
  const hosts = production()

  it('accepts this surface’s own origin', () => {
    assert.equal(
      isRegisteredPlacement('https://worlds.cloudsforge.online', 'worlds.cloudsforge.online', hosts),
      true,
    )
  })

  it('accepts localhost, where there is no apex to get wrong', () => {
    assert.equal(isRegisteredPlacement('http://localhost:3001', 'localhost', hosts), true)
  })

  it('flags an address the registry does not know', () => {
    // An unknown prefix is left alone, so the whole name becomes the apex and every derived host —
    // the worlds API, the account portal — resolves one level too deep.
    assert.equal(
      isRegisteredPlacement('https://preview-7.example.test', 'preview-7.example.test', hosts),
      false,
    )
  })

  it('flags another surface’s origin, including the API host it calls', () => {
    assert.equal(
      isRegisteredPlacement('https://hub.cloudsforge.online', 'hub.cloudsforge.online', hosts),
      false,
    )
    // Compared against PRODUCT, not API_SURFACE: `worlds-api` is a host this bundle CALLS and never
    // a host it is SERVED from, so a bundle answering there is misplaced.
    assert.equal(
      isRegisteredPlacement(
        'https://worlds-api.cloudsforge.online',
        'worlds-api.cloudsforge.online',
        hosts,
      ),
      false,
    )
  })

  it('warns rather than refusing, because this surface has public pages worth serving', () => {
    // The opposite of admin-web, which refuses to render at all. Asserted so the difference stays a
    // decision: a product page that blanks itself on a preview deployment is worse than one that
    // says where it is.
    const app = read('src/app.tsx')
    assert.doesNotMatch(app, /MisplacedBundle/, 'this surface must not refuse to render')
    assert.match(app, /unregistered/, 'the placement must still be passed to the shell')
  })
})
