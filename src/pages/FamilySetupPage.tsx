import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { api, errorMessage } from '../services/api';
import { ErrorBox, Field, Segmented } from '../components/ui';
import { AuthShell } from './AuthShell';

type Mode = 'create' | 'join';

export default function FamilySetupPage() {
  const { user, signOut } = useAuth();
  const { reload } = useFamily();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        if (!name.trim()) throw new Error('Please enter a family name.');
        await api.createFamily(name.trim().slice(0, 80));
      } else {
        if (!code.trim()) throw new Error('Please enter the invite code.');
        await api.joinFamily(code.trim());
      }
      await reload();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Set up family access" subtitle={user?.email ? `Signed in as ${user.email}` : undefined}>
      <Segmented<Mode>
        label="Family setup"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'create', label: 'Start a new family' },
          { value: 'join', label: 'Join with invite code' },
        ]}
      />
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        {mode === 'create' ? (
          <Field id="family-name" label="Family name" hint="For example “The Kumar Family”. You can change it later.">
            <input id="family-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        ) : (
          <Field id="invite-code" label="Invite code" hint="Ask the family owner — it is shown on their Settings page.">
            <input
              id="invite-code"
              className="input font-mono uppercase tracking-widest"
              autoComplete="off"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
        )}
        {error && <ErrorBox message={error} />}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'create' ? 'Create family' : 'Join family'}
        </button>
      </form>
      <button type="button" className="btn-ghost mt-3 w-full" onClick={() => void signOut()}>
        Sign out
      </button>
    </AuthShell>
  );
}
