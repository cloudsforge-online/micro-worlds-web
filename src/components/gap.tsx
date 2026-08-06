/**
 * A gap in the estate, rendered as a finding.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * THE MODEL IS `micro-admin-web`'s TREATMENT OF AN ACTION WITH NO EXECUTOR, AND THE RULES ARE ITS
 * RULES (`admin-web/src/lib/catalogue.ts`, `admin-web/src/pages/actions.tsx`):
 *
 *   1. It is **stated**, never hidden. Hiding it leaves somebody hunting for a capability the
 *      estate does not have, and erases the record of why.
 *   2. It carries **no control that would exercise it** — not a disabled button, which reads as
 *      "not yet" and gets clicked at, but no button at all, with the reason in its place.
 *   3. It carries the **citations**, so a reader can check it. A claim nobody can check is worse
 *      than no claim, because it is believed.
 *
 * And the fourth rule, which is this surface's own: **it must never look like loading.** A
 * spinner, a skeleton or an empty state that implies "any moment now" is a lie with a specific
 * cost here — a customer who paid for a private world would sit and wait for something that is
 * never going to arrive. `useResource` already ranks failure above emptiness
 * (`src/lib/resource.ts` — the citation here once named a line range that file has never had,
 * which is one of the reasons citations no longer carry lines); this component is what emptiness
 * renders AS.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type { KnownGap } from '../lib/worlds.ts'

export function GapNotice({ gap }: { gap: KnownGap }) {
  return (
    <article className="ww-gap" aria-label={gap.title}>
      <h3 className="ww-gap__title">
        <span className="ww-gap__badge">
          <span aria-hidden="true">⊘</span> NOT BUILT
        </span>
        {gap.title}
      </h3>
      <p className="ww-gap__finding">{gap.finding}</p>
      <div className="ww-gap__closes">
        <h4 className="ww-gap__closes-title">What would close it</h4>
        <p>{gap.closes}</p>
      </div>
      <p className="ww-gap__cites">
        Check it against:{' '}
        {gap.citations.map((cite, index) => (
          <span key={cite}>
            {index > 0 && ', '}
            <code className="cf-num">{cite}</code>
          </span>
        ))}
      </p>
    </article>
  )
}

/**
 * A service's own refusal, verbatim.
 *
 * `worlds` writes a sentence into `provisions.last_error` when it gives up — `no delivery is
 * defined for sku …`, `… does not declare the … capability`, `the entitlement's scope … does not
 * name a registered title` — all three in `worlds/src/provisioning.ts` — or a title's own 422
 * message, raised there as `TitleUnsupportedError`.
 *
 * It is rendered as it arrived, without paraphrase, for the same reason `micro-admin-web` renders
 * `blockedReason` verbatim (`admin-web/src/lib/catalogue.ts`): so that this app and the
 * service cannot drift into telling somebody two different stories about why their purchase did
 * not arrive.
 */
export function ServiceRefusal({ reason, attempts }: { reason: string; attempts: number }) {
  return (
    <div className="ww-refusal">
      <h4 className="ww-refusal__title">In Forge Worlds’ own words</h4>
      <p className="ww-refusal__text cf-num">{reason}</p>
      <p className="ww-refusal__meta">
        {attempts === 1 ? '1 attempt' : `${attempts} attempts`}. This is terminal: it is not being
        retried in the background, and a background poll deliberately never reopens it — repeating
        whatever caused a failure, at the rate of the poll, is worse than leaving it still.
      </p>
    </div>
  )
}
