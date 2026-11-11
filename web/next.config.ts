import type { NextConfig } from "next";
// Importing for its side effect: a malformed or secret Mapbox token throws here, failing `next dev`/`next build`.
import "./src/lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in the X-Powered-By header.
  poweredByHeader: false,
};

export default nextConfig;
