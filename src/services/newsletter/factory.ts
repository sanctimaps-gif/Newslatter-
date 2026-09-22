import "server-only";
import { env } from "@/lib/env";
import { urls } from "@/lib/urls";
import { getSaintSource } from "@/services/sanctimaps/client";
import { NewsletterGenerator } from "./generator";

export function createGenerator(): NewsletterGenerator {
  const e = env();
  return new NewsletterGenerator(getSaintSource(), {
    siteUrl: e.SANCTIMAPS_SITE_URL,
    logoUrl: e.LOGO_URL,
    privacyUrl: urls.privacy(),
  });
}
