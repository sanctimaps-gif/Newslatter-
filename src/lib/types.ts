/**
 * Format interne standardisé des données provenant de SanctiMaps.
 * Tout connecteur (API, endpoint JSON, …) doit produire ce format.
 */
export interface Saint {
  name: string;
  description: string;
  biography?: string;
  image?: string;
  url: string;
  feastType?: string;
  /** Dates de vie, ex. « 1887 – 1968 ». */
  life?: string;
  /** Lieu, ex. « Pietrelcina, Italie ». */
  place?: string;
}

export interface DailySaints {
  date: string; // AAAA-MM-JJ
  /** Saints du jour, du plus au moins « présentable ». */
  saints: Saint[];
  /** Nombre total de saints fêtés ce jour (peut dépasser saints.length). */
  total?: number;
  /** Page SanctiMaps listant tous les saints du jour. */
  dayUrl?: string;
}

export interface GeneratedNewsletter {
  key: string;
  date: string;
  subject: string;
  /** HTML contenant les marqueurs {{UNSUBSCRIBE_URL}} et {{FIRST_NAME}}. */
  html: string;
  text: string;
  saints: Saint[];
}
