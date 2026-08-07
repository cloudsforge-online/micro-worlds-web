/**
 * The one account, across every title.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * `profile` MAY BE NULL, AND NULL IS A NEW PLAYER — NOT AN ERROR AND NOT A LOADING STATE.
 *
 * `findProfile` returns null for an account that has never set one (`worlds/src/players.ts`)
 * and the handler puts that null straight on the wire (`worlds/src/server.ts`). So the read
 * succeeds, the state is `ok`, and the page renders an invitation. A screen that treated it as an
 * empty resource would show "nothing here" to somebody whose account exists perfectly well.
 *
 * ── The wardrobe is keyed BY TITLE, and that is the point ─────────────────────────────────────
 *
 * `equippedCosmetics` is `titleId | '*'` → `{ slot: urn }` (`worlds/src/players.ts`). The
 * frozen estate had one flat map on one account row, and `worlds/src/players.ts` records why
 * there is no migration back: "with two it is the difference between 'my frame in each game' and
 * 'my frame', and there is no migration from the second to the first that does not throw
 * information away." So this screen renders the cross-title default and each title's override as
 * separate groups. Collapsing them would be the same information loss, in a browser.
 *
 * ── Two fields the handler accepts and this screen does not offer ─────────────────────────────
 *
 * `ageBracket` and `parentalControls` are read by `PUT /v1/players/me`
 * (`worlds/src/server.ts`). They are not offered here. An age bracket is a safeguarding
 * fact (`worlds/src/players.ts` — "cannot be re-established every time somebody joins a
 * lobby"), and a form that lets an account assert its own is a form that lets an account assert it
 * is an adult.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useEffect, useState } from 'react'
import { Failed, Forbidden, Loading } from '../components/states.tsx'
import { Fact } from '../components/tone.tsx'
import { shortUrn, slotName, timestamp } from '../lib/format.ts'
import { useMutation } from '../lib/mutation.ts'
import { useResource } from '../lib/resource.ts'
import {
  CROSS_TITLE,
  equipCosmetic,
  getPlayer,
  putProfile,
  type PlayerProfile,
  type PlayerSnapshot,
} from '../lib/worlds.ts'

export function PlayerPage() {
  const load = useCallback(async (signal: AbortSignal) => getPlayer({ signal }), [])
  // `count` is 1 unconditionally: a null profile is a real answer about an account that exists, so
  // this resource is never "empty". Emptiness belongs to the lists on the other screens.
  const player = useResource<PlayerSnapshot>(load, () => 1, 'Your account could not be fetched.')

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">Forge Worlds</p>
        <h1 className="ww-head__title">Your account</h1>
        <p className="ww-head__lede">
          A single profile that every title reads from: the name you go by, what you have on, and
          whatever the platform has written down about you. None of it belongs to a particular game,
          so none of it goes away when one of them does.
        </p>
      </header>

      {player.state === 'loading' && <Loading label="Fetching your account" />}
      {player.state === 'forbidden' && player.error !== null && <Forbidden notice={player.error} />}
      {player.state === 'failed' && player.error !== null && (
        <Failed notice={player.error} onRetry={player.reload} title="Your account is not on screen" />
      )}
      {player.data !== null && <Account snapshot={player.data} onSaved={player.reload} />}
    </>
  )
}

function Account({ snapshot, onSaved }: { snapshot: PlayerSnapshot; onSaved: () => void }) {
  const { profile } = snapshot

  return (
    <>
      <section className="ww-panel" aria-label="Your profile">
        <h2 className="ww-panel__title">Who you are here</h2>
        {profile === null ? (
          <p className="ww-panel__subtitle">
            Your CloudsForge account exists and is signed in; it has no Forge Worlds profile
            attached to it. Choose the name every title should show for you and this fills in.
          </p>
        ) : (
          <dl className="ww-facts">
            <Fact label="Standing">
              <span className="cf-num">{profile.reputation}</span>
            </Fact>
            <Fact label="Age band">
              {/* Shown, never editable. See the file header. */}
              <span className="cf-num">{profile.ageBracket}</span>
            </Fact>
            <Fact label="First set up">{timestamp(profile.createdAt)}</Fact>
            <Fact label="Last changed">{timestamp(profile.updatedAt)}</Fact>
          </dl>
        )}
        <ProfileForm profile={profile} onSaved={onSaved} />
      </section>

      {profile !== null && profile.sanctions.length > 0 && (
        <section className="ww-panel ww-panel--gap" aria-label="Sanctions on this account">
          <h2 className="ww-panel__title">
            <span aria-hidden="true">⊘</span> Sanctions
          </h2>
          <p className="ww-panel__subtitle">
            Held against the account itself rather than against any one world, so a sanction applies
            wherever you go unless its scope says otherwise.
          </p>
          <ul className="ww-sanctions">
            {profile.sanctions.map((sanction, index) => (
              <li className="ww-sanction" key={`${sanction.kind}-${sanction.appliedAt}-${index}`}>
                <p className="ww-sanction__kind cf-num">{sanction.kind}</p>
                <p className="ww-sanction__reason">{sanction.reason}</p>
                <p className="ww-sanction__meta">
                  Applied {timestamp(sanction.appliedAt)} ·{' '}
                  {sanction.expiresAt === null
                    ? 'no end date'
                    : `lifts ${timestamp(sanction.expiresAt)}`}{' '}
                  ·{' '}
                  {sanction.scope === CROSS_TITLE ? (
                    'every title'
                  ) : (
                    <code className="cf-num">{sanction.scope}</code>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Wardrobe profile={profile} onSaved={onSaved} />

      <section className="ww-panel" aria-label="Achievements">
        <h2 className="ww-panel__title">What you have done</h2>
        <p className="ww-panel__subtitle">
          A title decides you have earned something and tells the platform, which keeps the record
          from then on. The points beside each one are a tally and not money: there is nothing
          anywhere on this platform they can be exchanged for.
        </p>
        {snapshot.achievements.length === 0 ? (
          <p className="ww-absent ww-absent--block">
Nothing yet. Achievements arrive when a title reports that you earned one — none of them can
            be granted from this page, and nor can you award yourself one.
          </p>
        ) : (
          <ul className="ww-achievements">
            {snapshot.achievements.map((achievement) => (
              <li className="ww-achievement" key={`${achievement.titleId}-${achievement.key}`}>
                <p className="ww-achievement__name">{achievement.name}</p>
                <p className="ww-achievement__meta">
                  <code className="cf-num">{achievement.key}</code> ·{' '}
                  <span className="cf-num">{achievement.points}</span> points · earned{' '}
                  {timestamp(achievement.unlockedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/**
 * The profile form.
 *
 * `PUT /v1/players/me` is a full replace, not a patch: `avatarAssetUrn` is written as null when it
 * is not a string (`worlds/src/server.ts`), so omitting it CLEARS it. The form therefore always
 * submits both fields, pre-filled from the current profile — a partial submit here would silently
 * blank an avatar somebody set from a title.
 */
function ProfileForm({
  profile,
  onSaved,
}: {
  profile: PlayerProfile | null
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [avatar, setAvatar] = useState(profile?.avatarAssetUrn ?? '')

  // Re-seed when the profile arrives or is reloaded. Without this the inputs keep the values they
  // were first mounted with, and a save would write back a stale name.
  useEffect(() => {
    setDisplayName(profile?.displayName ?? '')
    setAvatar(profile?.avatarAssetUrn ?? '')
  }, [profile])

  const save = useMutation<[], { profile: PlayerProfile }>(
    async () =>
      putProfile({
        displayName: displayName.trim(),
        // Empty means CLEARED, and null is how the service spells that (`server.ts`).
        avatarAssetUrn: avatar.trim().length === 0 ? null : avatar.trim(),
      }),
    'Your profile was not saved.',
  )

  // The service's own rule, checked here so the refusal arrives before the round trip rather than
  // as a 400: `worlds/src/players.ts` requires 1 to 40 characters after trimming.
  const trimmed = displayName.trim()
  const tooLong = trimmed.length > 40
  const blocked = trimmed.length === 0 || tooLong

  const submit = async () => {
    const saved = await save.run()
    if (saved !== null) onSaved()
  }

  return (
    <form
      className="ww-form"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <label className="ww-field">
        <span className="ww-field__label">Display name</span>
        <span className="ww-field__hint">
          The name every game puts beside you. Between 1 and 40 characters — anything longer is
          turned down.
        </span>
        <input
          className="ww-field__input"
          type="text"
          maxLength={80}
          autoComplete="off"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {tooLong && (
          <span className="ww-field__error">
You have typed {trimmed.length} characters. Forty is the limit.
          </span>
        )}
      </label>

      <label className="ww-field">
        <span className="ww-field__label">Avatar</span>
        <span className="ww-field__hint">
          The reference of the image asset to use. Emptying this box removes your avatar: saving
          replaces the whole profile rather than merging into it, so both boxes are sent every time.
        </span>
        <input
          className="ww-field__input cf-num"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
        />
      </label>

      <button className="cf-btn" type="submit" disabled={save.busy || blocked}>
        {save.busy ? 'Saving…' : profile === null ? 'Set up your profile' : 'Save these'}
      </button>

      {save.error !== null && <Failed notice={save.error} title="Your profile is unchanged" />}
    </form>
  )
}

/**
 * What the account is wearing, per title and across all of them.
 *
 * Clearing a slot is the only cosmetic write this screen offers, and it is offered because the
 * service treats it as unconditional: `worlds/src/server.ts` skips the entitlement check
 * when `itemUrn` is null, "you may always take something off, including something you no longer
 * own". SETTING a slot is not offered here — it belongs beside the item, on the inventory screen,
 * where the thing being equipped is visible.
 */
function Wardrobe({ profile, onSaved }: { profile: PlayerProfile | null; onSaved: () => void }) {
  const clear = useMutation<[string, string], { profile: PlayerProfile }>(
    async (scope: string, slot: string) =>
      equipCosmetic({
        slot,
        itemUrn: null,
        ...(scope === CROSS_TITLE ? {} : { titleId: scope }),
      }),
    'That slot was not emptied.',
  )

  const groups = Object.entries(profile?.equippedCosmetics ?? {})

  return (
    <section className="ww-panel" aria-label="What you are wearing">
      <h2 className="ww-panel__title">What you have on</h2>
      <p className="ww-panel__subtitle">
        You have one default outfit and, on top of it, whatever you have chosen for a particular
        title. Anywhere you have expressed no preference, the default is what shows — so you can
        look the same everywhere or different in each place, as you like.
      </p>

      {groups.length === 0 ? (
        <p className="ww-absent ww-absent--block">
You are wearing nothing you have chosen. The platform checks that you own a cosmetic when
          you put it on, and never when you take it off — losing an item cannot leave you stuck in
          it.
        </p>
      ) : (
        groups.map(([scope, slots]) => (
          <div className="ww-wardrobe" key={scope}>
            <h3 className="ww-wardrobe__scope">
              {scope === CROSS_TITLE ? (
'Everywhere'
              ) : (
                <code className="cf-num">{scope}</code>
              )}
            </h3>
            <ul className="ww-slots">
              {Object.entries(slots).map(([slot, urn]) => (
                <li className="ww-slot" key={slot}>
                  <span className="ww-slot__name">{slotName(slot)}</span>
                  <code className="cf-num ww-slot__urn" title={urn}>
                    {shortUrn(urn)}
                  </code>
                  <button
                    className="cf-btn ww-btn-quiet"
                    type="button"
                    disabled={clear.busy}
                    onClick={() => {
                      void clear.run(scope, slot).then((done) => {
                        if (done !== null) onSaved()
                      })
                    }}
                  >
Take it off
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {clear.error !== null && (
        <Failed
          notice={clear.error}
          title={
            // The service FAILS CLOSED on this route when billing is unreachable
            // (`worlds/src/server.ts`), and it has its own code. A 503 here is "ask again
            // later", not "something is broken" — and saying so is the difference between a player
            // who waits a minute and a player who files a bug.
            clear.error.message.includes('cannot check your purchases')
              ? 'Your purchases could not be checked just now'
              : 'That slot is unchanged'
          }
        />
      )}
    </section>
  )
}
