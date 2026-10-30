import { notFound } from "next/navigation";

/**
 * Dev-only design previews: each page renders one screen from the design
 * file with fixture data so it can be compared against design/reference/*.png.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
