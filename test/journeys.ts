/**
 * This surface's slice of `docs/ecosystem/22-browser-journeys.md`, as data.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * WHY THE CATALOGUE IS DATA AND NOT JUST A LIST OF `it(...)` TITLES
 *
 * Doc 22 §3.2 makes the layer boundary mechanical rather than advisory: every scenario declares
 * one `asserts` kind, and any scenario whose outcome depends on a SERVER-SIDE rule must carry
 * `ownedBy` — "a path, resolvable by grep, in the service that enforces the rule". A meta-test
 * reads these and fails the suite when one is missing.
 *
 * The second reason is doc 22 §8: a scenario that exists and cannot run is a gap somebody can
 * close, and an absent scenario is a gap nobody can see.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

export type Asserts = 'presentation' | 'client-request' | 'navigation'
export type Tier = 'T1' | 'T2' | 'T3'

export interface Scenario {
  readonly id: string
  readonly what: string
  readonly asserts: Asserts
  readonly tier: Tier
  readonly gate?: boolean
  readonly ownedBy?: { readonly path: string; readonly grep: string }
  readonly blocked?: string
}

export const SCENARIOS: readonly Scenario[] = [
  /* ── 6.7 Group G — Forge Worlds ───────────────────────────────────────────────────────────── */
  {
    id: 'BJ-WLD-01',
    what: 'an empty title registry renders as a stated finding with citations — never a spinner, a skeleton or an empty state implying something is on its way',
    asserts: 'presentation',
    tier: 'T2',
    gate: true,
  },
  {
    id: 'BJ-WLD-02',
    what: 'the index opens with what the platform owns; the registry is a section within it, not two game cards',
    asserts: 'presentation',
    tier: 'T1',
  },
  {
    id: 'BJ-WLD-03',
    what: 'a bound item has NO sell control at all — not a disabled one — and the sentence in its place says never rather than not yet',
    asserts: 'presentation',
    tier: 'T1',
    gate: true,
    ownedBy: { path: 'worlds/src/players.ts', grep: 'bound' },
  },
  {
    id: 'BJ-WLD-04',
    what: 'an unbound item offers the sell control, and the sentence beside it describes what the item IS and where it may go — never as an advantage',
    asserts: 'presentation',
    tier: 'T1',
  },
  {
    id: 'BJ-WLD-05',
    what: 'an unsupported provision renders the service’s own sentence verbatim, the word UNDELIVERABLE, a pointer to a refund, and no retry control',
    asserts: 'presentation',
    tier: 'T1',
    gate: true,
    ownedBy: { path: 'worlds/src/server.ts', grep: 'worlds:admin' },
    // Doc 22 puts this at T3 because it wants a real unsupported provision. Everything the
    // scenario asserts is presentation over the response, so it runs at T1; what stays server-side
    // is that the retry route really does demand admin, cited above.
  },
  {
    id: 'BJ-WLD-06',
    what: 'a null player profile renders as a new player — not an error and not a loading state',
    asserts: 'presentation',
    tier: 'T1',
  },
  {
    id: 'BJ-WLD-07',
    what: 'a title page renders achievements and seasons for an anonymous reader, with no credential attached',
    asserts: 'presentation',
    tier: 'T2',
  },
  {
    id: 'BJ-WLD-08',
    what: '05 journey 10: join a world, claim a homestead, complete an objective, and see the reward in the Hub portfolio',
    asserts: 'presentation',
    tier: 'T3',
    blocked:
      'doc 22 §8.3: there is no client for Ninety Days After anywhere in the estate. worlds-web ' +
      'is a registry and account surface — it has no join, no homestead and no objective — and ' +
      'the second half of the journey is on Hub and Market, which makes it cross-surface and ' +
      'therefore tier 3 twice over.',
  },

  /* ── 6.19 Group S — the adversarial matrix. BJ-ADV-09 is this repo's inventory listing. ───── */
  {
    id: 'BJ-ADV-09-H1',
    what: 'listing an inventory item under a double-submit produces one listing',
    asserts: 'client-request',
    tier: 'T1',
  },
  {
    id: 'BJ-ADV-09-H4',
    what: 'a failed listing states the failure beside the row and leaves the row rendered',
    asserts: 'presentation',
    tier: 'T1',
  },
  {
    id: 'BJ-ADV-22',
    what: 'degraded not down: the page paints inside its deadline with the slow read marked pending',
    asserts: 'presentation',
    tier: 'T1',
    gate: true,
  },
  {
    id: 'BJ-ADV-23',
    what: 'every failure state renders the request id to quote to support',
    asserts: 'presentation',
    tier: 'T1',
    gate: true,
  },

  /* ── 6.20 Group T — accessibility ─────────────────────────────────────────────────────────── */
  {
    id: 'BJ-A11Y-01',
    what: 'axe on every route of this surface: zero serious or critical violations',
    asserts: 'presentation',
    tier: 'T2',
    gate: true,
    blocked:
      'axe-core is not installed anywhere in the estate, and doc 22 §1 records that as true of ' +
      'all fifteen bundles. Doc 22 §7.2 makes the axe sweep estate-wide by construction ("Any PR ' +
      'in ui — every surface’s T1 axe set"), so it belongs to the shared design system rather ' +
      'than to one repository. BJ-A11Y-10 and -12 need no engine and are run.',
  },
  {
    id: 'BJ-A11Y-03',
    what: 'a degraded panel is still announced, and a failure is not colour-only',
    asserts: 'presentation',
    tier: 'T1',
    gate: true,
  },
  {
    id: 'BJ-A11Y-10',
    what: 'colour is never the only channel: every state badge carries a word as well',
    asserts: 'presentation',
    tier: 'T1',
  },
  {
    id: 'BJ-A11Y-12',
    what: 'one main landmark, a reachable skip link, and a heading order with no level skipped',
    asserts: 'presentation',
    tier: 'T1',
  },

  /* ── 5.1 the universal per-surface property ───────────────────────────────────────────────── */
  {
    id: 'BJ-WORLDS-404',
    what: 'an address this surface does not own renders the not-found screen UNDER a 404',
    asserts: 'navigation',
    tier: 'T2',
  },
]

/**
 * Every id doc 22 assigns to this surface: §6.7 in full, §6.19's `BJ-ADV-09` row over the two
 * hazards it declares (H1 H4), §6.19's two page-level rows, the Group T rows naming a property
 * this surface has, and §5.1. Doc 22 §5 keys this surface `worlds`.
 */
export const DOC22_IDS: readonly string[] = [
  'BJ-WLD-01',
  'BJ-WLD-02',
  'BJ-WLD-03',
  'BJ-WLD-04',
  'BJ-WLD-05',
  'BJ-WLD-06',
  'BJ-WLD-07',
  'BJ-WLD-08',
  'BJ-ADV-09-H1',
  'BJ-ADV-09-H4',
  'BJ-ADV-22',
  'BJ-ADV-23',
  'BJ-A11Y-01',
  'BJ-A11Y-03',
  'BJ-A11Y-10',
  'BJ-A11Y-12',
  'BJ-WORLDS-404',
]
