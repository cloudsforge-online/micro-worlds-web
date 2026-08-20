/**
 * A sealed season's rank banner: the URN the service mints, and the picture it resolves to.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT WENT WRONG, AND WHY A COMPLETE CATALOGUE WOULD NOT HAVE CAUGHT IT.
 *
 * `micro-aetherholm-assets` generated sixteen heraldry pieces — four fields, eight charges, four
 * rank crests — FOR THIS CLIENT. They were planned against `worlds/src/heraldry.ts`, whose header
 * says "first place and fifth place are different artwork, decided by the asset pipeline later —
 * the urn is an identity, not a file path", and the set's README §5 is that decision written out:
 * gold closed laurel, blued silver open wreath, bronze circlet, iron pennon bar, "distinguished
 * on three channels at once so the tiers survive monochrome".
 *
 * `grep -rn "crest-rank\|charge-\|field-\|heraldry/" worlds/src worlds-web/src` returned NOTHING
 * (micro-org#185, measured 2026-08-10). A player who held a rank-1 banner was shown a shortened
 * URN. Nothing was broken; nothing was wired. That is the same shape as micro-org#175 and #173 —
 * everything green, nothing on screen — and the reason no test could have said so is that there
 * was no assertion anywhere that a REWARD THE PLATFORM MINTS has a picture.
 *
 * So the load-bearing test in this file is `every rank a sealed season can mint`: it walks the
 * ranks `worlds/src/heraldry.ts` actually produces and requires all three layers of a banner to
 * resolve for each one. A rank that renders nothing fails the build.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── The two halves of a banner, and why only one of them is data ─────────────────────────────
 *
 * The URN carries a season id and a rank, and nothing else. The RANK is data and picks the crest.
 * The field and the charge are ART DIRECTION picked from the season's own id, exactly the way
 * `micro-aetherholm-web`'s `islandBiome` picks a biome from an island's index — stable, so a
 * banner looks the same on every visit and to every player, and captioned as decoration rather
 * than as a claim about the season. The assertions on that caption are in here too, because the
 * moment the sentence goes the picture becomes a statement about the world.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { HERALDRY } from '../src/art/heraldry.ts'
import { TITLE_ART } from '../src/art/titles.ts'
import { NDA_ART } from '../src/art/nda.ts'
import { BASE } from '../src/lib/routes.ts'
import {
  CHARGES,
  CREST_TIERS,
  FIELDS,
  bannerFor,
  crestFor,
  heraldryPart,
  parseHeraldryUrn,
} from '../src/lib/heraldry.ts'
// @ts-expect-error — a .mjs tool with no type declarations, imported so this test re-derives the
// catalogue from the manifest rather than re-implementing the derivation and agreeing with itself.
import { HERALDRY_SET, entryFrom, heraldryAssets, render } from '../tools/sync-heraldry.mjs'

const root = new URL('../', import.meta.url)
const at = (p: string): string => fileURLToPath(new URL(p, root))
const read = (p: string): string => readFileSync(at(p), 'utf8')

interface ManifestAsset {
  readonly set: string
  readonly slug: string
  readonly name: string
  readonly path: string
}
const served = JSON.parse(read('public/art/heraldry/MANIFEST.json')) as {
  assetCount: number
  disclosure: string
  licence: string
  assets: ManifestAsset[]
}

/** A season id is a uuid — `aetherholm/src/sealing.ts` puts `season.id` on the sealed payload. */
const SEASONS = [
  '0d6a5b9e-1f2c-4a7d-9e31-6c5b4a3d2e10',
  'aa11bb22-cc33-4d44-8e55-ff6677889900',
  '7f3e2d1c-0b9a-4887-9766-554433221100',
  'ffffffff-ffff-4fff-bfff-ffffffffffff',
  '00000000-0000-4000-8000-000000000000',
]

