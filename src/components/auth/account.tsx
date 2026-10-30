"use client";

/**
 * Resolves "who is this device signed in as, and which clinic is theirs"
 * in three steps: auth user → users/{uid} → clinics/{clinicId}.
 *
 * Each step is its own component keyed by the id it reads. The Firestore
 * hooks start from { data: null, loading: false } while their id is missing,
 * and only flip to loading in an effect once it arrives; remounting per id
 * means a step never reports "no clinic" for an id it hasn't read yet, which
 * would otherwise bounce a signed-in owner to /setup for one frame.
 */
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut, type User } from "firebase/auth";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { useAuthUser, useClinic, useUserProfile } from "@/lib/hooks";
import type { Clinic } from "@/lib/types";
import { AuthLoading, AuthProblem } from "./AuthStatus";

export type AccountState =
  | { kind: "unconfigured" }
  | { kind: "loading" }
  /** No clinic account on this device. A patient's anonymous session counts as signed out. */
  | { kind: "signed-out" }
  /** Signed in, but the account has no clinic yet (or its clinic was deleted: then `clinicId` is that one). */
  | { kind: "no-clinic"; user: User; clinicId?: string }
  /** `clinicId` is set when the failure came after the account's clinic was known. */
  | { kind: "error"; user: User; error: Error; clinicId?: string }
  | { kind: "ready"; user: User; clinicId: string; clinic: Clinic };

type Render = (state: AccountState) => ReactNode;

export function ResolveAccount({ children }: { children: Render }) {
  const { user, loading } = useAuthUser();
  if (!firebaseConfigured) return children({ kind: "unconfigured" });
  if (loading) return children({ kind: "loading" });
  // Joining a queue as a patient in this browser leaves an anonymous session behind. It has no
  // users/{uid} doc and can't open a clinic, so treat it as signed out and offer the sign-in form;
  // signing in with the clinic's email and password replaces it.
  if (!user || user.isAnonymous) return children({ kind: "signed-out" });
  return (
    <ResolveProfile key={user.uid} user={user}>
      {children}
    </ResolveProfile>
  );
}

function ResolveProfile({ user, children }: { user: User; children: Render }) {
  const profile = useUserProfile(user.uid);
  if (profile.loading) return children({ kind: "loading" });
  if (profile.error) return children({ kind: "error", user, error: profile.error });
  const clinicId = profile.data?.clinicId;
  if (!clinicId) return children({ kind: "no-clinic", user });
  return (
    <ResolveClinic key={clinicId} user={user} clinicId={clinicId}>
      {children}
    </ResolveClinic>
  );
}

function ResolveClinic({ user, clinicId, children }: { user: User; clinicId: string; children: Render }) {
  const clinic = useClinic(clinicId);
  if (clinic.loading) return children({ kind: "loading" });
  if (clinic.error) return children({ kind: "error", user, error: clinic.error, clinicId });
  if (!clinic.data) return children({ kind: "no-clinic", user, clinicId });
  return children({ kind: "ready", user, clinicId, clinic: clinic.data });
}

/** Replaces the current history entry and shows the branded loader meanwhile. */
export function Redirect({ to, label }: { to: string; label?: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <AuthLoading label={label} />;
}

/**
 * Signs this device out of the clinic account. Screens follow the auth state to /login.
 * The desk's lock stays as it is: clearing it here would unlock the device's other tabs
 * before they notice the sign-out. Signing back in clears it (LoginScreen). `clinicId`
 * is no longer needed; it is accepted so existing callers keep working.
 */
export const signOutOfClinic: (clinicId?: string) => Promise<void> = () => signOut(getFirebaseAuth());

/** The account loaded but Firestore refused or failed: say so and offer a way out. */
export function AccountProblem({ error, clinicId }: { error: Error; clinicId?: string }) {
  const denied = "code" in error && error.code === "permission-denied";
  return (
    <AuthProblem
      title={denied ? "This account can't open the clinic" : "Couldn't load your clinic"}
      body={
        denied
          ? "It isn't set up to run this clinic's desk. Sign in with the clinic's own account, or ask the owner."
          : "Check the internet connection and try again."
      }
      actions={[
        { label: "Try again", onClick: () => window.location.reload(), primary: true },
        { label: "Sign out", onClick: () => void signOutOfClinic(clinicId).catch(() => window.location.reload()) },
      ]}
    />
  );
}
