/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE GAME'S OWN PICTURES, AND THE STRONGER OF THE TWO CLAIMS THIS REPOSITORY MAKES ABOUT ART.
 *
 * `test/titles.test.ts` defends a weak-but-true claim about the three covers: they are re-encoded
 * derivatives, so all that can be proved here is that the SOURCE still exists with the checksum
 * recorded beside it. These fourteen are different — `ninety-days-after`'s own `art/build.mjs`
 * already derives exactly what a browser should be sent, so this repository copies those files
 * rather than re-deriving them, and byte-identity is provable the way `src/art/heraldry.ts`'s is.
 *
 * What that buys: a tile hand-edited here, or one regenerated upstream under the same name, fails
 * on the next run instead of drifting for a year. What it costs: nothing, because the alternative
 * was a second set of pixels with the same provenance and no way to tell which was current.
 *
 * ── AND THE SET MUST BE TOTAL, NOT MERELY CORRECT ─────────────────────────────────────────────
 *
 * A map with five terrains drawn and one blank is worse than a map with none: the blank reads as
 * a rendering fault rather than as ground. So the six terrains and the six resources are checked
 * against `src/lib/nda.ts`'s own lists — the ones mirrored from `nda/src/rules.ts` — rather than
 * against a copy written here.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import {
  NDA_ART,
  NDA_ART_DERIVATION,
  NDA_ART_DIR,
  NDA_ART_SET,
  NDA_EMBLEM,
  NDA_WORDMARK,
  resourceArt,
  terrainArt,
} from '../src/art/nda.ts'
import { RESOURCES, type Terrain } from '../src/lib/nda.ts'
import { BASE } from '../src/lib/routes.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
const at = (rel: string) => join(here, '..', rel)
const read = (rel: string) => readFileSync(at(rel), 'utf8')
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

/** `Terrain` is a union rather than a runtime list; this is the exhaustive one, checked below. */
const TERRAINS: readonly Terrain[] = [
  'wilderness',
  'forest',
  'ruins',
  'water',
  'road',
  'homestead',
]

