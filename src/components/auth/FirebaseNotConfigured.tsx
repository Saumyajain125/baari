import type { ReactNode } from "react";
import { AuthCard, AuthTitle, PanelIntro } from "./AuthCard";

const ENV_LINES = [
  "NEXT_PUBLIC_FIREBASE_API_KEY=…",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID=…",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…",
  "NEXT_PUBLIC_FIREBASE_APP_ID=…",
];

/**
 * Shown instead of any account screen when the Firebase web config is
 * missing, so a fresh checkout explains itself rather than crashing.
 */
export function FirebaseNotConfigured() {
  return (
    <AuthCard
      panel={
        <PanelIntro
          title="Almost ready to open the desk"
          subtitle="baari keeps the queue in Firebase, so every tablet, phone and TV in the clinic stays in step."
          pill="One-time setup, about 5 minutes"
        />
      }
      footnote="This screen only appears while the app has no Firebase project to talk to."
    >
      <AuthTitle>Firebase isn&apos;t configured</AuthTitle>
      <p className="-mt-2 text-[15px] leading-normal text-muted">
        The app needs your Firebase project&apos;s web config before anyone can sign in.
      </p>

      <ol className="flex list-none flex-col gap-4 text-[15px] leading-normal">
        <Step n={1}>
          In the Firebase console, create a project and add a <strong>Web app</strong>.
        </Step>
        <Step n={2}>
          Turn on <strong>Authentication</strong> (Email/Password and Anonymous) and create a{" "}
          <strong>Firestore</strong> database.
        </Step>
        <Step n={3}>
          Create <Code>.env.local</Code> in the project folder with the web app&apos;s config (Project settings, Your apps):
          <pre className="mt-3 overflow-x-auto rounded-[14px] bg-ink px-4 py-3 font-mono text-[11px] leading-[1.7] sm:text-[12.5px] text-white/90">
            {ENV_LINES.join("\n")}
          </pre>
        </Step>
        <Step n={4}>
          Restart the dev server (<Code>npm run dev</Code>) and reload this page.
        </Step>
      </ol>

      <p className="rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px] leading-normal text-muted">
        Using the local emulators? Set the project id, any API key, and{" "}
        <Code>NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true</Code>.
      </p>
    </AuthCard>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-tint font-display text-[15px] leading-none font-bold text-teal-dark"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-[2px]">{children}</div>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[6px] bg-teal-tint px-1.5 py-0.5 font-mono text-[13px] break-words text-teal-darker">
      {children}
    </code>
  );
}