describe('the URN the service mints', () => {
  /**
   * The template is read out of the sibling `micro-worlds` checkout rather than asserted from
   * memory, for the reason `test/worlds.test.ts` already gives about route paths: a client that
   * agrees with itself about a wire format has proved nothing. Found by SEARCHING for the
   * template, never by line — micro-trade moved seven lines once and broke every citation in the
   * estate while the routes themselves were untouched.
   */
  const candidates = [
    process.env['CLOUDSFORGE_WORLDS_DIR'],
    at('../worlds/src/heraldry.ts'),
    at('.worlds/src/heraldry.ts'),
  ].filter((v): v is string => Boolean(v))
  const service = candidates.find((p) => existsSync(p) && p.endsWith('heraldry.ts'))

  if (service === undefined) {
    it('SKIPPED: no micro-worlds checkout — CI checks one out and requires this to run', () => {
      assert.ok(true)
    })
  } else {
    const source = readFileSync(service, 'utf8')

    it('is the template this client parses', () => {
      assert.ok(
        source.includes('cf:aetherholm:heraldry:${input.seasonId}:rank:${rank}'),
        'micro-worlds no longer mints the urn this client resolves',
      )
    })

    it('numbers the ranks from one, so there is no rank zero to draw', () => {
      // `const rank = index + 1` over `input.victors.entries()`. If that ever becomes 0-based the
      // crest tiers are off by one for every victor in the estate.
      assert.match(source, /const rank = index \+ 1/)
    })

    it('is minted cross-title, which is why this platform client draws it and no game does', () => {
      assert.ok(source.includes("titleScope: '*'"))
    })
  }
})

describe('every rank a sealed season can mint has a banner', () => {
  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════════
   * THE ASSERTION THAT WOULD HAVE CAUGHT #185 ON THE DAY THE ASSET SET LANDED.
   *
   * `grantHeraldry` walks `input.victors.entries()` and mints `rank = index + 1`. The list is
   * UNBOUNDED — a season with forty ranked victors mints rank 40 — so "every declared rank" is
   * not four ranks, it is every positive integer, and the art set's answer is that rank 4 and
   * below share the iron pennon bar (README §5). This asserts the mapping is total: no rank a
   * season can produce resolves to nothing.
   * ══════════════════════════════════════════════════════════════════════════════════════════════
   */
  it('resolves all three layers for every rank from 1 to 60', () => {
    const unrendered: number[] = []
    for (let rank = 1; rank <= 60; rank += 1) {
      const banner = bannerFor(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:${rank}`)
      if (banner === null || !banner.field || !banner.charge || !banner.crest) unrendered.push(rank)
    }
    assert.deepEqual(unrendered, [], `ranks with no banner: ${unrendered.join(', ')}`)
  })

  it('resolves every rank against every season id, not just one', () => {
    const unrendered: string[] = []
    for (const season of SEASONS) {
      for (let rank = 1; rank <= 12; rank += 1) {
        const banner = bannerFor(`cf:aetherholm:heraldry:${season}:rank:${rank}`)
        if (banner === null) unrendered.push(`${season}#${rank}`)
      }
    }
    assert.deepEqual(unrendered, [], `no banner: ${unrendered.join(', ')}`)
  })

  it('points every layer at a file that is actually on disk, under the mount', () => {
    /*
     * A layer is a BROWSER URL, and this bundle is served from `<apex>/worlds` — so it carries the
     * mount, and the file it names is `public/` plus the path with the mount taken back off.
     *
     * Both halves are asserted, and the first half is the one that matters: until `heraldryPart()`
     * composed the mount, these URLs resolved at the APEX root and every banner was a broken
     * picture in production. This test passed throughout, because the unmounted string it built
     * matched the file on disk exactly — it was checking the catalogue against itself. Requiring
     * the mount is what makes it see the difference between a path and a URL.
     */
    const missing: string[] = []
    const unmounted: string[] = []
    for (const season of SEASONS) {
      for (let rank = 1; rank <= 6; rank += 1) {
        const banner = bannerFor(`cf:aetherholm:heraldry:${season}:rank:${rank}`)
        assert.ok(banner)
        for (const layer of [banner.field, banner.charge, banner.crest]) {
          if (!layer.startsWith(`${BASE}/`)) unmounted.push(layer)
          else if (!existsSync(at(`public${layer.slice(BASE.length)}`))) missing.push(layer)
        }
      }
    }
    assert.deepEqual([...new Set(unmounted)], [], `not served from ${BASE}: ${unmounted.join(', ')}`)
    assert.deepEqual([...new Set(missing)], [], `resolved but not on disk: ${missing.join(', ')}`)
  })
})

