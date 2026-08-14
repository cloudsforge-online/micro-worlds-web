/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE COVERS ARE DERIVATIVES, AND A DERIVATIVE IS A CLAIM ABOUT A FILE SOMEWHERE ELSE.
 *
 * `src/art/heraldry.ts` is proved by byte-identity: the sixteen files here must equal the sixteen
 * in `micro-aetherholm-assets`, and nothing else is allowed. The two covers under `/art/titles/`
 * cannot pass that test and must not pretend to — they are 65 kB JPEGs re-encoded from 800 kB
 * PNGs, because the register that lists every game on the platform is the first thing a visitor
 * loads.
 *
 * So the claim these tests defend is the weaker true one instead of the stronger false one: the
 * SOURCE still exists, still has the checksum the catalogue recorded, and the derivative is on
 * disk, is served from `/art/titles/`, and is small enough to have actually been re-encoded. A
 * cover swapped for a hand-edited one, or a source regenerated under the same filename, fails
 * here rather than drifting silently for a year.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { TITLE_ART, TITLE_ART_DERIVATION, titleArt } from '../src/art/titles.ts'
import { DESCRIBED_SLUGS, cardFor } from '../src/lib/catalogue.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
const at = (rel: string) => join(here, '..', rel)
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('the title covers', () => {
  it('serves every path from /art/titles/, and none from the asset set it came from', () => {
    for (const entry of TITLE_ART) {
      assert.ok(entry.path.startsWith('/art/titles/'), `${entry.path} is not served from /art/titles/`)
      assert.ok(!entry.path.includes('/assets/'), `${entry.path} kept the asset-set prefix`)
    }
  })

  it('holds every picture the catalogue names', () => {
    const missing = TITLE_ART.filter((e) => !existsSync(at(`public${e.path}`))).map((e) => e.path)
    assert.deepEqual(missing, [], `catalogued but not on disk: ${missing.join(', ')}`)
  })

  it('serves a cover a register can afford — the source PNG is a dozen times the size', () => {
    // The whole reason these are derivatives. If somebody replaces one with the source, the page
    // gets a megabyte heavier and nothing else says so.
    for (const entry of TITLE_ART) {
      const bytes = statSync(at(`public${entry.path}`)).size
      assert.ok(bytes < 200_000, `${entry.path} is ${bytes} bytes; a cover in the register must be small`)
      assert.ok(bytes > 5_000, `${entry.path} is ${bytes} bytes; that is not a photograph`)
    }
  })

  it('still matches the source it was derived from, checksum and all', () => {
    for (const entry of TITLE_ART) {
      const setRoot = at(`../${entry.sourceRepo.replace(/^micro-/, '')}`)
      if (!existsSync(setRoot)) {
        console.log(`UNCHECKED: ${entry.sourceRepo} is not checked out; ${entry.slug}'s source not compared`)
        continue
      }
      const source = join(setRoot, entry.sourceFile)
      assert.ok(existsSync(source), `${entry.sourceRepo} no longer holds ${entry.sourceFile}`)
      assert.equal(
        sha256(readFileSync(source)),
        entry.sourceSha256,
        `${entry.sourceRepo}/${entry.sourceFile} has changed since ${entry.path} was derived from it`,
      )
    }
  })

  it('carries the disclosure and the licence beside the pictures, and says what the re-encode lost', () => {
    // The estate's rule for AI art: the disclosure travels with the images, not with the code
    // that displays them. These two need one more sentence than the heraldry set, because
    // re-encoding drops the C2PA chunk and the invisible watermark.
    const served = JSON.parse(readFileSync(at('public/art/titles/MANIFEST.json'), 'utf8')) as {
      disclosure: string
      licence: string
      derivation: string
      assets: readonly { path: string; sourceSha256: string; c2pa: string }[]
    }
    assert.match(served.disclosure, /AI-generated/i)
    assert.match(served.disclosure, /derivative/i)
    assert.ok(served.licence.length > 0)
    assert.equal(served.derivation, TITLE_ART_DERIVATION)
    for (const entry of TITLE_ART) {
      const row = served.assets.find((a) => a.path === entry.path)
      assert.ok(row, `${entry.path} is catalogued but the served manifest does not list it`)
      assert.equal(row.sourceSha256, entry.sourceSha256, `${entry.path}'s manifest and catalogue disagree`)
      assert.match(row.c2pa, /not retained/i)
    }
    assert.equal(served.assets.length, TITLE_ART.length)
  })

  it('is reached only through the catalogue, which joins it to a described title', () => {
    // The join is the point: `src/lib/catalogue.ts` writes no `/art/` path, so a re-encode at a
    // different name changes one file. This asserts the join actually produces the cover.
    for (const entry of TITLE_ART) {
      assert.ok(DESCRIBED_SLUGS.includes(entry.slug), `${entry.slug} has a cover but no card describing it`)
      assert.equal(cardFor(entry.slug)?.art, entry.path)
    }
    assert.equal(titleArt('ninety-days-after'), null)
    assert.equal(cardFor('ninety-days-after')?.art, null)
  })
})
