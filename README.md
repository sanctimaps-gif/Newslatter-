# Newsletter SanctiMaps

Application **indépendante** qui envoie chaque jour « Le saint du jour » aux abonnés de
[SanctiMaps.fr](https://sanctimaps.fr). SanctiMaps n'est ni recréé ni modifié : il reste la
source des données, lues via un endpoint sécurisé (voir [docs/sanctimaps-endpoint.md](docs/sanctimaps-endpoint.md)).

```
SanctiMaps ──(GET /api/newsletter/today, Bearer)──▶ Newsletter App ──(SMTP)──▶ Abonnés
                                                     ├─ génération (template séparé)
                                                     ├─ abonnés (double opt-in, RGPD)
                                                     ├─ scheduler + anti-doublon
                                                     ├─ envoi par lots
                                                     └─ historique + logs
```

**Démo interactive** (données fictives, sans serveur) : https://sanctimaps-gif.github.io/Newslatter-/ — fichier `index.html` + `demo/`, publiés par GitHub Pages. L'application réelle, elle, doit être hébergée sur un serveur Node.js avec PostgreSQL (voir « Installation »).

**Stack** : Next.js 15 + TypeScript, PostgreSQL + Prisma, Nodemailer (SMTP). Aucune dépendance à Brevo.

## Organisation du code

| Dossier | Rôle |
|---|---|
| `src/services/sanctimaps/` | Connecteur SanctiMaps (`SaintSource`) + normalisation vers le format interne |
| `src/services/newsletter/generator.ts` | `NewsletterGenerator` : saint(s) → objet + HTML + texte |
| `src/templates/` | Templates e-mail (séparés de la logique ; couleurs dans `theme.ts`) |
| `src/services/email/` | `EmailProvider` (interface) → `SMTPProvider`. Rien d'autre n'appelle SMTP |
| `src/services/newsletter/sender.ts` | Préparation, envoi par lots, verrous, reprise, envoi test |
| `src/services/newsletter/scheduler.ts` | Logique du scheduler (`tick`) |
| `src/services/subscribers.ts` | Inscription / confirmation / désinscription |
| `src/app/admin/…` | Interface d'administration |
| `src/app/api/…` | API publiques (`/api/subscribers`, `/api/unsubscribe/:token`) et `/api/cron/tick` |
| `prisma/schema.prisma` | Schéma de la base |

Format interne des données (`src/lib/types.ts`) :

```json
{ "date": "2026-09-22", "saints": [{ "name": "Saint Maurice", "description": "…", "biography": "…", "image": "…", "url": "https://sanctimaps.fr/…" }] }
```

## Installation

**Mise en ligne sur Vercel (sans ligne de commande)** : voir [docs/deploiement-vercel.md](docs/deploiement-vercel.md).


```bash
npm install
cp .env.example .env            # puis compléter
npm run hash-password -- "un mot de passe long"   # → ADMIN_PASSWORD_HASH (ou ADMIN_PASSWORD en clair)
openssl rand -base64 48         # → SESSION_SECRET, CRON_SECRET, clé API SanctiMaps
npm run db:migrate              # applique les migrations Prisma
npm run build && npm start
```

En développement : `SANCTIMAPS_MOCK=true` fournit un saint fictif, puis `npm run db:migrate:dev` et `npm run dev`.
Administration : `/admin` (identifiants `ADMIN_EMAIL` + mot de passe haché).

## Scheduler

L'application ne dépend d'aucun démon interne : une tâche planifiée appelle
`/api/cron/tick` **toutes les 1 à 5 minutes** avec `Authorization: Bearer $CRON_SECRET`.
L'appel est idempotent ; l'envoi part dès que l'heure programmée (par défaut 07:00 Europe/Paris) est atteinte.

- **crontab** (VPS) :
  `* * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://newsletter.sanctimaps.fr/api/cron/tick >/dev/null`
- **Worker Node** (hébergement sans cron) : `APP_URL=… CRON_SECRET=… npm run scheduler`
- **Vercel Cron** : route `GET /api/cron/tick`, Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.

Processus automatique : scheduler → saint(s) récupéré(s) → vérification → génération →
vérification « déjà envoyée ? » → abonnés actifs → envoi par lots → résultat enregistré + logs.

## Protection contre les doubles envois

1. **Une ligne par date** : `Newsletter.key = "newsletter-AAAA-MM-JJ"` avec contrainte `UNIQUE` en base.
2. **Transition atomique** `scheduled → sending` (un seul processus gagne, les autres reçoivent `locked`).
3. **Une ligne par destinataire** : `Delivery(newsletterId, subscriberId)` `UNIQUE`, créée **avant**
   l'envoi : même après un crash ou une reprise, personne ne reçoit deux fois la même newsletter
   (un destinataire au statut « inconnu » après un crash n'est pas renvoyé).
4. **Pas de relance automatique après une erreur SMTP** : statut `failed`, reprise manuelle depuis
   `/admin/history/:id` (seuls les destinataires jamais atteints ou en échec temporaire sont traités).
   Seule exception : si SanctiMaps est indisponible *avant tout envoi*, jusqu'à `MAX_AUTO_ATTEMPTS`
   tentatives espacées de 15 min.
5. **Fenêtre d'envoi** (`SEND_WINDOW_HOURS`, 4 h) : un serveur redémarré le soir n'envoie pas la newsletter du matin.
6. « Envoyer maintenant » passe par exactement le même mécanisme. L'envoi test n'y touche pas.

## Envoi par lots

Les abonnés sont lus par lots de `SEND_BATCH_SIZE` (jamais toute la liste en mémoire), envoyés via un
pool SMTP limité (`SMTP_MAX_CONNECTIONS`, `SMTP_RATE_PER_SECOND`), avec une pause `SEND_BATCH_DELAY_MS`
entre lots. Chaque passage du scheduler dispose de `SEND_TIME_BUDGET_MS` ; au-delà, l'envoi se met en
pause et reprend au passage suivant (10 000 abonnés = traitement progressif). Adapter ces valeurs aux
limites du serveur SMTP.

## Changer de fournisseur d'envoi

Créer une classe implémentant `EmailProvider` (`src/services/email/provider.ts`), puis l'ajouter à
`createEmailProvider()` et à `EMAIL_PROVIDER` dans `src/lib/env.ts`. Le reste de l'application ne change pas.

## RGPD

- Double opt-in (confirmation par bouton, pour que les antivirus qui ouvrent les liens ne confirment pas à la place de la personne), lien valable 7 jours.
- Preuve du consentement : table `ConsentEvent` (texte accepté, date, IP, navigateur) pour la demande, la confirmation et la désinscription.
- Désinscription par jeton aléatoire opaque (`/unsubscribe/:token`, aucune donnée personnelle dans l'URL) + en-têtes `List-Unsubscribe` / One-Click (RFC 8058).
- Suppression des données : option sur la page de désinscription, bouton « Supprimer » dans l'admin ; les inscriptions jamais confirmées sont supprimées automatiquement 30 jours après expiration.
- Données limitées à : e-mail, prénom facultatif, statut, dates, preuve de consentement, historique technique d'envoi. Aucun pistage d'ouverture ou de clic.
- Page `/confidentialite` : **compléter les mentions entre crochets** (responsable, contact).

## Sécurité

- Administration : session signée HMAC (cookie `httpOnly`, `secure`, `SameSite=Strict`, 12 h), mot de passe haché en scrypt, vérification sur chaque page, action serveur et route admin.
- Rate limiting sur l'inscription, la connexion, la confirmation et la désinscription (en mémoire : pour plusieurs instances, ajouter une limite au reverse proxy ou un stockage partagé).
- `/api/subscribers` : validation Zod, champ piège anti-robots, origines limitées à `ALLOWED_ORIGINS`, réponse identique que l'adresse soit déjà inscrite ou non.
- Secrets (SMTP, clé SanctiMaps, sessions) uniquement dans les variables d'environnement serveur ; jamais en base ni envoyés au navigateur.
- Données SanctiMaps échappées dans les templates, URL limitées à http(s).
- En-têtes HSTS, `nosniff`, admin non intégrable en iframe. Servir l'application **uniquement en HTTPS**.
- Sauvegardes : sauvegarder la base PostgreSQL quotidiennement (ex. `pg_dump`), c'est la seule donnée à conserver.

## Tests

```bash
npm test          # dates / fuseaux, normalisation SanctiMaps, génération, échappement
npm run typecheck
```
