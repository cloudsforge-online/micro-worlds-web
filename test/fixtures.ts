/**
 * The responses the scenarios are run against.
 *
 * Every shape is one `src/lib/worlds.ts` declares, which was read out of `worlds/src/` at the
 * lines that module cites. Typed against the client's own declarations so a drift between them is
 * a type error here rather than a scenario asserting a shape nothing produces.
 */
import type {
  InventoryItem,
  PlayerSnapshot,
  Provision,
  Title,
} from '../src/lib/worlds.ts'

export const TITLE_ID = '00000000-1111-2222-3333-444444444444'
export const ITEM_ID = '55555555-6666-7777-8888-999999999999'
export const PROVISION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

export function title(over: Partial<Title> = {}): Title {
  return {
    id: TITLE_ID,
    slug: 'ninety-days-after',
    name: 'Ninety Days After',
    status: 'live',
    capabilities: [],
    assetScopes: ['urn:cf:nda'],
    ...over,
  }
}

export function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: ITEM_ID,
    titleScope: TITLE_ID,
    itemUrn: 'urn:cf:nda:item:lantern',
    source: 'purchase',
    quantity: 1,
    bound: false,
    entitlementId: null,
    listedAt: null,
    listingUrn: null,
    acquiredAt: '2026-07-01T09:00:00.000Z',
    ...over,
  }
}

export function provision(over: Partial<Provision> = {}): Provision {
  return {
    id: PROVISION_ID,
    entitlementId: 'ent-1',
    subject: 'user:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    sku: 'nda.season.1',
    scope: 'urn:cf:nda',
    titleId: TITLE_ID,
    kind: 'season_pass',
    state: 'provisioned',
    provisionedUrn: 'urn:cf:nda:season:1',
    metadata: {},
    attempts: 1,
    lastError: null,
    leaseOwner: null,
    createdAt: '2026-07-01T09:00:00.000Z',
    provisionedAt: '2026-07-01T09:00:05.000Z',
    ...over,
  }
}

export function snapshot(over: Partial<PlayerSnapshot> = {}): PlayerSnapshot {
  return {
    profile: {
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      displayName: 'Player One',
      avatarAssetUrn: null,
      reputation: 12,
      equippedCosmetics: {},
      sanctions: [],
      ageBracket: 'adult',
      parentalControls: {},
      createdAt: '2026-07-01T09:00:00.000Z',
      updatedAt: '2026-07-01T09:00:00.000Z',
    },
    inventory: [],
    achievements: [],
    ...over,
  }
}

/** The estate's error envelope — nested, as `errorReply()` builds it in every service. */
export function error(code: string, message: string): { error: { code: string; message: string } } {
  return { error: { code, message } }
}

/** The two `cf.*` keys a signed-in browser holds. `src/lib/api.ts` reads exactly these. */
export const SIGNED_IN = {
  'cf.accessToken': 'access-token-stub',
  'cf.refreshToken': 'refresh-token-stub',
}

/** `GET /auth/me` as `identity/src/server.ts` returns it: the profile is nested. */
export const ME = {
  user: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', handle: 'player', roles: ['customer'] },
  session: { id: 'session-1' },
  organisations: [],
}
