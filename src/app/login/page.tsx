import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata(
  {
    title: "Sign in",
    description: "Sign in to run your clinic's walk-in queue.",
  },
  { staffApp: true },
);

export default function LoginPage() {
  return <LoginScreen />;
}
