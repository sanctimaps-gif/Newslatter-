import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, localDate, localMinutes, newsletterKey, zonedTimeToUtc } from "@/lib/dates";

describe("dates", () => {
  it("génère une clé unique par date", () => {
    expect(newsletterKey("2026-09-22")).toBe("newsletter-2026-09-22");
  });

  it("calcule la date locale dans le fuseau", () => {
    // 23:30 UTC le 21 = 01:30 à Paris le 22 (heure d'été)
    const at = new Date("2026-09-21T23:30:00Z");
    expect(localDate(at, "Europe/Paris")).toBe("2026-09-22");
    expect(localDate(at, "UTC")).toBe("2026-09-21");
    expect(localMinutes(at, "Europe/Paris")).toBe(90);
  });

  it("convertit 07:00 Europe/Paris en UTC, été comme hiver", () => {
    expect(zonedTimeToUtc("2026-09-22", "07:00", "Europe/Paris").toISOString()).toBe("2026-09-22T05:00:00.000Z");
    expect(zonedTimeToUtc("2026-12-22", "07:00", "Europe/Paris").toISOString()).toBe("2026-12-22T06:00:00.000Z");
    // jour du changement d'heure (29 mars 2026)
    expect(zonedTimeToUtc("2026-03-29", "07:00", "Europe/Paris").toISOString()).toBe("2026-03-29T05:00:00.000Z");
  });

  it("valide les dates ISO et ajoute des jours", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-09-22")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
