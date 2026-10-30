import type { Metadata } from "next";
import { ReceptionApp } from "@/components/reception/ReceptionApp";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata(
  {
    title: "Reception",
    description: "The clinic's reception desk: add walk-ins, call the next patient and pause the queue.",
  },
  { staffApp: true },
);

export default function ReceptionPage() {
  return <ReceptionApp />;
}
