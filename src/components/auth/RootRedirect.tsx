"use client";

import { AccountProblem, Redirect, ResolveAccount } from "./account";
import { AuthLoading } from "./AuthStatus";
import { FirebaseNotConfigured } from "./FirebaseNotConfigured";

/** "/": sends each device where it belongs: the desk, first-run setup, or sign in. */
export function RootRedirect() {
  return (
    <ResolveAccount>
      {(state) => {
        switch (state.kind) {
          case "unconfigured":
            return <FirebaseNotConfigured />;
          case "loading":
            return <AuthLoading label="Opening baari…" />;
          case "signed-out":
            return <Redirect to="/login" label="Opening baari…" />;
          case "no-clinic":
            return <Redirect to="/setup" label="Let's set up your clinic…" />;
          case "error":
            return <AccountProblem error={state.error} clinicId={state.clinicId} />;
          case "ready":
            return <Redirect to="/reception" />;
        }
      }}
    </ResolveAccount>
  );
}
