const MESSAGES: Record<string, string> = {
  "test-sent": "E-mail de test envoyé.",
  "test-failed": "L'envoi du test a échoué. Consultez les logs.",
  "invalid-email": "Adresse e-mail invalide.",
  "confirm-required": "Veuillez cocher la case de confirmation.",
  saved: "Modifications enregistrées.",
  deleted: "Abonné supprimé définitivement.",
  invalid: "Requête invalide.",
  "invalid-schedule": "Programmation invalide (heure ou fuseau horaire).",
  "invalid-sender": "Expéditeur invalide.",
  "smtp-ok": "Connexion SMTP réussie.",
  "smtp-failed": "Connexion SMTP impossible. Consultez les logs.",
  "send-sent": "Newsletter envoyée.",
  "send-partial": "Envoi commencé : il se poursuit automatiquement par lots.",
  "send-failed": "L'envoi a échoué. Consultez l'historique.",
  "send-retry-scheduled": "Préparation échouée, nouvelle tentative programmée.",
  "send-already-sent": "La newsletter du jour a déjà été envoyée : aucun nouvel envoi.",
  "send-already-running": "Un envoi est déjà en cours.",
  "send-locked": "Un autre processus traite déjà cette newsletter.",
  "send-not-ready": "Nouvelle tentative déjà programmée.",
  "send-needs-manual-resume":
    "La newsletter du jour est en échec : utilisez « Reprendre » depuis l'historique.",
};

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  const code = error ?? ok;
  if (!code) return null;
  const text = MESSAGES[code] ?? "Opération effectuée.";
  return <div className={`alert ${error ? "err" : "ok"}`}>{text}</div>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Programmée",
  sending: "Envoi en cours",
  sent: "Envoyée",
  failed: "Échec",
  active: "Actif",
  pending: "En attente",
  unsubscribed: "Désinscrit",
  blocked: "Bloqué",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}
