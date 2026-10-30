import type { Metadata } from "next";
import { SettingsScreen } from "@/components/auth/settings/SettingsScreen";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata(
  {
    title: "Settings",
    description: "Clinic details, doctors and reception staff PINs.",
  },
  { staffApp: true },
);

export default function SettingsPage() {
  return <SettingsScreen />;
}
