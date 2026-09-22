#!/usr/bin/env node
// Génère ADMIN_PASSWORD_HASH à partir d'un mot de passe.
// Usage : npm run hash-password -- "mon mot de passe"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage : npm run hash-password -- \"<mot de passe d'au moins 12 caractères>\"");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("base64")}:${hash.toString("base64")}`);
