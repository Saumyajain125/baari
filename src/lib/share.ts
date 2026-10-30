import type { Metadata } from "next";

/**
 * Link-preview copy: what WhatsApp, SMS apps and social sites show when a
 * baari link is shared. Titles here leave out the brand; site_name carries it
 * in the preview and the browser tab adds " · baari".
 */

export const SITE_NAME = "baari";

export const SITE_TITLE = "baari · Walk-in queue for clinics";

export const SITE_DESCRIPTION =
  "Patients get a token, see how many people are ahead and know when it's their turn, without crowding the waiting room.";

export interface ShareText {
  title: string;
  description: string;
}

/**
 * Home-screen install for the clinic's own devices (public/manifest.webmanifest).
 * Only staff pages link the manifest: its start_url is "/", which would land a
 * patient who installed their token page on the staff sign-in screen.
 */
export const staffAppMetadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: SITE_NAME },
};

/** The site-wide preview image, src/app/opengraph-image.tsx. */
const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "baari: walk-in queue for clinics" };

/**
 * Tab title, description and the Open Graph / Twitter cards for one page.
 * A page that sets openGraph replaces the layout's, image included, so this
 * names the site image again, unless `ownImage` says the page's folder has
 * its own opengraph-image file (an image named here would override that file).
 * Twitter reuses the Open Graph image when it has none of its own. `staffApp`
 * adds the home-screen manifest (see staffAppMetadata).
 */
export function shareMetadata(
  { title, description }: ShareText,
  { ownImage = false, staffApp = false } = {},
): Metadata {
  return {
    ...(staffApp ? staffAppMetadata : {}),
    title: `${title} · ${SITE_NAME}`,
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      title,
      description,
      ...(ownImage ? {} : { images: [SITE_IMAGE] }),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** /q/[clinicId]: the link on the QR poster and the TV. */
export function joinShareText(clinicName: string | null): ShareText {
  if (!clinicName) {
    return {
      title: "Join the clinic queue",
      description: "Get your token on your phone and see live how many people are ahead of you. No app needed.",
    };
  }
  return {
    title: `Join the queue at ${clinicName}`,
    description: `Get your token for ${clinicName} on your phone and see live how many people are ahead of you. No app needed.`,
  };
}

export interface TicketShare {
  label: string;
  clinicName: string;
  doctorName: string | null;
}

/** /q/[clinicId]/[ticketId]: a patient's own token page. */
export function ticketShareText(ticket: TicketShare | null): ShareText {
  if (!ticket) {
    return {
      title: "Your clinic token",
      description: "Live status of your token: how many people are ahead, the approx wait and when it's your turn.",
    };
  }
  const withDoctor = ticket.doctorName ? ` with ${ticket.doctorName}` : "";
  return {
    title: `Token ${ticket.label} at ${ticket.clinicName}`,
    description: `Live status of token ${ticket.label}${withDoctor}: how many people are ahead, the approx wait and when it's your turn.`,
  };
}