describe('the four crest tiers', () => {
  it('are the four the art set draws', () => {
    assert.equal(CREST_TIERS, 4)
  })

  it('gives ranks one, two and three a crest of their own', () => {
    assert.equal(crestFor(1), 'crest-rank1')
    assert.equal(crestFor(2), 'crest-rank2')
    assert.equal(crestFor(3), 'crest-rank3')
    assert.notEqual(crestFor(1), crestFor(2))
    assert.notEqual(crestFor(2), crestFor(3))
  })

  it('gives rank four and everything below it the iron pennon bar', () => {
    // README §5: "rank 4+ · crest-rank4 · iron · a bare pennon bar". Metal, silhouette complexity
    // and coverage step down together and then stop, because a season has no floor.
    for (const rank of [4, 5, 9, 40, 999]) assert.equal(crestFor(rank), 'crest-rank4')
  })

  it('answers null for a rank a season cannot mint, rather than a placeholder', () => {
    // `null` and never a fallback picture — `micro-aetherholm-web/src/lib/art.ts`'s rule,
    // inherited with its reasoning: a generic "no image" file RENDERS AS ART, the page looks
    // finished, and nobody reports the gap.
    assert.equal(crestFor(0), null)
    assert.equal(crestFor(-1), null)
    assert.equal(crestFor(1.5), null)
    assert.equal(crestFor(Number.NaN), null)
  })
})

describe('the field and the charge are chosen from the season id', () => {
  it('offers four fields and eight charges, as the set holds', () => {
    assert.equal(FIELDS.length, 4)
    assert.equal(CHARGES.length, 8)
  })

  it('gives one season the same banner every time it is asked', () => {
    // The only property a decoration must have. A field that changed between two renders would
    // read as a state change in a season that has been frozen for good.
    const urn = `cf:aetherholm:heraldry:${SEASONS[1]}:rank:2`
    assert.deepEqual(bannerFor(urn), bannerFor(urn))
  })

  it('gives one season the same field and charge at every rank', () => {
    // A season's banner is ONE banner with four crests on it, not four banners. Members of the
    // same alliance placed second and fourth must be able to see they were in the same season.
    const one = bannerFor(`cf:aetherholm:heraldry:${SEASONS[1]}:rank:1`)
    const four = bannerFor(`cf:aetherholm:heraldry:${SEASONS[1]}:rank:4`)
    assert.ok(one && four)
    assert.equal(one.field, four.field)
    assert.equal(one.charge, four.charge)
    assert.notEqual(one.crest, four.crest)
  })

  it('does not hand every season the same picture', () => {
    const pairs = new Set(
      SEASONS.map((s) => {
        const b = bannerFor(`cf:aetherholm:heraldry:${s}:rank:1`)
        return `${b?.field}|${b?.charge}`
      }),
    )
    assert.ok(pairs.size > 1, 'every season resolved to the same field and charge')
  })
})

describe('the urn is parsed, never pattern-matched loosely', () => {
  it('reads the season and the rank out of a well-formed urn', () => {
    const parsed = parseHeraldryUrn(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:3`)
    assert.deepEqual(parsed, { seasonId: SEASONS[0], rank: 3 })
  })

  it('refuses an item that is not heraldry', () => {
    // Every other urn in an inventory reaches this function. A loose match would hang a rank
    // banner on a cosmetic, which is a confidently wrong picture — the failure mode the estate
    // records as worse than a missing one, because nobody reports it.
    assert.equal(parseHeraldryUrn('cf:emberkin:cosmetic:head_frame:ember'), null)
    assert.equal(parseHeraldryUrn('cf:worlds:achievement:first-city'), null)
    assert.equal(parseHeraldryUrn(`cf:aetherholm:skerry:${SEASONS[0]}`), null)
    assert.equal(parseHeraldryUrn(''), null)
  })

  it('refuses a heraldry urn whose rank is not a positive whole number', () => {
    assert.equal(parseHeraldryUrn(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:0`), null)
    assert.equal(parseHeraldryUrn(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:-2`), null)
    assert.equal(parseHeraldryUrn(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:two`), null)
    assert.equal(parseHeraldryUrn(`cf:aetherholm:heraldry:${SEASONS[0]}:rank:`), null)
  })

  it('refuses a season id that is not a uuid, which is what the service puts on the wire', () => {
    assert.equal(parseHeraldryUrn('cf:aetherholm:heraldry:not-a-uuid:rank:1'), null)
  })

  it('answers null for a banner it cannot parse, and the row then renders as it always did', () => {
    assert.equal(bannerFor('cf:emberkin:cosmetic:head_frame:ember'), null)
  })
})

