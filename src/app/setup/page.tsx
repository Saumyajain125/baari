import type { Metadata } from "next";
import { SetupScreen } from "@/components/auth/SetupScreen";

export const metadata: Metadata = {
  title: "Set up your clinic · baari",
};

export default function SetupPage() {
  return <SetupScreen />;
}
