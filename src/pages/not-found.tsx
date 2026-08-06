/**
 * The page for an address this app does not own.
 *
 * It renders inside the shell, so the reader keeps the navigation they need to get back out — and
 * it is served under a REAL 404 by nginx (`error_page 404 /index.html`), never a 200. An SPA that
 * answers 200 for every address serves this screen as a success: crawlers index it, uptime checks
 * call it healthy, and a deploy that dropped a route looks exactly like a deploy that did not.
 */
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="wt-state wt-state--empty" role="status">
      <span className="wt-state__icon" aria-hidden="true">
        ◇
      </span>
      <p className="wt-state__title">Forge Worlds has no page here</p>
      <p className="wt-state__hint">
        The server agrees: this screen was delivered with a 404 rather than a 200, so whatever sent
        you can tell that the link is broken.
      </p>
      <div className="wt-state__action">
        <Link className="cf-btn" to="/">
Back to the platform
        </Link>
      </div>
    </div>
  )
}