describe('the sixteen pieces of art', () => {
  it('is the whole heraldry set, not a subset', () => {
    assert.equal(HERALDRY.length, 16)
    assert.equal(served.assetCount, 16)
    assert.equal(served.assets.length, 16)
  })

  it('is four fields, eight charges and four rank crests', () => {
    const slugs = HERALDRY.map((e) => e.slug)
    assert.equal(slugs.filter((s) => s.startsWith('field-')).length, 4)
    assert.equal(slugs.filter((s) => s.startsWith('charge-')).length, 8)
    assert.equal(slugs.filter((s) => s.startsWith('crest-rank')).length, 4)
  })

  it('is exactly what tools/sync-heraldry.mjs would write today', () => {
    // A stale catalogue points at pictures that moved. `pnpm sync-heraldry` regenerates it.
    const setRoot = at('../aetherholm-assets')
    if (!existsSync(setRoot)) {
      console.log('UNCHECKED: micro-aetherholm-assets is not checked out; the catalogue is not re-derived')
      return
    }
    const source = JSON.parse(readFileSync(join(setRoot, 'MANIFEST.json'), 'utf8'))
    assert.equal(read('src/art/heraldry.ts'), render(source))
    assert.equal((heraldryAssets(source) as unknown[]).length, 16)
  })

  it('serves every path from /art/heraldry/, never from the repository-relative assets/', () => {
    for (const entry of HERALDRY) {
      assert.ok(entry.path.startsWith('/art/heraldry/'), `${entry.path} is not served from /art/heraldry/`)
      assert.ok(!entry.path.includes('/assets/'), `${entry.path} kept the manifest prefix`)
    }
  })

  it('holds every picture the catalogue names', () => {
    const missing = HERALDRY.filter((e) => !existsSync(at(`public${e.path}`))).map((e) => e.path)
    assert.deepEqual(missing, [], `catalogued but not on disk: ${missing.join(', ')}`)
  })

  it('holds nothing under /art/ that the catalogue does NOT name', () => {
    // The other direction, and the one that catches dead weight: a file in an image that nothing
    // can reference is indistinguishable, from the outside, from one that works.
    const artRoot = at('public/art')
    const found: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full)
        else found.push(`/art/${full.slice(artRoot.length + 1)}`)
      }
    }
    walk(artRoot)
    // EVERY catalogue under `src/art/`, not just the heraldry one: this repository serves three
    // sets — the sixteen banner parts, the covers the register shows each game by, and the
    // fourteen pictures *Ninety Days After* is played with — and a check that knew about one
    // would call the others dead weight.
    const catalogued = new Set<string>([...HERALDRY, ...TITLE_ART, ...NDA_ART].map((e) => e.path))
    const manifests = new Set([
      '/art/heraldry/MANIFEST.json',
      '/art/titles/MANIFEST.json',
      '/art/nda/MANIFEST.json',
    ])
    const orphans = found.filter((p) => !manifests.has(p) && !catalogued.has(p))
    assert.deepEqual(orphans, [], `served from /art/ and referenced by nothing: ${orphans.join(', ')}`)
  })

  it('is byte-identical to micro-aetherholm-assets, which is where the art lives', () => {
    // "Copied once" is not a property that stays true. The set is permanent FLUX 2 Pro output and
    // this repository holds a COPY of sixteen of its files; a hand-edited or re-exported one would
    // drift silently and nothing else would notice.
    const setRoot = at('../aetherholm-assets')
    if (!existsSync(setRoot)) {
      console.log('UNCHECKED: micro-aetherholm-assets is not checked out; heraldry bytes not compared')
      return
    }
    for (const entry of HERALDRY) {
      const here = readFileSync(at(`public${entry.path}`))
      const there = readFileSync(join(setRoot, 'assets/heraldry', entry.path.split('/').pop() as string))
      assert.ok(here.equals(there), `${entry.path} has drifted from the asset set`)
    }
  })

  it('carries the AI disclosure and the licence, which travel with the pictures', () => {
    // The art is FLUX 2 Pro output. The disclosure is not optional and it is not a README's job:
    // it is served beside the images, for all sixteen, as `micro-aetherholm-web` serves its
    // manifest whole for all 101.
    assert.match(served.disclosure, /AI-generated/i)
    assert.ok(served.licence.length > 0)
  })

  it('carries no FLUX prompt — half a megabyte of prose stays out of the image', () => {
    const source = read('src/art/heraldry.ts')
    assert.ok(!source.includes('flat geometric vector'), 'a prompt leaked into the catalogue')
    assert.ok(source.length < 12_000, `the catalogue is ${source.length} bytes; it should be a few kB`)
  })

  it('names the set it came from, so the sixteen are one derivation and not sixteen decisions', () => {
    assert.equal(HERALDRY_SET, 'heraldry')
    const entry = entryFrom({
      set: 'heraldry',
      slug: 'crest-rank1',
      name: 'Rank 1 crest',
      path: 'assets/heraldry/crest-rank1-512x512.png',
      deliveredSize: '512x512',
      accent: '#e8c34a',
    })
    assert.equal((entry as { path: string }).path, '/art/heraldry/crest-rank1-512x512.png')
  })
})

