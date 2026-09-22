import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // L'administration ne peut pas être affichée dans une iframe tierce.
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      // Le formulaire d'inscription peut être intégré à SanctiMaps (iframe).
      {
        source: "/subscribe",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://sanctimaps.fr https://*.sanctimaps.fr",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
