/**
 * The route table.
 *
 * Two facts about it are enforced elsewhere and must stay in agreement with it: `ROUTES` in
 * lib/routes.ts is the declaration the navigation is derived from, and nginx.conf enumerates the
 * same paths so that an address which is NOT here answers 404 rather than 200.
 *
 * ── Which routes are gated is read off the SERVICE, not chosen ────────────────────────────────
 *
 * The index and the title page are public because `worlds` made their routes public:
 * `GET /v1/titles` (`worlds/src/server.ts`), `GET /v1/titles/:id/achievements` and
 * `GET /v1/titles/:id/seasons` make no `authenticate()` call at all, and the first carries
 * a comment saying why — "a launcher listing games cannot require a token to do it". Putting them
 * behind `ProtectedRoute` would send a reader to sign in for a page the service would have served
 * them, which is the same class of mistake as sending a bearer token to a route that never wanted
 * one.
 *
 * The other three authenticate, so they are gated. The gate is NOT the security boundary — `worlds`
 * verifies the bearer itself, derives the account from the token with `subjectUserId` so a client
 * cannot ask about somebody else, and answers 404 for another account's provision
 * (`worlds/src/server.ts`).
 */
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { BASE } from './lib/routes.ts'
import { ScrollToTop } from './components/scroll-to-top.tsx'
import { AppShell } from './components/shell.tsx'
import { AuthProvider, ProtectedRoute } from './lib/auth.tsx'
import { placementIsKnown } from './lib/hosts.ts'
import { EntitlementPage, EntitlementsPage } from './pages/entitlements.tsx'
import { InventoryPage } from './pages/inventory.tsx'
import { NotFoundPage } from './pages/not-found.tsx'
import { PlatformPage } from './pages/platform.tsx'
import { PlayPage } from './pages/play.tsx'
import { PlayerPage } from './pages/player.tsx'
import { TitlePage } from './pages/title.tsx'
import { WorldPage } from './pages/world.tsx'

export function App() {
  const unregistered = !placementIsKnown()

  return (
    <BrowserRouter basename={BASE}>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route element={<AppShell unregistered={unregistered} />}>
            {/* Public: what the platform is, and the registry. */}
            <Route index element={<PlatformPage />} />
            {/* The games. `play` lists the worlds open to settle in; `play/:worldId` is the game
                itself. Two sibling routes rather than one nested pair, each gated on its own,
                because `test/routes.test.ts` reads every `<Route>` for this path and requires the
                gate to match `ROUTES` at each one — a wrapper that gated the parent and left the
                child bare would have looked identical from here and let a signed-out reader into
                a world. */}
            <Route
              path="play"
              element={
                <ProtectedRoute>
                  <PlayPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="play/:worldId"
              element={
                <ProtectedRoute>
                  <WorldPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="player"
              element={
                <ProtectedRoute>
                  <PlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="inventory"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="entitlements"
              element={
                <ProtectedRoute>
                  <EntitlementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="entitlements/:id"
              element={
                <ProtectedRoute>
                  <EntitlementPage />
                </ProtectedRoute>
              }
            />
            {/* Public, deliberately: both routes behind it are. */}
            <Route path="titles/:id" element={<TitlePage />} />
            {/* Unknown paths render inside the shell, so the reader keeps the navigation they need
                to get back out — under a real 404, which nginx.conf preserves. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
