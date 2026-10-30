import { SettingsPreview, SetupPreview } from "@/components/auth/AuthPreviews";
import type { SetupStep } from "@/components/auth/SetupWizard";

const STEPS: SetupStep[] = ["clinic", "doctors", "staff"];

/**
 * First-run setup with the design's clinic filled in and fake saving.
 * `?step=clinic|doctors|staff` opens a step; `?empty=1` starts blank.
 * `?screen=settings` shows Settings (the same data, edited later) against
 * in-memory data, since it has no artboard or preview route of its own.
 */
export default async function SetupPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; empty?: string; screen?: string }>;
}) {
  const { step, empty, screen } = await searchParams;
  if (screen === "settings") return <SettingsPreview />;
  const initial = STEPS.find((s) => s === step) ?? "clinic";
  return <SetupPreview key={`${initial}-${empty}`} step={initial} filled={empty !== "1"} />;
}
