import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework in the X-Powered-By header.
  poweredByHeader: false,
};

export default nextConfig;
