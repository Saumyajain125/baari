import type { Metadata } from "next";
import { ReceptionApp } from "@/components/reception/ReceptionApp";

export const metadata: Metadata = {
  title: "Reception · baari",
};

export default function ReceptionPage() {
  return <ReceptionApp />;
}
