# Mise en ligne sur Vercel

Tout se fait depuis un navigateur (ordinateur ou téléphone), sans ligne de commande.
Durée : environ 30 minutes.

Ce qu'il faut :

- le compte GitHub qui contient ce dépôt ;
- un compte **Vercel** (gratuit) ;
- les **identifiants SMTP** de la boîte qui enverra la newsletter (hébergeur mail, OVH, Gandi, o2switch, Infomaniak…) ;
- un compte **cron-job.org** (gratuit), qui déclenchera l'envoi automatique.

> Le plan gratuit de Vercel (« Hobby ») est prévu pour un usage personnel et non commercial.
> Si SanctiMaps a une activité commerciale, passez au plan Pro.

---

## 1. Importer le projet

1. Aller sur **vercel.com** → *Sign Up* → *Continue with GitHub*.
2. *Add New…* → *Project* → choisir le dépôt **Newslatter-** → *Import*.
   Si le dépôt n'apparaît pas : *Adjust GitHub App Permissions* et autoriser ce dépôt.
3. **Project Name** : par exemple `sanctimaps-newsletter`.
   L'adresse du site sera alors `https://sanctimaps-newsletter.vercel.app`.
4. Laisser *Framework Preset* sur **Next.js** et ne rien changer aux autres réglages.
5. Cliquer sur **Deploy**.
   Ce premier déploiement **échoue** avec le message « DATABASE_URL manquante ». C'est normal :
   la base de données n'existe pas encore.

## 2. Créer la base de données

1. Dans le projet Vercel : onglet **Storage** → *Create Database* → **Neon** (PostgreSQL) → *Continue*.
2. **Region** : choisir **Frankfurt (eu-central-1)**. L'application est réglée pour tourner à Francfort
   et les données restent dans l'Union européenne.
3. Plan **Free** → *Create* → *Connect* au projet, en cochant tous les environnements.

Vercel ajoute alors automatiquement `DATABASE_URL` et `DATABASE_URL_UNPOOLED` au projet.

## 3. Renseigner les variables d'environnement

Dans le projet : **Settings** → **Environment Variables**. Ajouter chaque variable (*Key* / *Value*),
environnement **Production** coché.

