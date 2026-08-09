/**
 * The sixteen pieces a sealed season's rank banner is composed from. GENERATED — do not edit.
 *
 * Written by `tools/sync-heraldry.mjs` from `micro-aetherholm-assets/MANIFEST.json`. Run
 * `pnpm sync-heraldry` after a new asset set lands beside this repository;
 * `test/heraldry.test.ts` fails if this file and the set disagree.
 *
 * Four fields, eight charges and four rank crests. A banner is field + charge + crest — the crest
 * carries the rank, and `src/lib/heraldry.ts` is the only thing that composes them.
 *
 * The provenance is deliberately NOT copied here: the FLUX prompt, the model, the checksum, the
 * C2PA state, the licence and the AI disclosure are served whole beside the pictures at
 * `/art/heraldry/MANIFEST.json`, so the disclosure travels with the images rather than with the
 * code that displays them.
 *
 * Generator: @cloudsforge/studio via aetherholm-assets/generate.ts
 * Provider: FLUX 2 Pro
 * Updated: 2026-08-02T12:05:39.067Z
 */

export interface HeraldryEntry {
  /** Always `heraldry`. Kept so the shape matches the estate's other art catalogues. */
  readonly set: string
  /** `field-<name>`, `charge-<name>` or `crest-rank<n>`. */
  readonly slug: string
  readonly name: string
  /** Absolute, browser-resolvable, served by nginx from `/art/heraldry/`. */
  readonly path: string
  /** `<w>x<h>` as delivered. */
  readonly size: string
  /** The hue the picture was PAINTED around, from the manifest. Art direction, never a UI palette. */
  readonly accent: string | null
}

export const HERALDRY: readonly HeraldryEntry[] = [
  {"set":"heraldry","slug":"charge-airship","name":"Airship charge","path":"/art/heraldry/charge-airship-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-anchor","name":"Storm anchor charge","path":"/art/heraldry/charge-anchor-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-bolt","name":"Thunderbolt charge","path":"/art/heraldry/charge-bolt-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-gale","name":"Gale charge","path":"/art/heraldry/charge-gale-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-spire","name":"Spire charge","path":"/art/heraldry/charge-spire-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-star","name":"Aether star charge","path":"/art/heraldry/charge-star-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-tower","name":"Watchtower charge","path":"/art/heraldry/charge-tower-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"charge-well","name":"Well charge","path":"/art/heraldry/charge-well-512x512.png","size":"512x512","accent":"#d4af4a"},
  {"set":"heraldry","slug":"crest-rank1","name":"Rank 1 crest","path":"/art/heraldry/crest-rank1-512x512.png","size":"512x512","accent":"#e8c34a"},
  {"set":"heraldry","slug":"crest-rank2","name":"Rank 2 crest","path":"/art/heraldry/crest-rank2-512x512.png","size":"512x512","accent":"#b0c0dc"},
  {"set":"heraldry","slug":"crest-rank3","name":"Rank 3 crest","path":"/art/heraldry/crest-rank3-512x512.png","size":"512x512","accent":"#c08552"},
  {"set":"heraldry","slug":"crest-rank4","name":"Rank 4 and below crest","path":"/art/heraldry/crest-rank4-512x512.png","size":"512x512","accent":"#8fa3b8"},
  {"set":"heraldry","slug":"field-cloud","name":"Cloud field","path":"/art/heraldry/field-cloud-512x512.png","size":"512x512","accent":"#cfc0a0"},
  {"set":"heraldry","slug":"field-dawn","name":"Dawn field","path":"/art/heraldry/field-dawn-512x512.png","size":"512x512","accent":"#b83a3a"},
  {"set":"heraldry","slug":"field-night","name":"Night field","path":"/art/heraldry/field-night-512x512.png","size":"512x512","accent":"#6a4a9e"},
  {"set":"heraldry","slug":"field-storm","name":"Storm field","path":"/art/heraldry/field-storm-512x512.png","size":"512x512","accent":"#4a6ab8"},
]
