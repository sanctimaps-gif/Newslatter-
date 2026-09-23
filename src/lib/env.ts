import "server-only";
import { z } from "zod";

/**
 * Configuration serveur. Lue à la demande (et non à l'import) pour que la
 * compilation fonctionne sans variables d'environnement.
 * Aucune de ces valeurs ne doit être transmise au navigateur.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),

  ADMIN_EMAIL: z.string().email(),
  // Hash scrypt (npm run hash-password) OU, à défaut, mot de passe en clair
  // (pratique pour configurer depuis le tableau de bord de l'hébergeur).
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD doit faire au moins 12 caractères").optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),

  CRON_SECRET: z.string().min(16, "CRON_SECRET doit faire au moins 16 caractères"),

  // Ex. https://sanctimaps.fr/api/newsletter/{MM-DD}.json
  SANCTIMAPS_API_URL: z.string().regex(/^https?:\/\//, "URL http(s) attendue").optional().or(z.literal("")),
  // Nombre de saints présentés en détail ; les autres sont résumés par un lien.
  SANCTIMAPS_MAX_SAINTS: z.coerce.number().int().min(1).max(10).default(3),
  SANCTIMAPS_API_KEY: z.string().optional(),
  SANCTIMAPS_SITE_URL: z.string().url().default("https://sanctimaps.fr"),
  SANCTIMAPS_MOCK: z.enum(["true", "false"]).default("false"),

  EMAIL_PROVIDER: z.enum(["smtp"]).default("smtp"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("SanctiMaps"),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_MAX_CONNECTIONS: z.coerce.number().int().positive().default(2),
  SMTP_RATE_PER_SECOND: z.coerce.number().int().positive().default(5),

  SEND_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
  SEND_BATCH_DELAY_MS: z.coerce.number().int().min(0).default(1000),
  SEND_TIME_BUDGET_MS: z.coerce.number().int().min(5000).default(50000),
  SEND_WINDOW_HOURS: z.coerce.number().min(1).max(24).default(4),
  MAX_AUTO_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),

  ALLOWED_ORIGINS: z.string().default("https://sanctimaps.fr,https://www.sanctimaps.fr"),
  LOGO_URL: z.string().url().optional(),
}).refine((e) => e.ADMIN_PASSWORD_HASH || e.ADMIN_PASSWORD, {
  message: "ADMIN_PASSWORD_HASH ou ADMIN_PASSWORD doit être défini",
  path: ["ADMIN_PASSWORD"],
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuration invalide : ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function allowedOrigins(): string[] {
  return env()
    .ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
