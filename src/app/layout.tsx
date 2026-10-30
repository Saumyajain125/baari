import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/share";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["600", "700", "800"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
});

// The icons (favicon.ico, icon.svg, apple-icon.png) and the Open Graph image
// come from the file conventions in this folder; staff pages add the manifest.
export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#0E7C7B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables must live on <html>: the @theme tokens (--font-sans,
    // --font-display) are declared on :root and resolve these vars there.
    <html lang="en" className={`${inter.variable} ${baloo.variable} ${devanagari.variable}`}>
      <body>{children}</body>
    </html>
  );
}
