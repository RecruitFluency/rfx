import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, isConfigured } from '../../lib/supabase';
import { Button, ErrorNote, Field, Input } from '../components/ui';

const EDU = /^[^@\s]+@[^@\s]+\.edu$/i;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/portal';

  useEffect(() => {
    if (!isConfigured) return;
    db().auth.getSession().then(({ data }) => { if (data.session) navigate(from, { replace: true }); });
    const { data: sub } = db().auth.onAuthStateChange((_e, s) => { if (s) navigate(from, { replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate, from]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EDU.test(email.trim())) {
      setError('Use your school email address (ending in .edu).');
      return;
    }
    setBusy(true);
    const { error: err } = await db().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/portal`, shouldCreateUser: true },
    });
    setBusy(false);
    if (err) setError(err.message); else setSent(true);
  }

  async function devPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await db().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <div className="min-h-screen bg-vekt-black text-white font-geist flex flex-col">
      <div className="px-4 sm:px-10 pt-8">
        <img src="/vekt/vekt-lockup-white.svg" alt="VEKT" className="h-[30px] w-auto" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="vekt-label mb-4">Coach Portal</div>
          <h1 className="vekt-display text-[56px] mb-4">Sign in.</h1>
          <p className="text-vekt-grey font-light mb-10">
            Use your school email. We'll send you a one-time sign-in link. Access is set up by your athletic department.
          </p>

          {!isConfigured && <ErrorNote message="The portal isn't connected to a database yet." />}

          {sent ? (
            <div className="border border-white/20 rounded p-6">
              <p className="text-white">Check {email} for your sign-in link.</p>
              <p className="text-vekt-grey text-sm mt-2">It expires in an hour. You can close this tab.</p>
            </div>
          ) : (
            <form onSubmit={sendLink} className="flex flex-col gap-5">
              <Field label="School email">
                <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu" />
              </Field>
              {error && <ErrorNote message={error} />}
              <Button type="submit" variant="primary" loading={busy} disabled={!isConfigured}>Email me a sign-in link</Button>
            </form>
          )}

          {import.meta.env.DEV && !sent && (
            <form onSubmit={devPasswordLogin} className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col gap-4">
              <div className="vekt-label">Local development only</div>
              <Field label="Password (seeded demo users)">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="vekt-demo-2026" />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>Sign in with password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
