import type { NextConfig } from "next";
// Importing for its side effect: a malformed or secret Mapbox token throws here, failing `next dev`/`next build`.
import "./src/lib/env";

// The CSP itself is per-request (it carries a nonce) and lives in src/proxy.ts.
// These headers are static, so they are set here for every route.
const securityHeaders = [
  // Stops browsers from guessing a MIME type, which turns uploads/JSON into executable content.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sends the origin only on cross-origin requests and nothing on downgrades.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Turns off powerful APIs the site never uses; a compromised script cannot enable them.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // HTTPS only for a year. No `preload`: that is a hard-to-undo commitment we have not decided on.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in the X-Powered-By header.
  poweredByHeader: false,
  // The repo's agent instructions live in CLAUDE.md; stop `next dev` from generating a second AGENTS.md.
  agentRules: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
