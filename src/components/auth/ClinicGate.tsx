"use client";

import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import type { Clinic } from "@/lib/types";
import { AccountProblem, Redirect, ResolveAccount } from "./account";
import { AuthLoading } from "./AuthStatus";
import { FirebaseNotConfigured } from "./FirebaseNotConfigured";

export interface ClinicSession {
  user: User;
  clinicId: string;
  /** Live: re-renders when the clinic doc changes (e.g. a rename in Settings). */
  clinic: Clinic;
}

/**
 * Renders `children` only for a signed-in account with a clinic. Signed-out
 * devices go to /login and accounts without a clinic to /setup; until then
 * it shows the branded loader.
 */
export function ClinicGate({ children }: { children: (session: ClinicSession) => ReactNode }) {
  return (
    <ResolveAccount>
      {(state) => {
        switch (state.kind) {
          case "unconfigured":
            return <FirebaseNotConfigured />;
          case "loading":
            return <AuthLoading />;
          case "signed-out":
            return <Redirect to="/login" label="Taking you to sign in…" />;
          case "no-clinic":
            return <Redirect to="/setup" label="Let's set up your clinic…" />;
          case "error":
            return <AccountProblem error={state.error} clinicId={state.clinicId} />;
          case "ready":
            return children({ user: state.user, clinicId: state.clinicId, clinic: state.clinic });
        }
      }}
    </ResolveAccount>
  );
}
