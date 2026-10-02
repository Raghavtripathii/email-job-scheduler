import { useSearchParams } from 'react-router-dom';
import { loginUrl } from '../api/auth';
import { Button } from '../components/ui/Button';

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
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
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

export function LoginPage() {
  const [params] = useSearchParams();
  const code = params.get('error');
  const message = code ? (MESSAGES[code] ?? 'Login failed, please try again.') : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Email Scheduler</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to schedule and track your emails.</p>

        {message && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}

        <Button
          variant="secondary"
          className="mt-6 w-full py-2.5"
          onClick={() => {
            window.location.href = loginUrl;
          }}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>
    </div>
  );
}