"use client";

import { useCallback, useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { clearReceptionLock } from "@/components/reception/useReceptionLock";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import { AccountProblem, Redirect, ResolveAccount } from "./account";
import { AuthLoading } from "./AuthStatus";
import { FirebaseNotConfigured } from "./FirebaseNotConfigured";
import { LoginForm, type LoginMode } from "./LoginForm";

async function authenticate(mode: LoginMode, email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
  const { user } =
    mode === "create"
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password);
  await clearDeskLock(user.uid);
}

/**
 * Whoever knows the clinic password gets the desk back unlocked: the way past a
 * forgotten PIN, and a fresh start for the next person. Done at sign-in rather
 * than sign-out so a locked desk's other tabs never show the queue unlocked.
 */
async function clearDeskLock(uid: string): Promise<void> {
  try {
    const profile = await getDoc(doc(getDb(), paths.user(uid)));
    const clinicId: unknown = profile.data()?.clinicId;
    if (typeof clinicId === "string" && clinicId) clearReceptionLock(clinicId);
  } catch (e) {
    // Signed in either way; a staff PIN still opens the desk.
    console.error("Couldn't clear the desk lock", e);
  }
}

function sendReset(email: string): Promise<void> {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

/**
 * /login. Signing in (or creating the account) changes the auth state, and
 * the resolver below takes the device on to the desk or to first-run setup.
 */
export function LoginScreen() {
  // The account can resolve before the old desk lock is cleared; hold the desk
  // back until then so it doesn't open behind the PIN screen for a moment.
  const [settling, setSettling] = useState(false);
  const submit = useCallback(async (mode: LoginMode, email: string, password: string) => {
    setSettling(true);
    try {
      await authenticate(mode, email, password);
    } finally {
      setSettling(false);
    }
  }, []);

  return (
    <ResolveAccount>
      {(state) => {
        switch (state.kind) {
          case "unconfigured":
            return <FirebaseNotConfigured />;
          case "loading":
            return <AuthLoading label="Opening baari…" />;
          case "signed-out":
            return <LoginForm onSubmit={submit} onResetPassword={sendReset} />;
          case "no-clinic":
            return <Redirect to="/setup" label="Let's set up your clinic…" />;
          case "error":
            return <AccountProblem error={state.error} clinicId={state.clinicId} />;
          case "ready":
            return settling ? <AuthLoading label="Opening baari…" /> : <Redirect to="/reception" />;
        }
      }}
    </ResolveAccount>
  );
}
