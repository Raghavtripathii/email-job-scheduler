import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginUrl, loginWithEmail } from '../api/auth';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const MESSAGES: Record<string, string> = {
  google_denied: 'You cancelled the Google sign in.',
  bad_state: 'That login link expired, please try again.',
  bad_request: 'Something was off with the login, please try again.',
  no_id_token: 'Google did not send your details, please try again.',
  email_not_verified: 'Your Google email is not verified.',
  login_failed: 'Login failed, please try again.',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const field =
  'h-14 w-full rounded-xl bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30';

export function LoginPage() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const code = params.get('error');
  const urlMessage = code ? (MESSAGES[code] ?? 'Login failed, please try again.') : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginWithEmail(email, password);
      // the app sees the new user and moves to the dashboard
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed, please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[500px] rounded-xl border border-line px-[60px] py-[60px]">
        <h1 className="text-center text-[32px] font-bold leading-tight text-ink">Login</h1>

        {urlMessage && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {urlMessage}
          </div>
        )}

        <Button
          variant="soft"
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            window.location.href = loginUrl;
          }}
        >
          <GoogleIcon />
          Login with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted">or sign up through email</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email ID"
            autoComplete="email"
            required
            className={field}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className={field}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" size="lg" loading={busy} className="mt-3 w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