describe('the Ninety Days After art set', () => {
  it('serves every path from /art/nda/, and none from the repository it was copied out of', () => {
    for (const entry of NDA_ART) {
      assert.ok(entry.path.startsWith('/art/nda/'), `${entry.path} is not served from /art/nda/`)
      assert.ok(!entry.path.includes('/assets/'), `${entry.path} kept the source prefix`)
    }
  })

  it('holds every picture the catalogue names', () => {
    const missing = NDA_ART.filter((e) => !existsSync(at(`public${e.path}`))).map((e) => e.path)
    assert.deepEqual(missing, [], `catalogued but not on disk: ${missing.join(', ')}`)
  })

  it('names each picture once, and each key once', () => {
    const keys = NDA_ART.map((e) => e.key)
    const paths = NDA_ART.map((e) => e.path)
    assert.equal(new Set(keys).size, keys.length, 'a key is catalogued twice')
    assert.equal(new Set(paths).size, paths.length, 'a path is catalogued twice')
  })

  it('draws all six terrains and all six resources — a blank tile reads as a fault', () => {
    /*
     * `terrainArt`/`resourceArt` return BROWSER URLs and this bundle is served from `<apex>/worlds`,
     * so each one carries the mount and the file it names is `public/` plus the rest. `onDisk()`
     * asserts the mount first: without it these URLs resolved at the apex root and every tile on the
     * board was blank in production, while this test passed because it checked the unmounted string
     * against the file it came from. See `test/heraldry.test.ts` for the same pairing.
     */
    const onDisk = (url: string, what: string): void => {
      assert.ok(url.startsWith(`${BASE}/`), `${what} is not served from ${BASE}: ${url}`)
      assert.ok(existsSync(at(`public${url.slice(BASE.length)}`)), `${what} is not on disk`)
    }
    for (const terrain of TERRAINS) {
      const path = terrainArt(terrain)
      assert.ok(path, `${terrain} has no picture`)
      onDisk(path, `${terrain}'s picture`)
    }
    for (const resource of RESOURCES) {
      const path = resourceArt(resource)
      assert.ok(path, `${resource} has no icon`)
      onDisk(path, `${resource}'s icon`)
    }
    // The other direction. A seventh terrain picture with no terrain to attach to is dead weight
    // that looks like coverage.
    const terrainKeys = NDA_ART.filter((e) => e.key.startsWith('terrain:')).map((e) => e.key)
    const resourceKeys = NDA_ART.filter((e) => e.key.startsWith('resource:')).map((e) => e.key)
    assert.deepEqual([...terrainKeys].sort(), TERRAINS.map((t) => `terrain:${t}`).sort())
    assert.deepEqual([...resourceKeys].sort(), RESOURCES.map((r) => `resource:${r}`).sort())
    assert.ok(NDA_WORDMARK.endsWith('.webp') && NDA_EMBLEM.endsWith('.webp'))
  })

  it('ships a tile a phone can afford — the master is four hundred times the size', () => {
    // A 24x24 map is 576 of these on screen at once. The masters are 2–3 MB each; if somebody
    // swaps one back in, the map costs a gigabyte and nothing else says so.
    for (const entry of NDA_ART) {
      const bytes = statSync(at(`public${entry.path}`)).size
      const ceiling = entry.key === 'wordmark' ? 60_000 : 20_000
      assert.ok(bytes < ceiling, `${entry.path} is ${bytes} bytes; that is not a derived file`)
      assert.ok(bytes > 800, `${entry.path} is ${bytes} bytes; that is not a picture`)
    }
  })

  it('is byte-identical to the game repository, which is where the art lives', () => {
    const setRoot = at(`../${NDA_ART_SET}`)
    if (!existsSync(setRoot)) {
      console.log(`UNCHECKED: ${NDA_ART_SET} is not checked out; nda art bytes not compared`)
      return
    }
    for (const entry of NDA_ART) {
      const there = join(setRoot, NDA_ART_DIR, entry.sourceFile)
      assert.ok(existsSync(there), `${NDA_ART_SET} no longer holds ${entry.sourceFile}`)
      const bytes = readFileSync(there)
      assert.equal(sha256(bytes), entry.sha256, `${entry.sourceFile} has changed upstream`)
      assert.ok(
        readFileSync(at(`public${entry.path}`)).equals(bytes),
        `${entry.path} has drifted from ${NDA_ART_SET}`,
      )
      // The thread back to provenance. The served file is a derivative of a derivative, so the
      // master has to still be there for the C2PA claim in the manifest to mean anything.
      assert.ok(
        existsSync(join(setRoot, entry.masterFile)),
        `${entry.masterFile} is gone; ${entry.path} descends from nothing`,
      )
    }
  })

  it('carries the disclosure beside the pictures, and says where the provenance was lost', () => {
    const served = JSON.parse(read('public/art/nda/MANIFEST.json')) as {
      disclosure: string
      licence: string
      derivation: string
      sourceRepo: string
      sourceDir: string
      assets: readonly { key: string; path: string; sha256: string; masterFile: string }[]
    }
    assert.match(served.disclosure, /AI-generated/i)
    // The one sentence this manifest needs that the heraldry set's does not: the watermark was
    // dropped UPSTREAM, in the game's own art build, not by anything this repository did.
    assert.match(served.disclosure, /derived from them upstream/i)
    assert.ok(served.licence.length > 0)
    assert.equal(served.derivation, NDA_ART_DERIVATION)
    assert.equal(served.sourceRepo, NDA_ART_SET)
    assert.equal(served.sourceDir, NDA_ART_DIR)
    for (const entry of NDA_ART) {
      const row = served.assets.find((a) => a.path === entry.path)
      assert.ok(row, `${entry.path} is catalogued but the served manifest does not list it`)
      assert.equal(row.sha256, entry.sha256, `${entry.path}'s manifest and catalogue disagree`)
      assert.equal(row.masterFile, entry.masterFile)
    }
    assert.equal(served.assets.length, NDA_ART.length)
  })
})

describe('the game screens actually draw it', () => {
  /**
   * The failure this exists to catch is the one that already happened once in this estate: a
   * complete, correct catalogue that no screen imports. See `test/heraldry.test.ts`.
   */
  it('is imported by the two screens that render the game', () => {
    assert.match(read('src/pages/world.tsx'), /from '\.\.\/art\/nda\.ts'/)
    assert.match(read('src/pages/play.tsx'), /from '\.\.\/art\/nda\.ts'/)
  })

  it('hands the map its tiles as custom properties, because the stylesheet may not spell a path', () => {
    /*
     * `test/heraldry.test.ts` forbids an `/art/` path anywhere in `src` outside `src/art/`, and it
     * checks `.css` as well as `.ts`. So the six tile images cannot be written into `styles.css`
     * as `url(...)`; the page sets them on the grid element and the stylesheet reads them. This
     * asserts both halves, because either one alone leaves the map blank.
     */
    const page = read('src/pages/world.tsx')
    assert.match(page, /--ww-tile-/, 'the page no longer hands the stylesheet its tile images')
    const css = read('src/styles.css')
    assert.match(css, /var\(--ww-tile-/, 'the stylesheet no longer reads the tile images')
    assert.doesNotMatch(css, /url\(\/art\//, 'the stylesheet spells an /art/ path by hand')
  })
})
