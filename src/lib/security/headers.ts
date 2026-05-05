export type SecurityHeader = {
  key: string
  value: string
}

/**
 * Builds a strict, nonce-aware Content Security Policy.
 *
 * The returned string keeps the literal `{NONCE}` placeholder so `proxy.ts`
 * can replace it per request.
 */
export function buildContentSecurityPolicy(nodeEnv: string | undefined) {
  const isDevelopment = nodeEnv === "development"
  const connectSources = ["'self'"]

  // Fumadocs search and markdown copy fetches stay same-origin. In development,
  // Next.js also needs websocket access for HMR.
  if (isDevelopment) {
    connectSources.push("ws:", "wss:")
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : "'nonce-{NONCE}'"}`,
    "img-src 'self' blob: data:",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}

/**
 * Static security headers applied to every route by `next.config.ts`.
 * `Content-Security-Policy` is omitted here because `proxy.ts` sets it per
 * request so it can include a fresh nonce.
 */
export function buildSecurityHeaders(): SecurityHeader[] {
  return [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ]
}
