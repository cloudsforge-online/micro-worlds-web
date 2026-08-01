/**
 * The one account, across every title.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * `profile` MAY BE NULL, AND NULL IS A NEW PLAYER — NOT AN ERROR AND NOT A LOADING STATE.
 *
 * `findProfile` returns null for an account that has never set one (`worlds/src/players.ts:97-103`)
 * and the handler puts that null straight on the wire (`worlds/src/server.ts:537`). So the read
 * succeeds, the state is `ok`, and the page renders an invitation. A screen that treated it as an
 * empty resource would show "nothing here" to somebody whose account exists perfectly well.
 *
 * ── The wardrobe is keyed BY TITLE, and that is the point ─────────────────────────────────────
 *
 * `equippedCosmetics` is `titleId | '*'` → `{ slot: urn }` (`worlds/src/players.ts:56-57`). The
 * frozen estate had one flat map on one account row, and `worlds/src/players.ts:13-18` records why
 * there is no migration back: "with two it is the difference between 'my frame in each game' and
 * 'my frame', and there is no migration from the second to the first that does not throw
 * information away." So this screen renders the cross-title default and each title's override as
 * separate groups. Collapsing them would be the same information loss, in a browser.
 *
 * ── Two fields the handler accepts and this screen does not offer ─────────────────────────────
 *
 * `ageBracket` and `parentalControls` are read by `PUT /v1/players/me`
 * (`worlds/src/server.ts:559-564`). They are not offered here. An age bracket is a safeguarding
 * fact (`worlds/src/players.ts:8-11` — "cannot be re-established every time somebody joins a
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
  const player = useResource<PlayerSnapshot>(load, () => 1, 'Your account could not be read.')

  return (
    <>
      <header className="ww-head">
        <p className="ww-head__eyebrow">Forge Worlds</p>
        <h1 className="ww-head__title">Your account</h1>
        <p className="ww-head__lede">
          One profile across every title. What you are called, what you are wearing, and anything
          the platform has recorded against the account — all of it outlives any one season.
        </p>
      </header>

      {player.state === 'loading' && <Loading label="Reading your account" />}
      {player.state === 'forbidden' && player.error !== null && <Forbidden notice={player.error} />}
      {player.state === 'failed' && player.error !== null && (
        <Failed notice={player.error} onRetry={player.reload} title="Your account did not load" />
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
        <h2 className="ww-panel__title">Profile</h2>
        {profile === null ? (
          <p className="ww-panel__subtitle">
            You have no Forge Worlds profile yet. Your account exists — this is the name titles will
            show for you, and nothing has set it.
          </p>
        ) : (
          <dl className="ww-facts">
            <Fact label="Reputation">
              <span className="cf-num">{profile.reputation}</span>
            </Fact>
            <Fact label="Age bracket">
              {/* Shown, never editable. See the file header. */}
              <span className="cf-num">{profile.ageBracket}</span>
            </Fact>
            <Fact label="Created">{timestamp(profile.createdAt)}</Fact>
            <Fact label="Updated">{timestamp(profile.updatedAt)}</Fact>
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
            Recorded against the account rather than against a world, so they hold everywhere.
          </p>
          <ul className="ww-sanctions">
            {profile.sanctions.map((sanction, index) => (
              <li className="ww-sanction" key={`${sanction.kind}-${sanction.appliedAt}-${index}`}>
                <p className="ww-sanction__kind cf-num">{sanction.kind}</p>
                <p className="ww-sanction__reason">{sanction.reason}</p>
                <p className="ww-sanction__meta">
                  Applied {timestamp(sanction.appliedAt)} ·{' '}
                  {sanction.expiresAt === null
                    ? 'no expiry'
                    : `expires ${timestamp(sanction.expiresAt)}`}{' '}
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
        <h2 className="ww-panel__title">Achievements</h2>
        <p className="ww-panel__subtitle">
          Unlocked by a title and recorded here, so they survive the title. Points are a record, not
          a currency: nothing on this platform can be bought with them.
        </p>
        {snapshot.achievements.length === 0 ? (
          <p className="ww-absent ww-absent--block">
            Nothing unlocked yet. A title reports an achievement to the platform when you earn it;
            no title can unlock one on your behalf from here.
          </p>
        ) : (
          <ul className="ww-achievements">
            {snapshot.achievements.map((achievement) => (
              <li className="ww-achievement" key={`${achievement.titleId}-${achievement.key}`}>
                <p className="ww-achievement__name">{achievement.name}</p>
                <p className="ww-achievement__meta">
                  <code className="cf-num">{achievement.key}</code> ·{' '}
                  <span className="cf-num">{achievement.points}</span> points · unlocked{' '}
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
 * is not a string (`worlds/src/server.ts:558`), so omitting it CLEARS it. The form therefore always
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
        // Empty means CLEARED, and null is how the service spells that (`server.ts:558`).
        avatarAssetUrn: avatar.trim().length === 0 ? null : avatar.trim(),
      }),
    'Your profile could not be saved.',
  )

  // The service's own rule, checked here so the refusal arrives before the round trip rather than
  // as a 400: `worlds/src/players.ts:111-114` requires 1 to 40 characters after trimming.
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
          What every title shows for you. 1 to 40 characters — the platform refuses the rest
          (<code className="cf-num">worlds/src/players.ts:111-114</code>).
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
            That is {trimmed.length} characters. The platform accepts 40.
          </span>
        )}
      </label>

      <label className="ww-field">
        <span className="ww-field__label">Avatar asset</span>
        <span className="ww-field__hint">
          An asset URN. Leaving this empty clears it — this is a full replace, not a patch, so the
          form submits both fields every time.
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
        {save.busy ? 'Saving…' : profile === null ? 'Create your profile' : 'Save'}
      </button>

      {save.error !== null && <Failed notice={save.error} title="Your profile was not saved" />}
    </form>
  )
}

/**
 * What the account is wearing, per title and across all of them.
 *
 * Clearing a slot is the only cosmetic write this screen offers, and it is offered because the
 * service treats it as unconditional: `worlds/src/server.ts:585-590` skips the entitlement check
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
    'That slot could not be cleared.',
  )

  const groups = Object.entries(profile?.equippedCosmetics ?? {})

  return (
    <section className="ww-panel" aria-label="What you are wearing">
      <h2 className="ww-panel__title">Wardrobe</h2>
      <p className="ww-panel__subtitle">
        Keyed by title, with a cross-title default. A title with no preference set renders the
        default, so “my frame” and “my frame in each game” are both representable.
      </p>

      {groups.length === 0 ? (
        <p className="ww-absent ww-absent--block">
          Nothing equipped. Cosmetics are checked against your purchases when you set them and
          never when you take them off.
        </p>
      ) : (
        groups.map(([scope, slots]) => (
          <div className="ww-wardrobe" key={scope}>
            <h3 className="ww-wardrobe__scope">
              {scope === CROSS_TITLE ? (
                'Every title'
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
                    Take off
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
            // (`worlds/src/server.ts:341-348`), and it has its own code. A 503 here is "ask again
            // later", not "something is broken" — and saying so is the difference between a player
            // who waits a minute and a player who files a bug.
            clear.error.message.includes('cannot check your purchases')
              ? 'Your purchases could not be checked just now'
              : 'That slot was not cleared'
          }
        />
      )}
    </section>
  )
}
