"use client";

import { createClinicWithSetup } from "@/lib/clinic-admin";
import { getFirebaseAuth } from "@/lib/firebase";
import { AccountProblem, Redirect, ResolveAccount, signOutOfClinic } from "./account";
import { AuthLoading } from "./AuthStatus";
import { FirebaseNotConfigured } from "./FirebaseNotConfigured";
import { SetupWizard, useSetupFlow } from "./SetupWizard";

function signOut(clinicId: string | undefined) {
  signOutOfClinic(clinicId).catch((e: unknown) => console.error("Sign out failed", e));
}

/**
 * /setup. Only an account without a clinic sees the wizard; everyone else is
 * sent on. Once the clinic is created, users/{uid} points at it and the
 * resolver takes the device to the desk.
 */
export function SetupScreen() {
  const flow = useSetupFlow();

  return (
    <ResolveAccount>
      {(state) => {
        if (state.kind === "unconfigured") return <FirebaseNotConfigured />;

        // Creating writes users/{uid} locally first, so the resolver can report "ready" before the
        // server answers; a refusal then rolls it back. Hold the wizard until the outcome is known,
        // and keep it (with its error) after a failure instead of following a rolled-back "ready".
        const holdWizard = flow.creating || (flow.createError !== null && state.kind !== "signed-out");
        const current = "user" in state ? state.user : getFirebaseAuth().currentUser;
        // A patient's anonymous session can't own a clinic (the rules refuse it): send it to sign in instead.
        const user = current && !current.isAnonymous ? current : null;
        if (user && (state.kind === "no-clinic" || holdWizard)) {
          const clinicId = "clinicId" in state ? state.clinicId : undefined;
          return (
            <SetupWizard
              accountEmail={user.email}
              draft={flow.draft}
              setDraft={flow.setDraft}
              step={flow.step}
              setStep={flow.setStep}
              creating={flow.creating}
              createError={flow.createError}
              onCreate={(input) => void flow.create(() => createClinicWithSetup(user.uid, input))}
              onSignOut={() => signOut(clinicId)}
            />
          );
        }

        switch (state.kind) {
          case "loading":
            return <AuthLoading />;
          case "signed-out":
            return <Redirect to="/login" label="Taking you to sign in…" />;
          case "error":
            return <AccountProblem error={state.error} clinicId={state.clinicId} />;
          case "ready":
            return <Redirect to="/reception" />;
        }
      }}
    </ResolveAccount>
  );
}