| Clé | Valeur |
|---|---|
| `APP_URL` | `https://sanctimaps-newsletter.vercel.app` (votre adresse, sans `/` final) |
| `ADMIN_EMAIL` | votre adresse de connexion à l'administration |
| `ADMIN_PASSWORD` | un mot de passe d'au moins 12 caractères |
| `SESSION_SECRET` | une suite aléatoire d'au moins 40 caractères |
| `CRON_SECRET` | une autre suite aléatoire d'au moins 30 caractères (à garder pour l'étape 5) |
| `SANCTIMAPS_MOCK` | `true` (données fictives tant que l'endpoint SanctiMaps n'existe pas) |
| `SMTP_HOST` | serveur SMTP, ex. `ssl0.ovh.net` |
| `SMTP_PORT` | `587` (ou `465`) |
| `SMTP_SECURE` | `false` pour le port 587, `true` pour le port 465 |
| `SMTP_USER` | identifiant SMTP (souvent l'adresse e-mail) |
| `SMTP_PASSWORD` | mot de passe SMTP |
| `SMTP_FROM_EMAIL` | adresse expéditrice, ex. `newsletter@sanctimaps.fr` |
| `SMTP_FROM_NAME` | `SanctiMaps` |
| `SEND_TIME_BUDGET_MS` | `25000` (chaque passage tient dans les 30 s de cron-job.org) |

Facultatif :

- `LOGO_URL` : adresse HTTPS du logo SanctiMaps, affiché en haut des e-mails.
- `SMTP_RATE_PER_SECOND` : débit d'envoi, 5 par défaut. À augmenter si votre fournisseur SMTP l'autorise.

Pour les valeurs aléatoires : le générateur de mots de passe de votre gestionnaire (app
*Mots de passe* de l'iPhone, Bitwarden, 1Password…) convient très bien. Utilisez des lettres et des chiffres.

> Le port SMTP 25 est bloqué chez Vercel. Utilisez **587** ou **465**.
> Toutes ces valeurs restent côté serveur et ne sont jamais envoyées au navigateur.

## 4. Redéployer et vérifier

1. Onglet **Deployments** → sur le dernier déploiement, menu **⋯** → **Redeploy**.
   Le build crée les tables de la base automatiquement (`prisma migrate deploy`).
2. Ouvrir `https://…vercel.app/api/health`. La page doit afficher `{"ok":true}`.
3. Ouvrir `https://…vercel.app/admin` et se connecter avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
4. **Paramètres** → *Tester la connexion SMTP* → « Connexion SMTP réussie ».
5. **Newsletter** → *Envoyer un test* à votre adresse. Vérifiez la réception, y compris dans les indésirables.
6. **Formulaire** : `https://…vercel.app/subscribe`. Inscrivez-vous, puis confirmez depuis l'e-mail reçu.

> Chaque modification des variables d'environnement demande un **Redeploy** pour être prise en compte.

## 5. Programmer le déclenchement automatique (cron-job.org)

Le cron gratuit de Vercel ne se déclenche qu'une fois par jour, et à une heure imprécise.
On utilise donc cron-job.org, gratuit, qui appelle l'application toutes les 5 minutes
**pendant la matinée seulement**. L'application décide elle-même d'envoyer à l'heure programmée.
Elle n'envoie jamais deux fois la même newsletter, même si elle est appelée très souvent.

Pourquoi seulement le matin : la base Neon gratuite se met en veille quand personne ne s'en sert,
et son quota mensuel de temps de calcul serait épuisé si elle était réveillée toutes les 5 minutes,
jour et nuit.

1. **cron-job.org** → créer un compte → *Create cronjob*.
2. **URL** : `https://sanctimaps-newsletter.vercel.app/api/cron/tick`
3. **Execution schedule** → *Custom* :
   - *Minutes* : toutes les 5 (0, 5, 10 … 55) ;
   - *Hours* : **6, 7, 8, 9, 10** (pour un envoi programmé à 07:00) ;
   - *Days / Months / Weekdays* : tous ;
   - *Time zone* : **Europe/Paris**.

   Si vous changez l'heure d'envoi dans l'admin, décalez ces heures en conséquence :
   de 1 h avant jusqu'à 3 h après l'heure d'envoi.
4. Onglet **Advanced** :
   - *Request method* : `GET` ;
   - *Headers* → *Add* : clé `Authorization`, valeur `Bearer VOTRE_CRON_SECRET`
     (le mot `Bearer`, un espace, puis la valeur de `CRON_SECRET`) ;
   - *Timeout* : la valeur maximale proposée.
5. *Create*, puis ouvrir *History* après quelques minutes. Le statut doit être **200**, et la réponse
   `"scheduled":{"status":"disabled"}` tant que l'envoi automatique est désactivé. C'est normal.

Un statut **401** signifie que l'en-tête `Authorization` ne correspond pas à `CRON_SECRET`.

Si vous passez au plan **Pro** de Vercel, vous pouvez remplacer cron-job.org par le cron intégré.
Ajoutez dans `vercel.json` :
`"crons": [{ "path": "/api/cron/tick", "schedule": "*/5 * * * *" }]`.

## 6. Brancher SanctiMaps et activer l'envoi

1. Côté SanctiMaps, ajouter l'endpoint décrit dans [sanctimaps-endpoint.md](sanctimaps-endpoint.md).
2. Dans Vercel, modifier les variables puis faire un **Redeploy** :
   - `SANCTIMAPS_MOCK` = `false` ;
   - `SANCTIMAPS_API_URL` = `https://sanctimaps.fr/api/newsletter/today` ;
   - `SANCTIMAPS_API_KEY` = la même clé que celle configurée côté SanctiMaps.
3. Vérifier dans **Newsletter** que l'aperçu affiche bien le vrai saint du jour.
4. **Programmation** → cocher *Newsletter automatique*, régler l'heure → *Enregistrer*.

> ⚠️ N'activez pas l'envoi automatique tant que `SANCTIMAPS_MOCK=true` : les abonnés recevraient le saint fictif.

## 7. (Facultatif) Adresse personnalisée, ex. newsletter.sanctimaps.fr

1. Vercel → **Settings** → **Domains** → ajouter `newsletter.sanctimaps.fr`.
2. Chez le registrar de sanctimaps.fr, créer l'enregistrement DNS indiqué par Vercel
   (en général un `CNAME` `newsletter` → `cname.vercel-dns.com`).
3. Mettre `APP_URL` = `https://newsletter.sanctimaps.fr`, puis **Redeploy**.
4. Sur cron-job.org, remplacer l'URL par la nouvelle adresse.

Pour de bons taux de réception, vérifiez aussi chez votre fournisseur mail que les
enregistrements **SPF**, **DKIM** et **DMARC** de sanctimaps.fr autorisent le serveur SMTP utilisé.

## Bon à savoir

- **Volume** : chaque passage du scheduler envoie pendant 25 secondes au maximum, puis reprend au
  passage suivant, 5 minutes plus tard. À 5 e-mails par seconde, cela fait environ 125 e-mails par
  passage, soit environ 1 500 par heure. Augmentez `SMTP_RATE_PER_SECOND` si votre fournisseur SMTP
  le permet.
- **Journal** : les erreurs sont visibles dans l'admin (Programmation → Journal, Historique) et dans
  Vercel (onglet *Logs*).
- **Sauvegardes** : Neon conserve un historique de la base, restaurable depuis la console Neon.
- **Mises à jour** : chaque `git push` sur la branche de production redéploie automatiquement le site.
