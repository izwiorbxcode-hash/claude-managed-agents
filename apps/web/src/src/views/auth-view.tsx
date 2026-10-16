import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

const MODE = {
  signIn: {
    cta: "Sign in",
    heading: "Welcome back",
    intro:
      "Sign in to keep contributing recordings and track what happens to them.",
    submit: "Sign in",
    switchCopy: "No account yet?",
    switchCta: "Create one",
    switchTo: "/sign-up",
  },
  signUp: {
    cta: "Create account",
    heading: "Start contributing",
    intro:
      "Create an account to submit recordings, correct transcripts, and add the meaning only speakers can hold.",
    submit: "Create account",
    switchCopy: "Already have an account?",
    switchCta: "Sign in",
    switchTo: "/sign-in",
  },
} as const;

type Mode = keyof typeof MODE;

const MIN_PASSWORD_LENGTH = 12;

/** Pulls the most useful message out of whatever Better Auth threw. */
function errorMessage(cause: unknown): string {
  if (typeof cause === "object" && cause !== null) {
    const { body } = cause as { body?: { message?: string } };
    if (body?.message) {
      return body.message;
    }
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  return "Something went wrong. Please try again.";
}

export function AuthView({ mode }: { mode: Mode }) {
  const copy = MODE[mode];
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const onName = useCallback((value: string) => setName(value), []);
  const onEmail = useCallback((value: string) => setEmail(value), []);
  const onPassword = useCallback((value: string) => setPassword(value), []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      if (mode === "signUp" && !name.trim()) {
        setError("Tell us what to call you.");
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(
          `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
        );
        return;
      }

      setBusy(true);
      try {
        if (mode === "signUp") {
          await authClient.signUp.email({ email, name: name.trim(), password });
        } else {
          await authClient.signIn.email({ email, password });
        }
        navigate(redirectTo, { replace: true });
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setBusy(false);
      }
    },
    [email, mode, name, navigate, password, redirectTo]
  );

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <span className="section-kicker">{copy.cta}</span>
        <h1 className="auth-heading">{copy.heading}</h1>
        <p className="auth-intro">{copy.intro}</p>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signUp" ? (
            <TextField
              autoComplete="name"
              label="Your name"
              onValueChange={onName}
              value={name}
            />
          ) : null}

          <TextField
            autoComplete="email"
            label="Email"
            onValueChange={onEmail}
            type="email"
            value={email}
          />

          <TextField
            autoComplete={
              mode === "signUp" ? "new-password" : "current-password"
            }
            hint={
              mode === "signUp"
                ? `At least ${MIN_PASSWORD_LENGTH} characters.`
                : null
            }
            label="Password"
            minLength={MIN_PASSWORD_LENGTH}
            onValueChange={onPassword}
            type="password"
            value={password}
          />

          {error ? (
            <p className="error-message" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Working…" : copy.submit}
          </button>
        </form>

        <p className="auth-switch">
          {copy.switchCopy} <Link to={copy.switchTo}>{copy.switchCta}</Link>
        </p>
      </div>
    </section>
  );
}

/**
 * Labelled input that wires its own change handler once, so callers pass a
 * stable `onValueChange` callback instead of an inline arrow per field.
 */
function TextField({
  autoComplete,
  hint = null,
  label,
  minLength,
  onValueChange,
  type = "text",
  value,
}: {
  autoComplete: string;
  hint?: string | null;
  label: string;
  minLength?: number;
  onValueChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange]
  );

  return (
    <label className="field">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        minLength={minLength}
        onChange={onChange}
        required
        type={type}
        value={value}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
