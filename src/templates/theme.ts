/**
 * Paramètres visuels des e-mails. Modifier ce fichier (ou le template) ne
 * change rien au système de génération ni d'envoi.
 */
export const theme = {
  brandName: "SanctiMaps",
  colors: {
    background: "#f4f1ea",
    card: "#ffffff",
    primary: "#1f3a5f",
    accent: "#b8860b",
    text: "#2b2b2b",
    muted: "#6b6b6b",
    border: "#e6e0d4",
    buttonText: "#ffffff",
  },
  fontFamily: "Georgia, 'Times New Roman', serif",
  sansFamily: "Helvetica, Arial, sans-serif",
  maxWidth: 600,
};

/** Marqueurs remplacés individuellement pour chaque destinataire. */
export const PLACEHOLDERS = {
  unsubscribeUrl: "{{UNSUBSCRIBE_URL}}",
  greeting: "{{GREETING}}",
} as const;
