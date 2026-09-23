# Données SanctiMaps pour la newsletter

SanctiMaps est un site statique (GitHub Pages), sans serveur : il ne peut pas répondre
à une API au sens classique. Les réponses sont donc **préparées d'avance** : un fichier JSON
par jour de l'année, généré depuis les données du site par `tools/build-newsletter-api.mjs`
(dépôt `sanctimaps`), et régénéré automatiquement avec les pages (`npm run build:pages`).

```
https://sanctimaps.fr/api/newsletter/09-23.json     les saints du 23 septembre
https://sanctimaps.fr/api/newsletter/index.json     description du jeu de fichiers
```

Côté newsletter : `SANCTIMAPS_API_URL=https://sanctimaps.fr/api/newsletter/{MM-DD}.json`.
Le connecteur remplace `{MM-DD}` par le jour voulu et vérifie que le fichier reçu
est bien celui de ce jour (champ `day`).

Pas de clé API : ces fichiers ne contiennent que ce que les pages publiques affichent déjà.
L'application n'accède jamais directement aux données de SanctiMaps et ne les modifie pas.

## Format

```json
{
  "version": 1,
  "day": "09-23",
  "label": "23 septembre",
  "day_url": "https://sanctimaps.fr/calendrier/23-septembre/",
  "total": 16,
  "saints": [
    {
      "id": "pio-pietrelcina",
      "name": "Pio de Pietrelcina",
      "description": "Capucin stigmatisé de San Giovanni Rotondo, confesseur infatigable.",
      "biography": "…",
      "image": null,
      "url": "https://sanctimaps.fr/saints/pio-de-pietrelcina/",
      "life": "1887 – 1968",
      "place": "Pietrelcina, Italie",
      "patronage": "…"
    }
  ]
}
```

- Les saints sont **rangés du plus au moins présentable** : fiches rédigées à la main, patronage,
  biographie, nombre de sources. La newsletter présente les `SANCTIMAPS_MAX_SAINTS` premiers
  (3 par défaut) et renvoie pour les autres à `day_url`.
- `image` est `null` : SanctiMaps n'a pas encore d'images de saints. Le template s'en passe ;
  il suffira de remplir ce champ pour qu'elles apparaissent.
- Le 29 février reprend les saints du 28 février.

## Autre source possible

Le connecteur accepte aussi une vraie API, sans marqueur dans l'URL :
`GET {SANCTIMAPS_API_URL}?date=AAAA-MM-JJ`, avec `Authorization: Bearer {SANCTIMAPS_API_KEY}`
si une clé est définie. La réponse doit alors contenir `"date": "AAAA-MM-JJ"` au lieu de `"day"`.

## Formulaire d'inscription à intégrer dans SanctiMaps

Option 1 — iframe :

```html
<iframe src="https://newsletter.sanctimaps.fr/subscribe" width="100%" height="420"
        style="border:0" title="Newsletter SanctiMaps"></iframe>
```

Option 2 — formulaire HTML natif (sans JavaScript) :

```html
<form action="https://newsletter.sanctimaps.fr/api/subscribers" method="post">
  <input type="email" name="email" required placeholder="Votre e-mail">
  <input type="text" name="first_name" placeholder="Prénom (facultatif)">
  <!-- anti-robots : doit rester vide et caché -->
  <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
  <!-- page de retour ; reçoit ?newsletter=ok ou ?newsletter=error -->
  <input type="hidden" name="redirect" value="https://sanctimaps.fr/lettre/">
  <button type="submit">Recevoir le saint du jour</button>
  <p><small>Désinscription possible à tout moment.
     <a href="https://newsletter.sanctimaps.fr/confidentialite">Confidentialité</a></small></p>
</form>
```

Remplacer `newsletter.sanctimaps.fr` par l'adresse réelle de l'application
(par exemple `sanctimaps-newsletter.vercel.app`).