describe('the parts resolve by name', () => {
  it('finds each of the four fields', () => {
    for (const field of FIELDS) assert.ok(heraldryPart(field), `no picture for ${field}`)
  })

  it('finds each of the eight charges', () => {
    for (const charge of CHARGES) assert.ok(heraldryPart(charge), `no picture for ${charge}`)
  })

  it('answers null for a part the set has never had', () => {
    assert.equal(heraldryPart('field-eclipse'), null)
    assert.equal(heraldryPart('crest-rank5'), null)
  })
})

describe('the inventory screen actually renders it', () => {
  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════════
   * EVERYTHING ABOVE PASSES ON A CLIENT THAT DRAWS NOTHING.
   *
   * A complete, correct catalogue that no screen imports is exactly the state this repository was
   * in, and the state `micro-aetherholm-web` was in before micro-org#175. So the module that turns
   * a URN into pictures has to be REACHED from the one screen that shows what an account owns.
   *
   * A crude check on the source text rather than a render, deliberately: the render assertion is
   * the strong one and it lives in test/render.test.ts and in micro-beacon's browser tier. This is
   * the cheap total one, and what it catches is the failure that actually happened — nobody wired
   * it at all.
   * ══════════════════════════════════════════════════════════════════════════════════════════════
   */
  it('is imported by the inventory page', () => {
    assert.match(read('src/pages/inventory.tsx'), /from '\.\.\/lib\/heraldry\.ts'/)
  })

  it('never spells an /art/ path by hand outside the generated catalogue', () => {
    // A hand-written path forks the naming contract silently: it keeps working until the asset set
    // is regenerated at a different size, and then it 404s with nothing to point at.
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(at(dir), { withFileTypes: true })) {
        if (entry.name === 'art') continue // the generated catalogue, which is where they belong
        const rel = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(rel)
        else if (/\.(ts|tsx|css)$/.test(entry.name) && /['"(]\/art\//.test(read(rel))) offenders.push(rel)
      }
    }
    walk('src')
    assert.deepEqual(offenders, [], `spells an /art/ path by hand: ${offenders.join(', ')}`)
  })

  it('keeps the caption that makes the picture honest', () => {
    /*
     * THE FIELD AND THE CHARGE ARE NOT DATA. The row says so, because the rank IS data and the
     * two sit in the same image — a reader with no sentence to go on would take all three for
     * facts about the season. If that sentence is ever deleted, the field and charge must go with
     * it and the crest can stand alone. This is `micro-aetherholm-web`'s island-archetype rule,
     * applied to the one other place in the estate where art direction shares a frame with data.
     */
    const page = read('src/pages/inventory.tsx')
    assert.match(page, /chosen from the season/i, 'the art-direction caption is gone; so must the field and charge be')
  })

  it('serves /art/ from its own nginx location, so a missing picture 404s on its own terms', () => {
    /*
     * Without a location of its own, a request for a picture that is not there falls to
     * `error_page 404 /index.html` and comes back as the app shell with a 200: the <img> fails to
     * decode with no status to explain it, and anything probing the URL is told the file is fine.
     * That is the shape of the defect this change exists to close.
     */
    const conf = read('nginx.conf')
    assert.match(conf, /location \/worlds\/art\/ \{/)
    assert.match(conf, /location \/worlds\/art\/ \{[\s\S]*?try_files \$uri =404;/)
  })

  it('copies public/ into the image, or none of this reaches a browser', () => {
    // Four frontends in this estate shipped images with no public/ in them while their tests went
    // on passing, because the tests read the SOURCE tree.
    assert.match(read('Dockerfile'), /^COPY public \.\/public$/m)
  })
})
