import Link from "next/link";
import { PublicMessage } from "@/components/public/ui";

/** Branded 404, in the same style as the public pages' "clinic not found" message. */
export default function NotFound() {
  return (
    <PublicMessage
      title="This page isn't here"
      action={
        <Link href="/" className="font-semibold">
          Open baari
        </Link>
      }
    >
      The link may be incomplete. If you scanned a clinic&apos;s QR code, scan it again or ask at reception.
    </PublicMessage>
  );
}
