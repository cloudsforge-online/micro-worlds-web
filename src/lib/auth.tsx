/**
 * Session state for the tree, and the gate in front of the routes that need one.
 *
 * Hiding a route is NOT the security boundary — `worlds` verifies the bearer on every route that
 * needs one (`authenticate`, `worlds/src/server.ts`), `subjectUserId` derives the account
 * from the token so a client cannot ask about somebody else, and `GET /v1/provisions/:id` answers
 * 404 for another account's row (`worlds/src/server.ts`). This exists so that a signed-out
 * player is sent to sign in instead of being shown a screen made entirely of 401s.
 *
 * **Two of the five screens are deliberately outside the gate**, because the service put their
 * routes outside it: `GET /v1/titles` (`worlds/src/server.ts`),
 * `GET /v1/titles/:id/achievements` and `GET /v1/titles/:id/seasons` make no
 * `authenticate()` call at all. See `src/lib/routes.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * ── The `/auth/me` shape ──────────────────────────────────────────────────────────────────────
 *
 * Identity answers `{ user: {...}, session: {...}, organisations: [...] }` — the profile is
 * NESTED under `user`. The route is `identity/src/server.ts` and the body is built by
 * `toPublicUser` at `identity/src/users.ts`; both citations were re-read against the source
 * for this repository rather than carried over, and both are correct as stated.
 *
 * That shape is worth stating because the estate got it wrong once, at the root: the web template
 * declared `interface Me { handle?, roles? }` and read both fields off the TOP level, where they
 * are not, and four frontends inherited it — `roles` was then always null, `isAdmin` in the shared
 * company bar was always false, and the switcher hid every `adminOnly` entry from every signed-in
 * operator.
 *
 * **It has since been fixed everywhere.** `micro-web-template/src/lib/auth.tsx` declares the
 * nested shape, and hub-web, site, foresight-web, foresight-admin-web, market-web, admin-web and
 * mint-web all do the same.
 *
 * The flat FALLBACK below is kept so that a proxy or an older build on the rollback path still
 * signs somebody in, and the nested value wins when both are present. `test/auth.test.ts` proves
 * all three cases.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import type { AccountState } from '@cloudsforge/ui'
import { AUTH_EXPIRED_EVENT, clearTokens, hasSession, nimbus, signIn, signOut } from './api.ts'

/** What identity answers at `/auth/me`, narrowed to what this app needs. */
export interface MeResponse {
  user?: {
    id?: string | null
    handle?: string | null
    roles?: readonly string[] | null
  } | null
  /** The flat shape a proxy or an older build may still answer. */
  handle?: string | null
  roles?: readonly string[] | null
  id?: string | null
}

export interface Player {
  /** `user:<uuid>` — the subject `worlds` records on a provision (`worlds/src/server.ts`). */
  readonly principal: string | null
  readonly handle: string | null
  readonly roles: readonly string[]
}

/**
 * Read the player out of an `/auth/me` body.
 *
 * A pure function so `test/auth.test.ts` can prove both shapes without a browser, and so the
 * nested-versus-flat mistake cannot be made silently a sixth time.
 *
 * `principal` is null rather than a guess when there is no id. This app compares it against a
 * provision's `subject` to say "this is yours", and a guess there would either claim somebody
 * else's purchase or disown the player's own.
 */
export function readPlayer(body: unknown): Player {
  const empty: Player = { principal: null, handle: null, roles: [] }
  if (typeof body !== 'object' || body === null) return empty
  const top = body as MeResponse
  const nested = typeof top.user === 'object' && top.user !== null ? top.user : undefined

  const id = str(nested?.id) ?? str(top.id)
  return {
    principal: id === undefined ? null : `user:${id}`,
    handle: str(nested?.handle) ?? str(top.handle) ?? null,
    roles: list(nested?.roles) ?? list(top.roles) ?? [],
  }
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function list(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((v): v is string => typeof v === 'string')
}

export type SessionStatus = 'loading' | 'anonymous' | 'signedIn'

export interface Session {
  status: SessionStatus
  account: AccountState
  player: Player
  signIn: (returnTo?: string) => void
  signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const value = useContext(SessionContext)
  // Throwing beats returning a signed-out default: a component rendered outside the provider would
  // otherwise show an anonymous UI to a signed-in player and nobody would ever see why.
  if (!value) throw new Error('useSession must be used inside <AuthProvider>')
  return value
}

const NOBODY: Player = { principal: null, handle: null, roles: [] }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>(() => (hasSession() ? 'loading' : 'anonymous'))
  const [player, setPlayer] = useState<Player>(NOBODY)

  useEffect(() => {
    if (!hasSession()) return
    let live = true
    // The identity call is the one request that is allowed to fail quietly: an unreachable account
    // service must not sign somebody out while they are reading whether a purchase arrived.
    nimbus<unknown>('/auth/me')
      .then((profile) => {
        if (!live) return
        setPlayer(readPlayer(profile))
        setStatus('signedIn')
      })
      .catch(() => {
        if (!live) return
        setStatus(hasSession() ? 'signedIn' : 'anonymous')
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const onExpired = () => {
      clearTokens()
      setPlayer(NOBODY)
      setStatus('anonymous')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const doSignOut = useCallback(() => {
    setPlayer(NOBODY)
    setStatus('anonymous')
    signOut()
  }, [])

  const value = useMemo<Session>(
    () => ({
      status,
      account: {
        signedIn: status === 'signedIn',
        handle: player.handle,
        roles: player.roles,
      },
      player,
      signIn,
      signOut: doSignOut,
    }),
    [status, player, doSignOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/**
 * Gate a route behind a session.
 *
 * The redirect carries the CURRENT path, search and hash, so somebody who followed a link to an
 * entitlement lands back on that entitlement rather than on the index. It is fired from an effect
 * rather than during render because a redirect during render runs twice under StrictMode, and the
 * second one would overwrite the first's return address.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, signIn: go } = useSession()
  const location = useLocation()

  useEffect(() => {
    if (status !== 'anonymous') return
    const back = `${window.location.origin}${location.pathname}${location.search}${location.hash}`
    go(back)
  }, [status, location.pathname, location.search, location.hash, go])

  if (status === 'loading') return <LoadingGate label="Checking your session" />
  if (status === 'anonymous') return <LoadingGate label="Taking you to sign in" />
  return <>{children}</>
}

function LoadingGate({ label }: { label: string }) {
  return (
    <div className="wt-state wt-state--loading" role="status">
      <span className="wt-spinner" aria-hidden="true" />
      <p className="wt-state__title">{label}</p>
    </div>
  )
}
