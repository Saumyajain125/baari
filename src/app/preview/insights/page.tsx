import { InsightsPreview } from "@/components/insights/InsightsPreview";

/** /preview/insights?state=loading|empty&doctors=1 */
export default async function InsightsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const state = q.state === "loading" || q.state === "empty" ? q.state : "ready";
  return <InsightsPreview state={state} singleDoctor={q.doctors === "1"} />;
}
