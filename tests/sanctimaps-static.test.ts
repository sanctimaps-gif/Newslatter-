import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalize } from "@/services/sanctimaps/schema";
import { buildRequestUrl } from "@/services/sanctimaps/client";
import { NewsletterGenerator } from "@/services/newsletter/generator";

// Fichier réel publié par SanctiMaps : /api/newsletter/09-23.json
const fixture = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "fixtures/sanctimaps-09-23.json"), "utf8"),
);
const site = "https://sanctimaps.fr";

describe("fichiers statiques SanctiMaps (un par jour de l'année)", () => {
  it("construit l'URL du jour", () => {
    expect(buildRequestUrl("https://sanctimaps.fr/api/newsletter/{MM-DD}.json", "2026-09-23").toString()).toBe(
      "https://sanctimaps.fr/api/newsletter/09-23.json",
    );
    expect(buildRequestUrl("https://x.fr/api/today", "2026-09-23").toString()).toBe(
      "https://x.fr/api/today?date=2026-09-23",
    );
  });

  it("accepte le fichier du bon jour, quelle que soit l'année", () => {
    const out = normalize(fixture, "2026-09-23", site);
    expect(out.saints.length).toBe(fixture.saints.length);
    expect(out.total).toBe(fixture.total);
    expect(out.dayUrl).toBe("https://sanctimaps.fr/calendrier/23-septembre/");
    expect(out.saints[0].url).toMatch(/^https:\/\/sanctimaps\.fr\/saints\/.+\/$/);
    expect(normalize(fixture, "2031-09-23", site).saints.length).toBeGreaterThan(0);
  });

  it("refuse le fichier d'un autre jour", () => {
    expect(() => normalize(fixture, "2026-09-24", site)).toThrow(/Date inattendue/);
  });

  it("présente 3 saints et résume les autres", async () => {
    const source = { getSaints: async (date: string) => normalize(fixture, date, site) };
    const nl = await new NewsletterGenerator(source, {
      siteUrl: site,
      privacyUrl: "https://nl.example/confidentialite",
      maxSaints: 3,
    }).generate("2026-09-23");
    const others = fixture.total - 3;
    expect(nl.saints).toHaveLength(3);
    expect(nl.subject).toBe(
      `Les saints du jour : ${normalize(fixture, "2026-09-23", site).saints.slice(0, 3).map((s) => s.name).join(", ")} et ${others} autres`,
    );
    expect(nl.html).toContain(`${others} autres saints sont également fêtés ce jour.`);
    expect(nl.html).toContain("https://sanctimaps.fr/calendrier/23-septembre/");
    expect(nl.text).toContain("Voir tous les saints du jour : https://sanctimaps.fr/calendrier/23-septembre/");
  });
});

describe("titre du saint", () => {
  it("ajoute « Saint » / « Sainte » sans le doubler", async () => {
    const { withTitle } = await import("@/services/sanctimaps/schema");
    expect(withTitle("Pio de Pietrelcina", "Saint")).toBe("Saint Pio de Pietrelcina");
    expect(withTitle("Élisabeth", "Sainte")).toBe("Sainte Élisabeth");
    expect(withTitle("San Simpliciano", "Saint")).toBe("San Simpliciano");
    expect(withTitle("Saint Maurice", "Saint")).toBe("Saint Maurice");
    expect(withTitle("Lin", null)).toBe("Lin");
    expect(normalize(fixture, "2026-09-23", site).saints[0].name).toBe("Saint Pio de Pietrelcina");
  });
});
