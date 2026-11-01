import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/AuthStatus";
import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata(
  {
    title: "Insights",
    description: "Consult times, waits and busy hours for each doctor, over days and weeks.",
  },
  { staffApp: true },
);

export default function InsightsPage() {
  // InsightsScreen reads ?doctor= and ?range=, which needs a Suspense boundary on a static page.
  return (
    <Suspense fallback={<AuthLoading label="Opening insights…" />}>
      <InsightsScreen />
    </Suspense>
  );
}
