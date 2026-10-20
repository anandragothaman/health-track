import { useEffect, useState } from 'react';
import { Copy, KeyRound, LogOut, UserMinus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { api, errorMessage } from '../../services/api';
import type { FamilyAccess } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorBox } from '../ui';

const formatCode = (c: string) => c.replace(/(.{4})(?=.)/g, '$1-');

export function FamilyAccessCard() {
  const { user, signOut } = useAuth();
  const { family, setFamily, reload } = useFamily();
  const [name, setName] = useState(family?.name ?? '');
  const [access, setAccess] = useState<FamilyAccess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<FamilyAccess | null>(null);
  const [leaving, setLeaving] = useState(false);
  const isOwner = family?.role === 'owner';

  useEffect(() => {
    if (!family) return;
    api.listAccess(family.id).then(setAccess).catch((e) => setError(errorMessage(e)));
  }, [family]);

  if (!family) return null;

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (ok) setNotice(ok);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const mine = access.find((a) => a.auth_user_id === user?.id);

  return (
    <section className="card space-y-5" aria-labelledby="family-title">
      <h2 id="family-title" className="text-lg font-bold">
        Family access
      </h2>

      <div>
        <label htmlFor="fam-name" className="label">
          Family name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="fam-name" className="input" maxLength={80} disabled={!isOwner} value={name} onChange={(e) => setName(e.target.value)} />
          {isOwner && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !name.trim() || name.trim() === family.name}
              onClick={() =>
                void wrap(async () => {
                  await api.renameFamily(family.id, name.trim());
                  setFamily({ ...family, name: name.trim() });
                }, 'Family name saved.')
              }
            >
              Save name
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="label">Invite code</p>
        {family.invite_code ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-subtle px-3 py-2 font-mono text-lg tracking-widest">{formatCode(family.invite_code)}</code>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                void navigator.clipboard?.writeText(family.invite_code!).then(() => setNotice('Invite code copied.'))
              }
            >
              <Copy className="h-4 w-4" aria-hidden /> Copy
            </button>
          </div>
        ) : (
          <p className="text-muted">Invites are turned off.</p>
        )}
        <p className="mt-1 text-sm text-muted">
          A relative creates their own account, chooses “Join with invite code” and enters this code. Everyone with access
          can see and add readings for every profile.
        </p>
        {isOwner && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() =>
                void wrap(async () => {
                  const code = await api.setInviteCode(family.id, true);
                  setFamily({ ...family, invite_code: code });
                }, 'A new invite code was created. The old one no longer works.')
              }
            >
              <KeyRound className="h-4 w-4" aria-hidden /> New code
            </button>
            {family.invite_code && (
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() =>
                  void wrap(async () => {
                    await api.setInviteCode(family.id, false);
                    setFamily({ ...family, invite_code: null });
                  }, 'Invites turned off.')
                }
              >
                Turn off invites
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="label">Accounts with access</p>
        <ul className="divide-y divide-line/60 rounded-xl border border-line/60">
          {access.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">
                {a.email ?? 'Unknown email'}
                {a.auth_user_id === user?.id && <span className="text-muted"> (you)</span>}
              </span>
              <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold uppercase text-muted">{a.role}</span>
              {isOwner && a.role !== 'owner' && (
                <button type="button" className="btn-ghost h-10 w-10 p-0 hover:text-crit" aria-label={`Remove ${a.email ?? 'account'}`} onClick={() => setRemove(a)}>
                  <UserMinus className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && <ErrorBox message={error} />}
      {notice && (
        <p role="status" className="rounded-xl bg-ok-soft p-3 text-ink">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line/60 pt-4">
        <button type="button" className="btn-secondary" onClick={() => void signOut()}>
          <LogOut className="h-5 w-5" aria-hidden /> Sign out
        </button>
        {!isOwner && mine && (
          <button type="button" className="btn-ghost text-crit" onClick={() => setLeaving(true)}>
            Leave this family
          </button>
        )}
      </div>

      <ConfirmDialog
        open={!!remove}
        title={`Remove ${remove?.email ?? 'this account'}?`}
        confirmLabel="Remove access"
        danger
        busy={busy}
        onCancel={() => setRemove(null)}
        onConfirm={() =>
          void wrap(async () => {
            await api.removeAccess(remove!.id);
            setAccess((list) => list.filter((x) => x.id !== remove!.id));
            setRemove(null);
          }, 'Access removed. Consider creating a new invite code.')
        }
      >
        They will no longer be able to see any readings. Profiles and readings are not deleted.
      </ConfirmDialog>
      <ConfirmDialog
        open={leaving}
        title="Leave this family?"
        confirmLabel="Leave family"
        danger
        busy={busy}
        onCancel={() => setLeaving(false)}
        onConfirm={() =>
          void wrap(async () => {
            await api.removeAccess(mine!.id);
            setLeaving(false);
            await reload();
          })
        }
      >
        You will lose access to all profiles and readings until someone shares an invite code again.
      </ConfirmDialog>
    </section>
  );
}
