export const metadata = { title: "Politique de confidentialité — Newsletter SanctiMaps" };

// Les mentions entre crochets doivent être complétées par le responsable du site.
export default function PrivacyPage() {
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="card">
        <h1>Politique de confidentialité de la newsletter</h1>
        <p className="hint">Dernière mise à jour : [date à compléter]</p>

        <h2>Responsable du traitement</h2>
        <p>
          SanctiMaps — [nom / raison sociale, adresse et e-mail de contact à compléter].
        </p>

        <h2>Données collectées</h2>
        <ul>
          <li>votre adresse e-mail (obligatoire) ;</li>
          <li>votre prénom (facultatif), pour personnaliser la salutation ;</li>
          <li>
            la preuve de votre consentement : date, texte accepté, adresse IP et navigateur lors de
            l&apos;inscription et de la confirmation ;
          </li>
          <li>l&apos;historique technique des envois (date, statut de remise).</li>
        </ul>
        <p>Aucune autre donnée n&apos;est collectée. Aucun pistage d&apos;ouverture ou de clic n&apos;est utilisé.</p>

        <h2>Finalité et base légale</h2>
        <p>
          Ces données servent uniquement à vous envoyer chaque jour la newsletter « Le saint du jour ».
          Le traitement repose sur votre consentement (article 6.1.a du RGPD), recueilli par double
          confirmation (double opt-in).
        </p>

        <h2>Destinataires</h2>
        <p>
          Vos données ne sont ni vendues ni cédées. Elles sont traitées par SanctiMaps et par son
          prestataire technique d&apos;envoi d&apos;e-mails (serveur SMTP), uniquement pour l&apos;envoi.
        </p>

        <h2>Durée de conservation</h2>
        <p>
          Tant que vous êtes abonné(e). Après désinscription, l&apos;adresse est conservée sous statut
          « désinscrit » uniquement pour garantir qu&apos;aucun e-mail ne vous soit plus envoyé et pour
          conserver la preuve de votre choix, sauf si vous demandez la suppression complète. Une
          inscription non confirmée sous 7 jours n&apos;est jamais activée.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez à tout moment vous désinscrire via le lien présent dans chaque e-mail, et demander la
          suppression complète de vos données depuis cette même page. Vous disposez aussi d&apos;un droit
          d&apos;accès, de rectification, d&apos;opposition et de portabilité : [e-mail de contact à
          compléter]. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>

        <h2>Sécurité</h2>
        <p>
          Les données sont hébergées sur un serveur sécurisé, transmises en HTTPS, et l&apos;accès à
          l&apos;administration est protégé par authentification.
        </p>
      </div>
    </main>
  );
}
