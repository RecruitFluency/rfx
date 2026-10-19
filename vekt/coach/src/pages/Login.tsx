import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../session";
import { Frame } from "../Shell";
import { Button, ErrorNote, Field, Input } from "../components/ui";

// Sign in with a one-time code sent to the coach's school email. Accounts are
// created by VEKT or the department admin; public sign-up is off.
export default function Login() {
  const { session } = useSession();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (session) return <Navigate to={location.state?.from || "/"} replace />;

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    if (import.meta.env.DEV && password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false); if (error) setError(error.message); return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) setError("We couldn't send a code to that email. Use the email your department or club set up.");
    else setSent(true);
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("That code didn't work. Check the latest email, or send a new code.");
  };

  return (
    <Frame>
      <div className="vekt-label mb-4">Coach login</div>
      <h1 className="vekt-display text-[52px] mb-4">Recruit the person.</h1>
      <p className="text-vekt-grey mb-10 font-light">Sign in with your school email, or the email your club account uses. We'll send you a one-time code.</p>
      {!sent ? (
        <form onSubmit={send} className="flex flex-col gap-5">
          <Field label="School or club email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" /></Field>
          {import.meta.env.DEV && <Field label="Password (local dev only)" hint="Leave blank to get an email code."><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
          {error && <ErrorNote message={error} />}
          <Button variant="primary" loading={busy} type="submit">Send code</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-5">
          <Field label="Code" hint={`Sent to ${email}. It expires in an hour.`}><Input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          {error && <ErrorNote message={error} />}
          <Button variant="primary" loading={busy} type="submit">Sign in</Button>
          <button type="button" className="text-sm text-vekt-grey hover:text-white" onClick={() => { setSent(false); setCode(""); }}>Use a different email</button>
        </form>
      )}
    </Frame>
  );
}
