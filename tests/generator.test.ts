import { describe, expect, it } from "vitest";
import { NewsletterGenerator } from "@/services/newsletter/generator";
import { buildSubject } from "@/templates/daily-saint";
import { personalize } from "@/templates/personalize";
import type { SaintSource } from "@/services/sanctimaps/client";

const source = (names: string[]): SaintSource => ({
  async getSaints(date) {
    return {
      date,
      saints: names.map((name) => ({
        name,
        description: `Description de ${name}`,
        url: `https://sanctimaps.fr/saints/${encodeURIComponent(name)}`,
      })),
    };
  },
});

const options = { siteUrl: "https://sanctimaps.fr", privacyUrl: "https://nl.example/confidentialite" };

describe("NewsletterGenerator", () => {
  it("génère objet, HTML et texte pour le saint du jour", async () => {
    const nl = await new NewsletterGenerator(source(["Saint Maurice"]), options).generate("2026-09-22");
    expect(nl.key).toBe("newsletter-2026-09-22");
    expect(nl.subject).toBe("Le saint du jour : Saint Maurice");
    expect(nl.html).toContain("Découvrir sa vie");
    expect(nl.html).toContain("mardi 22 septembre 2026".replace(/^m/, "M"));
    expect(nl.html).toContain("{{UNSUBSCRIBE_URL}}");
    expect(nl.text).toContain("https://sanctimaps.fr/saints/Saint%20Maurice");
  });

  it("gère plusieurs saints le même jour", async () => {
    const nl = await new NewsletterGenerator(source(["Saint A", "Saint B"]), options).generate("2026-09-22");
    expect(nl.subject).toBe("Les saints du jour : Saint A et Saint B");
    expect(nl.html.match(/Découvrir sa vie/g)!.length).toBeGreaterThanOrEqual(2);
    expect(buildSubject(["A", "B", "C"].map((name) => ({ name, description: "", url: "https://x" })))).toBe(
      "Les saints du jour : A, B et C",
    );
  });

  it("échappe les données injectées", async () => {
    const nl = await new NewsletterGenerator(source(["<script>alert(1)</script>"]), options).generate("2026-09-22");
    expect(nl.html).not.toContain("<script>alert(1)</script>");
    expect(nl.html).toContain("&lt;script&gt;");
  });

  it("personnalise le lien de désinscription et la salutation", () => {
    const html = personalize("{{GREETING}} <a href=\"{{UNSUBSCRIBE_URL}}\">x</a>", {
      firstName: "Élise <b>",
      unsubscribeUrl: "https://nl.example/unsubscribe/abc?x=1&y=2",
    }, "html");
    expect(html).toBe('Bonjour Élise &lt;b&gt;, <a href="https://nl.example/unsubscribe/abc?x=1&amp;y=2">x</a>');
  });
});
