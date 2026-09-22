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
}

export interface DailySaints {
  date: string; // AAAA-MM-JJ
  saints: Saint[];
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
