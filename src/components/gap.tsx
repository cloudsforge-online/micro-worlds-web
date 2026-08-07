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
 *
 * And the third rule, which is this surface's own: **it must never look like loading.** A
 * spinner, a skeleton or an empty state that implies "any moment now" is a lie with a specific
 * cost here — a customer who paid for a private world would sit and wait for something that is
 * never going to arrive. `useResource` already ranks failure above emptiness
 * (`src/lib/resource.ts`); this component is what emptiness renders AS.
 *
 * It used to carry two more things: a `⊘ NOT BUILT` badge and a list of repository files under
 * "Check this for yourself in:". Both were written for an engineer auditing the estate and were
 * put in front of a customer, who cannot open `worlds/src/provisioning.ts` and did not come here
 * to. The provenance is kept in full in `src/lib/worlds.ts`, where the person who can act on it
 * will find it; the sentence a customer needs is the finding, which is all this now renders.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import type { KnownGap } from '../lib/worlds.ts'

export function GapNotice({ gap }: { gap: KnownGap }) {
  return (
    <article className="ww-gap" aria-label={gap.title}>
      <h3 className="ww-gap__title">{gap.title}</h3>
      <p className="ww-gap__finding">{gap.finding}</p>
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
      <h4 className="ww-refusal__title">What Forge Worlds said, word for word</h4>
      <p className="ww-refusal__text cf-num">{reason}</p>
      <p className="ww-refusal__meta">
{attempts === 1 ? '1 attempt' : `${attempts} attempts`}. That is where it stops. Nothing is
        quietly trying again behind the scenes, and that is deliberate: repeating whatever went
        wrong every few seconds does more harm than leaving it alone.
      </p>
    </div>
  )
}
