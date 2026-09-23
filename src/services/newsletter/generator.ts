import type { GeneratedNewsletter } from "@/lib/types";
import { formatFrenchDate, newsletterKey } from "@/lib/dates";
import type { SaintSource } from "@/services/sanctimaps/client";
import { buildSubject, renderDailySaintHtml, renderDailySaintText } from "@/templates/daily-saint";

export interface GeneratorOptions {
  siteUrl: string;
  privacyUrl: string;
  logoUrl?: string | null;
  /** Nombre de saints présentés en détail (les suivants sont résumés par un lien). */
  maxSaints?: number;
}

/**
 * NewsletterGenerator
 * 1. récupère le(s) saint(s) du jour auprès de SanctiMaps ;
 * 2. injecte les données dans le template (séparé de cette logique) ;
 * 3. génère le HTML, la version texte et l'objet ;
 * 4. retourne une newsletter prête à être envoyée.
 * Les marqueurs propres à chaque destinataire sont remplacés à l'envoi.
 */
export class NewsletterGenerator {
  constructor(
    private readonly source: SaintSource,
    private readonly options: GeneratorOptions,
  ) {}

  async generate(date: string): Promise<GeneratedNewsletter> {
    const day = await this.source.getSaints(date);
    const saints = day.saints.slice(0, this.options.maxSaints ?? 3);
    const others = Math.max((day.total ?? day.saints.length) - saints.length, 0);
    const view = {
      dateLabel: formatFrenchDate(date),
      saints,
      others,
      dayUrl: day.dayUrl,
      siteUrl: this.options.siteUrl,
      logoUrl: this.options.logoUrl,
      privacyUrl: this.options.privacyUrl,
    };
    return {
      key: newsletterKey(date),
      date,
      subject: buildSubject(saints, others),
      html: renderDailySaintHtml(view),
      text: renderDailySaintText(view),
      saints,
    };
  }
}
