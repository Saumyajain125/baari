import type { Metadata } from "next";
import { SettingsScreen } from "@/components/auth/settings/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings · baari",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
