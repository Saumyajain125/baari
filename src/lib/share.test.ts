import { describe, expect, it } from "vitest";
import { canDraw } from "@/lib/og/text";
import { joinShareText, shareMetadata, ticketShareText } from "@/lib/share";

describe("shareMetadata", () => {
  it("brands the tab title but not the preview title", () => {
    const meta = shareMetadata({ title: "TV display", description: "Now serving." });
    expect(meta.title).toBe("TV display · baari");
    expect(meta.openGraph?.title).toBe("TV display");
    expect(meta.openGraph?.siteName).toBe("baari");
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "TV display" });
  });

  it("names the site image unless the page has its own", () => {
    const text = { title: "Sign in", description: "Sign in." };
    expect(shareMetadata(text).openGraph?.images).toEqual([expect.objectContaining({ url: "/opengraph-image" })]);
    expect(shareMetadata(text, { ownImage: true }).openGraph).not.toHaveProperty("images");
  });

  it("links the home-screen manifest only on staff pages", () => {
    const text = { title: "Reception", description: "Desk." };
    expect(shareMetadata(text, { staffApp: true }).manifest).toBe("/manifest.webmanifest");
    expect(shareMetadata(text)).not.toHaveProperty("manifest");
  });
});

describe("joinShareText", () => {
  it("names the clinic", () => {
    const text = joinShareText("Sharma Family Clinic");
    expect(text.title).toBe("Join the queue at Sharma Family Clinic");
    expect(text.description).toContain("Sharma Family Clinic");
  });

  it("falls back to generic copy when the clinic can't be read", () => {
    expect(joinShareText(null).title).toBe("Join the clinic queue");
  });
});

describe("ticketShareText", () => {
  it("names the token, clinic and doctor", () => {
    const text = ticketShareText({ label: "A-25", clinicName: "Sharma Family Clinic", doctorName: "Dr. Anita Sharma" });
    expect(text.title).toBe("Token A-25 at Sharma Family Clinic");
    expect(text.description).toContain("token A-25 with Dr. Anita Sharma:");
  });

  it("leaves the doctor out when unknown", () => {
    const text = ticketShareText({ label: "A-25", clinicName: "Sharma Family Clinic", doctorName: null });
    expect(text.description).toMatch(/^Live status of token A-25: /);
  });

  it("falls back to generic copy when the ticket can't be read", () => {
    expect(ticketShareText(null).title).toBe("Your clinic token");
  });
});

describe("canDraw", () => {
  it("accepts Latin names with punctuation and accents", () => {
    expect(canDraw("Dr. Mehta's Clinic")).toBe(true);
    expect(canDraw("Clínica São José · 2")).toBe(true);
    expect(canDraw("A-125")).toBe(true);
  });

  it("rejects text Satori can't shape or has no glyphs for", () => {
    expect(canDraw("शर्मा क्लिनिक")).toBe(false);
    expect(canDraw("Sharma क्लिनिक")).toBe(false);
    expect(canDraw("Smile Clinic 😁")).toBe(false);
  });

  it("rejects missing text", () => {
    expect(canDraw(null)).toBe(false);
    expect(canDraw(undefined)).toBe(false);
    expect(canDraw("")).toBe(false);
  });
});
