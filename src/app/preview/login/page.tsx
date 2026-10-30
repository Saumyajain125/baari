import { LoginPreview } from "@/components/auth/AuthPreviews";

/**
 * Sign-in screen with fake callbacks (any password is "wrong").
 * `?mode=create` shows the create-account toggle, `?state=error` a failed
 * sign-in, `?state=unconfigured` the Firebase setup card, `?state=loading`
 * the branded loader shown between screens.
 */
export default async function LoginPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; state?: string }>;
}) {
  const { mode, state } = await searchParams;
  return <LoginPreview mode={mode === "create" ? "create" : "sign-in"} state={state} />;
}
