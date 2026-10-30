import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, Noto_Sans_Devanagari } from "next/font/google";
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

export const metadata: Metadata = {
  title: "baari · Clinic queue",
  description: "Walk-in queue for clinics: reception desk, TV display and patient updates.",
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
