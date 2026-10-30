import { describe, expect, it } from "vitest";
import type { QueueRowView } from "@/lib/queue/logic";
import { matchesQuery, shortDoctorName } from "./search";

function row(patch: Partial<QueueRowView>): QueueRowView {
  return {
    id: "A-26",
    label: "A-26",
    name: "Baby Arjun",
    displayName: "Baby Arjun",
    phoneMasked: "99280 •••12",
    isWalkIn: false,
    visitType: "new",
    visitTypeLabel: "New",
    distance: "here",
    distanceLabel: "Here",
    distanceLabelCompact: "Here",
    priority: false,
    noReplyElapsed: null,
    waitedLabel: "3 min",
    longWait: false,
    tone: "normal",
    pending: false,
    ...patch,
  };
}

describe("matchesQuery", () => {
  const arjun = row({});

  it("matches everything when the query is blank", () => {
    expect(matchesQuery(arjun, "")).toBe(true);
    expect(matchesQuery(arjun, "   ")).toBe(true);
  });

  it("matches tokens with or without the dash, and by number", () => {
    expect(matchesQuery(arjun, "A-26")).toBe(true);
    expect(matchesQuery(arjun, "a26")).toBe(true);
    expect(matchesQuery(arjun, "26")).toBe(true);
    expect(matchesQuery(arjun, "B-26")).toBe(false);
    expect(matchesQuery(arjun, "A-27")).toBe(false);
  });

  it("matches names case-insensitively", () => {
    expect(matchesQuery(arjun, "arjun")).toBe(true);
    expect(matchesQuery(arjun, "BABY AR")).toBe(true);
    expect(matchesQuery(arjun, "kamla")).toBe(false);
  });

  it("matches the visible digits of a masked phone", () => {
    expect(matchesQuery(arjun, "99280")).toBe(true);
    expect(matchesQuery(arjun, "9928")).toBe(true);
    expect(matchesQuery(arjun, "12")).toBe(true);
    expect(matchesQuery(arjun, "99280 55512")).toBe(true);
    expect(matchesQuery(arjun, "9928055599")).toBe(false);
    expect(matchesQuery(arjun, "70140")).toBe(false);
  });

  it("does not match phone digits for walk-ins without a phone", () => {
    const kamla = row({ label: "A-25", name: "Kamla Bai", phoneMasked: null, isWalkIn: true });
    expect(matchesQuery(kamla, "99280")).toBe(false);
    expect(matchesQuery(kamla, "25")).toBe(true);
  });
});

describe("shortDoctorName", () => {
  it("keeps the title and surname", () => {
    expect(shortDoctorName("Dr. Anita Sharma")).toBe("Dr. Sharma");
    expect(shortDoctorName("Dr Rohit Kumar Verma")).toBe("Dr Verma");
  });

  it("leaves short or untitled names alone", () => {
    expect(shortDoctorName("Dr. Mehta")).toBe("Dr. Mehta");
    expect(shortDoctorName("Anita Sharma")).toBe("Anita Sharma");
  });
});
