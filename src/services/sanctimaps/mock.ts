import type { DailySaints } from "@/lib/types";

/** Données fictives pour le développement local uniquement (SANCTIMAPS_MOCK=true). */
export function mockSaints(date: string, siteUrl: string): DailySaints {
  return {
    date,
    saints: [
      {
        name: "Saint Maurice",
        description:
          "Chef de la légion thébaine, martyrisé à Agaune avec ses compagnons pour avoir refusé de renier leur foi.",
        biography:
          "Originaire de Haute-Égypte, Maurice commandait une légion romaine composée de chrétiens. Selon la tradition, il refusa avec ses soldats de participer à des persécutions et fut exécuté vers l'an 287 à Agaune, l'actuelle Saint-Maurice en Valais.",
        image: `${siteUrl}/images/saints/saint-maurice.jpg`,
        url: `${siteUrl}/saints/saint-maurice`,
      },
    ],
  };
}
