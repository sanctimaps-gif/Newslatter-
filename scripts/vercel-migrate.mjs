#!/usr/bin/env node
// Applique les migrations Prisma pendant le build sur Vercel (VERCEL=1).
// En local, ne fait rien : utiliser `npm run db:migrate`.
// Si l'intégration Neon fournit une URL sans pooler (DATABASE_URL_UNPOOLED),
// elle est utilisée pour la migration, comme recommandé par Prisma.
import { execSync } from "node:child_process";

if (process.env.VERCEL !== "1") process.exit(0);

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  // Le site peut quand même être construit : il faudra redéployer une fois la base branchée.
  console.warn(
    "⚠️  DATABASE_URL manquante : les tables ne sont pas créées. Ajoutez une base Neon " +
      "(onglet Storage → Create Database → Neon → Connect), puis faites Redeploy.",
  );
  process.exit(0);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
