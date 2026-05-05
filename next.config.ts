import { createMDX } from "fumadocs-mdx/next"

import { buildSecurityHeaders } from "./src/lib/security/headers"

import type { NextConfig } from "next"

const withMDX = createMDX()

/**
 * Static security headers applied to all routes. `Content-Security-Policy`
 * is injected per request in `proxy.ts` so each HTML response gets a fresh
 * nonce.
 */
const securityHeaders = buildSecurityHeaders()
const ogImageHeaders = [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Social cards are meant to be fetched cross-origin, so they should
        // not inherit the stricter same-origin resource policy used elsewhere.
        source: "/og/docs/:path*",
        headers: ogImageHeaders,
      },
    ]
  },
}

export default withMDX(nextConfig)
