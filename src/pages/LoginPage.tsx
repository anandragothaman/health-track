import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../services/api';
import { ErrorBox, Field, Segmented } from '../components/ui';
import { AuthShell } from './AuthShell';

type Mode = 'signin' | 'signup' | 'reset';

export function LoginPage() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode !== 'reset' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setNotice('Check your email and click the confirmation link, then sign in here.');
          setMode('signin');
        }
      } else {
        await sendPasswordReset(email.trim());
        setNotice('If an account exists for that email, a reset link has been sent. Open it on this device, in this browser.');
      }
    } catch (err) {
      const msg = errorMessage(err);
      setError(/invalid login credentials/i.test(msg) ? 'Email or password is incorrect.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Family Health Track" subtitle="Sign in to see your family's readings">
      <Segmented<Mode>
        label="Account action"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: 'signin', label: 'Sign in' },
          { value: 'signup', label: 'Create account' },
          { value: 'reset', label: 'Forgot password' },
        ]}
      />
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <Field id="email" label="Email">
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {mode !== 'reset' && (
          <Field id="password" label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {error && <ErrorBox message={error} />}
        {notice && (
          <p role="status" className="rounded-xl bg-ok-soft p-3 text-ink">
            {notice}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy || !email}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>
      </form>
      {mode === 'signup' && (
        <p className="mt-4 text-sm text-muted">
          After creating an account you can start a new family or join an existing one with an invite code. The family
          can also share a single login.
        </p>
      )}
    </AuthShell>
  );
}
