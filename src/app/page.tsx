import type { Metadata } from "next";
import { RootRedirect } from "@/components/auth/RootRedirect";
import { staffAppMetadata } from "@/lib/share";

// The manifest's start_url: an installed reception app opens here.
export const metadata: Metadata = staffAppMetadata;

export default function Home() {
  return <RootRedirect />;
}
