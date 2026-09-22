import { describe, expect, it } from "vitest";
import { InvalidSaintDataError, normalize } from "@/services/sanctimaps/schema";

const site = "https://sanctimaps.fr";

describe("normalisation des données SanctiMaps", () => {
  it("convertit la réponse au format interne, plusieurs saints possibles", () => {
    const out = normalize(
      {
        date: "2026-09-22",
        saints: [
          { name: "Saint Maurice", description: "<p>Martyr</p>", image: "/img/m.jpg", url: "/saints/maurice" },
          { title: "Saint Thomas de Villeneuve", summary: "Évêque", url: "https://sanctimaps.fr/saints/thomas" },
        ],
      },
      "2026-09-22",
      site,
    );
    expect(out.saints).toHaveLength(2);
    expect(out.saints[0]).toMatchObject({
      name: "Saint Maurice",
      description: "Martyr",
      image: "https://sanctimaps.fr/img/m.jpg",
      url: "https://sanctimaps.fr/saints/maurice",
    });
    expect(out.saints[1].name).toBe("Saint Thomas de Villeneuve");
  });

  it("refuse une date différente de celle demandée", () => {
    expect(() => normalize({ date: "2026-09-21", saints: [] }, "2026-09-22", site)).toThrow(InvalidSaintDataError);
  });

  it("refuse une journée sans saint exploitable", () => {
    expect(() =>
      normalize({ date: "2026-09-22", saints: [{ name: "Sans lien" }] }, "2026-09-22", site),
    ).toThrow(/Aucun saint/);
  });

  it("ignore les URL dangereuses", () => {
    const out = normalize(
      { date: "2026-09-22", saints: [{ name: "X", url: "/x", image: "javascript:alert(1)" }] },
      "2026-09-22",
      site,
    );
    expect(out.saints[0].image).toBeUndefined();
  });
});
