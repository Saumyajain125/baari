import type { Metadata } from "next";
import { SetupScreen } from "@/components/auth/SetupScreen";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata(
  {
    title: "Set up your clinic",
    description: "Add your clinic, doctors and reception staff, then print the QR poster.",
  },
  { staffApp: true },
);

export default function SetupPage() {
  return <SetupScreen />;
}
