"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthCard, AuthTitle, PanelIntro } from "./AuthCard";
import { friendlyError } from "./auth-errors";
import { ErrorNote, LinkButton, PrimaryButton, SuccessNote, TextField, ToggleButton } from "./ui";

export type LoginMode = "sign-in" | "create";

export interface LoginFormProps {
  initialMode?: LoginMode;
  initialEmail?: string;
  /** Preview only: start with this error showing. */
  initialError?: string;
  /** Rejects with a Firebase error on failure; success is picked up from the auth state. */
  onSubmit(mode: LoginMode, email: string, password: string): Promise<void>;
  onResetPassword(email: string): Promise<void>;
}

type FieldErrors = Partial<Record<"email" | "password", string>>;

const MIN_PASSWORD = 6;

const COPY: Record<LoginMode, { title: string; intro: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in to your clinic",
    intro: "Use the clinic account that runs this desk.",
    submit: "Sign in",
    busy: "Signing in…",
  },
  create: {
    title: "Create your clinic account",
    intro: "One account per clinic. You'll add doctors and desk staff next.",
    submit: "Create account",
    busy: "Creating account…",
  },
};

function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Email and password sign-in, with a toggle to create the clinic's account. */
export function LoginForm({
  initialMode = "sign-in",
  initialEmail = "",
  initialError,
  onSubmit,
  onResetPassword,
}: LoginFormProps) {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"submit" | "reset" | null>(null);
  // Bumped on each failed check so focus moves to the first bad field, even when it was already bad.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0) return;
    if (fieldErrors.email) emailRef.current?.focus();
    else if (fieldErrors.password) passwordRef.current?.focus();
  }, [attempt, fieldErrors]);

  const copy = COPY[mode];
  const trimmedEmail = email.trim();

  function switchMode(next: LoginMode) {
    setMode(next);
    setFieldErrors({});
    setError(null);
    setNotice(null);
  }

  function reject(errors: FieldErrors) {
    setFieldErrors(errors);
    setAttempt((n) => n + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const errors: FieldErrors = {};
    if (!looksLikeEmail(trimmedEmail)) errors.email = trimmedEmail ? "That email address doesn't look right." : "Type your email address.";
    if (!password) errors.password = "Type your password.";
    else if (mode === "create" && password.length < MIN_PASSWORD)
      errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    setError(null);
    setNotice(null);
    if (errors.email || errors.password) return reject(errors);

    setFieldErrors({});
    setBusy("submit");
    try {
      await onSubmit(mode, trimmedEmail, password);
    } catch (e) {
      setError(friendlyError(e));
      passwordRef.current?.select();
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!looksLikeEmail(trimmedEmail)) {
      return reject({ email: "Type your email above, then tap Forgot password again." });
    }
    setFieldErrors({});
    setBusy("reset");
    try {
      await onResetPassword(trimmedEmail);
      setNotice(`If ${trimmedEmail} has a clinic account, a reset link is on its way. Check the inbox and spam folder.`);
    } catch (e) {
      setError(friendlyError(e, "Couldn't send the reset email. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthCard
      panel={
        <PanelIntro
          title="Walk-in queue for small clinics"
          subtitle="Run the desk from a tablet, laptop or phone. Patients scan a QR poster and watch the TV."
          pill="Keeps working when the internet drops"
        />
      }
      footnote="One account per clinic. Desk staff unlock reception with their own 4 digit PIN."
    >
      <div className="flex flex-col gap-2">
        <AuthTitle>{copy.title}</AuthTitle>
        <p className="text-[15px] text-muted">{copy.intro}</p>
      </div>

      <div role="group" aria-label="Account" className="grid grid-cols-2 gap-2">
        <ToggleButton pressed={mode === "sign-in"} onClick={() => switchMode("sign-in")}>
          Sign in
        </ToggleButton>
        <ToggleButton pressed={mode === "create"} onClick={() => switchMode("create")}>
          Create account
        </ToggleButton>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-[18px]" aria-label={copy.title}>
        <TextField
          ref={emailRef}
          id={`${id}-email`}
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="reception@yourclinic.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          ref={passwordRef}
          id={`${id}-password`}
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "create" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint={mode === "create" ? `At least ${MIN_PASSWORD} characters.` : undefined}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="h-12 rounded-[10px] px-3 text-[14px] font-semibold text-teal-dark hover:bg-hover"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        {error && <ErrorNote>{error}</ErrorNote>}
        {notice && <SuccessNote>{notice}</SuccessNote>}

        <PrimaryButton type="submit" busy={busy === "submit"} className="mt-1 w-full">
          {busy === "submit" ? copy.busy : copy.submit}
        </PrimaryButton>
      </form>

      {mode === "sign-in" ? (
        <LinkButton onClick={handleReset} disabled={busy !== null} className="-mt-2 self-center">
          {busy === "reset" ? "Sending reset link…" : "Forgot password?"}
        </LinkButton>
      ) : (
        <p className="-mt-2 text-center text-[13px] leading-normal text-muted">
          Use an email the clinic owner can always reach. Password resets go there.
        </p>
      )}
    </AuthCard>
  );
}
