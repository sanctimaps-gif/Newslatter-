# Endpoint à ajouter côté SanctiMaps

L'application newsletter ne lit **jamais** directement la base de SanctiMaps.
Si SanctiMaps n'a pas déjà d'API qui fournit le saint du jour, il faut y ajouter **un seul**
endpoint en lecture seule, qui ne renvoie que ce dont la newsletter a besoin.

## Contrat

```
GET /api/newsletter/today?date=AAAA-MM-JJ
Authorization: Bearer <SANCTIMAPS_API_KEY>
```

- `date` est facultatif ; sans ce paramètre, c'est la date du jour (Europe/Paris).
  La newsletter l'envoie toujours, pour que les prévisualisations d'autres jours fonctionnent.
- Si l'en-tête `Authorization` est absent ou faux → `401`.
- Réponse `200` :

```json
{
  "date": "2026-09-22",
  "saints": [
    {
      "name": "Saint Maurice",
      "description": "Chef de la légion thébaine, martyr à Agaune.",
      "biography": "Texte plus long (facultatif, du HTML est accepté, il sera converti en texte)…",
      "image": "https://sanctimaps.fr/images/saints/saint-maurice.jpg",
      "url": "https://sanctimaps.fr/saints/saint-maurice"
    }
  ]
}
```

| Champ | Obligatoire | Remarque |
|---|---|---|
| `date` | oui | doit être la date demandée, sinon l'envoi est refusé |
| `saints[].name` | oui | alias accepté : `title` |
| `saints[].url` | oui | URL absolue ou relative au site |
| `saints[].description` | conseillé | alias accepté : `summary` |
| `saints[].biography` | non | tronquée à ~600 caractères dans l'e-mail |
| `saints[].image` | non | alias accepté : `image_url` ; URL absolue ou relative |

Plusieurs saints le même jour : il suffit de renvoyer plusieurs éléments dans `saints`
(le premier est mis en avant). Un saint sans `name` ou sans `url` est ignoré ; s'il n'en reste aucun,
la newsletter du jour n'est pas envoyée et l'erreur apparaît dans l'admin.

## Exemple (Next.js route handler — à adapter au code réel de SanctiMaps)

```ts
// app/api/newsletter/today/route.ts (dans le projet SanctiMaps)
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSaintsForDay } from "@/lib/saints"; // fonction existante de SanctiMaps

export const dynamic = "force-dynamic";

function authorized(header: string | null) {
  const expected = Buffer.from(`Bearer ${process.env.NEWSLETTER_API_KEY}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const param = new URL(req.url).searchParams.get("date");
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param)
    ? param
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

  const saints = await getSaintsForDay(date); // lecture seule
  return NextResponse.json({
    date,
    saints: saints.map((s) => ({
      name: s.name,
      description: s.shortDescription,
      biography: s.biography,
      image: s.imageUrl,
      url: `https://sanctimaps.fr/saints/${s.slug}`,
    })),
  });
}
```

Côté SanctiMaps : définir `NEWSLETTER_API_KEY` (même valeur que `SANCTIMAPS_API_KEY` dans
l'application newsletter, générée par exemple avec `openssl rand -base64 48`).
Cet endpoint ne modifie aucune donnée de SanctiMaps.

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
  <input type="hidden" name="redirect" value="https://sanctimaps.fr/newsletter-merci">
  <button type="submit">Recevoir le saint du jour</button>
  <p><small>Désinscription possible à tout moment.
     <a href="https://newsletter.sanctimaps.fr/confidentialite">Confidentialité</a></small></p>
</form>
```

Option 3 — `fetch` en JSON vers `POST /api/subscribers` (`{ "email": "...", "first_name": "..." }`)
depuis une origine listée dans `ALLOWED_ORIGINS`.
