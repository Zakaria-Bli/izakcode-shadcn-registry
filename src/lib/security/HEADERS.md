# Next.js 16 Security Headers — Setup Guide & Learning Resource

> **Who this is for:** Developers new to the project who want to understand how HTTP security headers are configured, why each decision was made, and how to extend or maintain the setup correctly.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture: How the Three Files Work Together](#architecture-how-the-three-files-work-together)
3. [File: `headers.ts`](#file-headersts)
   - [Content Security Policy (CSP)](#content-security-policy-csp)
   - [Static Security Headers](#static-security-headers)
4. [File: `proxy.ts`](#file-proxyts)
   - [What is the Proxy in Next.js 16?](#what-is-the-proxy-in-nextjs-16)
   - [Nonce Generation](#nonce-generation)
   - [Injecting Headers per Request](#injecting-headers-per-request)
   - [The Matcher](#the-matcher)
5. [File: `next.config.ts`](#file-nextconfigts)
6. [Step-by-Step: Reading a Nonce in a Server Component](#step-by-step-reading-a-nonce-in-a-server-component)
7. [Step-by-Step: Adding a New External Resource](#step-by-step-adding-a-new-external-resource)
8. [Common Mistakes & How to Avoid Them](#common-mistakes--how-to-avoid-them)
9. [Security Header Reference](#security-header-reference)
10. [Hardening Checklist](#hardening-checklist)

---

## Overview

This project uses a **two-layer security header strategy**:

| Layer              | Where            | What it does                                                                                                    |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Static headers** | `next.config.ts` | Applied to every response at build time: HSTS, X-Frame-Options, MIME sniffing protection, etc.                  |
| **Dynamic CSP**    | `proxy.ts`       | Applied per request at runtime: a fresh `Content-Security-Policy` with a unique nonce for every HTML page load. |

The reason for the split is the **nonce**. A Content Security Policy that uses a nonce (a random one-time token) must generate a new nonce for every single HTTP response. You cannot do that in `next.config.ts` because it only runs once at startup — so the CSP lives in `proxy.ts` instead, which runs on every request.

```
Browser Request
      │
      ▼
┌─────────────┐     Injects nonce + CSP header
│  proxy.ts   │ ──────────────────────────────────► HTML Response
│  (per req)  │                                     Content-Security-Policy: nonce-abc123
└─────────────┘
      │
      ▼
┌──────────────────┐  Static headers already set
│  next.config.ts  │  by Next.js before this point:
│  (build time)    │  HSTS, X-Frame-Options, etc.
└──────────────────┘
```

---

## Architecture: How the Three Files Work Together

```
src/lib/security/
└── headers.ts          ← Pure functions. No Next.js dependency.
                           Builds CSP strings and header arrays.

proxy.ts                ← Runs before every matching request.
                           Calls buildContentSecurityPolicy(),
                           generates a nonce, injects both into headers.

next.config.ts          ← Calls buildSecurityHeaders() once at startup.
                           Registers the static headers with Next.js.
```

`headers.ts` is intentionally framework-agnostic — it exports pure functions that return plain strings and objects. This makes it easy to test in isolation and reuse outside of Next.js if needed.

---

## File: `headers.ts`

**Path:** `src/lib/security/headers.ts`

This file is the single source of truth for all security header values. It exports two functions:

- `buildContentSecurityPolicy(nodeEnv)` — returns the CSP string with a `{NONCE}` placeholder
- `buildSecurityHeaders()` — returns an array of static header key/value pairs

### Content Security Policy (CSP)

A Content Security Policy tells the browser exactly which sources it is allowed to load scripts, styles, fonts, and other resources from. Any resource not on the allowlist is blocked — even if an attacker manages to inject a malicious `<script>` tag.

#### The nonce approach

This project uses a **nonce-based CSP**, which is the strictest and most modern approach. Here is how it works:

1. The server generates a random token (the nonce) for each request.
2. That nonce is embedded in the CSP header: `script-src 'nonce-abc123'`.
3. Every `<script>` and `<style>` tag in your HTML that should be allowed must include `nonce="abc123"`.
4. The browser blocks any script or style that does not have the correct nonce — including injected ones.

```html
<!-- This script runs — it has the correct nonce -->
<script nonce="abc123">
  console.log("hello")
</script>

<!-- This script is BLOCKED — no nonce -->
<script>
  alert("injected!")
</script>
```

#### CSP directives explained

```typescript
export function buildContentSecurityPolicy(nodeEnv: string | undefined) {
  const isDevelopment = nodeEnv === "development"

  return [
    // Only load resources from the same origin by default.
    // All other directives below override this for specific resource types.
    "default-src 'self'",

    // Scripts: only same-origin scripts with a valid nonce are allowed.
    // 'strict-dynamic' means a trusted (nonced) script can load further
    // scripts dynamically — you don't need to allowlist every CDN.
    // 'unsafe-eval' is added in development only (required by HMR / Fast Refresh).
    `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,

    // Styles: same-origin + nonce in production.
    // In development, 'unsafe-inline' is needed because Next.js HMR
    // injects inline styles that cannot be given a nonce.
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : "'nonce-{NONCE}'"}`,

    // Images: same-origin, plus blob: and data: URIs (common for
    // canvas exports, inline SVGs, and image previews).
    "img-src 'self' blob: data:",

    // Fonts: same-origin plus Google Fonts CDN.
    // Add other font CDNs here if you use them.
    "font-src 'self' https://fonts.gstatic.com",

    // Fetch/XHR/WebSocket: same-origin only.
    // Add your API domains here if they differ from the app's origin.
    "connect-src 'self'",

    // Completely disallow plugins (Flash, etc.). Non-negotiable in 2024.
    "object-src 'none'",

    // Restrict <base> tag to same origin — prevents base tag injection attacks.
    "base-uri 'self'",

    // Forms can only submit to same-origin endpoints.
    "form-action 'self'",

    // This page cannot be embedded in an iframe on any other origin.
    // More expressive than X-Frame-Options (which is also set for older browsers).
    "frame-ancestors 'none'",

    // Automatically upgrade http:// resource requests to https://.
    "upgrade-insecure-requests",
  ].join("; ")
}
```

> **Why `{NONCE}` and not a real value here?**
> This function runs once when the module loads. The actual nonce must be different for every request — so the function returns a template string, and `proxy.ts` replaces `{NONCE}` with a freshly generated value on each request.

#### Development vs. production differences

| Directive    | Development              | Production        |
| ------------ | ------------------------ | ----------------- |
| `script-src` | includes `'unsafe-eval'` | strict nonce only |
| `style-src`  | `'unsafe-inline'`        | strict nonce only |

This is intentional. Next.js Fast Refresh (HMR) uses `eval()` and injects inline styles that cannot carry a nonce. Allowing them only in development means you get full strictness in production where it matters.

---

### Static Security Headers

```typescript
export function buildSecurityHeaders(): SecurityHeader[] {
  return [
    // ...
  ]
}
```

These headers are the same on every response, so they are registered once in `next.config.ts` rather than added per-request in the proxy.

#### Header-by-header breakdown

**`X-DNS-Prefetch-Control: on`**
Allows the browser to pre-resolve DNS for linked domains before the user clicks. Slightly improves perceived performance for external links.

---

**`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`**

Forces browsers to use HTTPS for this domain for 2 years. Once a browser sees this header, it will refuse to connect over plain HTTP — even if the user types `http://`. The `preload` flag allows your domain to be submitted to browser HSTS preload lists.

> ⚠️ **Only add `preload` if your entire domain and all subdomains are on HTTPS.** Removing it later is difficult and takes months to propagate.

---

**`X-Frame-Options: DENY`**

Prevents this page from being loaded inside an `<iframe>` on any domain, including the same origin. This protects against **clickjacking** — an attack where an attacker overlays an invisible iframe of your page over their own site to trick users into clicking things.

This is set to `DENY` (not `SAMEORIGIN`) to match the `frame-ancestors 'none'` directive in the CSP. Both must agree — `frame-ancestors 'none'` is respected by modern browsers; `X-Frame-Options: DENY` covers older ones.

---

**`X-Content-Type-Options: nosniff`**

Prevents the browser from "sniffing" the MIME type of a response. Without this, a browser might execute a text file as JavaScript if it looks script-like. Critical when your app allows user file uploads.

---

**`Referrer-Policy: strict-origin-when-cross-origin`**

Controls what URL information is sent in the `Referer` header when a user navigates away from your site:

- **Same-origin navigation:** full URL is sent.
- **Cross-origin navigation over HTTPS→HTTPS:** only the origin (no path/query).
- **Cross-origin navigation over HTTPS→HTTP:** nothing is sent.

This prevents leaking sensitive URL parameters (tokens, IDs) to third-party sites.

---

**`Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`**

Disables browser APIs this app does not use. Even if an attacker injects a script, they cannot access the camera, microphone, or location. `browsing-topics=()` opts out of Google's Privacy Sandbox ad targeting.

Remove entries from this list only if your app genuinely needs that capability.

---

**`Cross-Origin-Opener-Policy: same-origin`**
**`Cross-Origin-Embedder-Policy: unsafe-none`**
**`Cross-Origin-Resource-Policy: same-origin`**

These three headers together control **cross-origin isolation** — a browser security model that protects against Spectre-class hardware attacks that can leak data across process boundaries.

- `COOP: same-origin` isolates this window from cross-origin popups.
- `COEP: unsafe-none` (**relaxed**) — allows loading third-party resources that do not send a `Cross-Origin-Resource-Policy` header. This is intentionally lenient to keep things working out of the box.
- `CORP: same-origin` — this app's own resources can only be loaded by same-origin pages.

> **To achieve full cross-origin isolation** (which enables `SharedArrayBuffer` and high-resolution timers), change `COEP` to `require-corp`. This requires every third-party resource you load to send a `Cross-Origin-Resource-Policy: cross-origin` header. Most CDNs now support this, but verify before changing.

---

## File: `proxy.ts`

**Path:** `proxy.ts` (project root, or `src/proxy.ts`)

### What is the Proxy in Next.js 16?

In Next.js 16, `middleware.ts` was renamed to `proxy.ts` and the exported function renamed from `middleware` to `proxy`. The rename reflects the file's actual role: it is a **network-boundary interceptor** that sits in front of your app and can inspect and modify every request and response before a route is rendered.

> **Key difference from Express middleware:** Next.js `proxy.ts` runs on the Node.js runtime and is deployed at the CDN/edge layer — it is not part of your application's render code. It has no access to React, your database, or your app's module globals.

```
Internet → proxy.ts → Next.js App Router → Your Page/Route
```

### Nonce Generation

```typescript
const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
```

Breaking this down:

1. `crypto.randomUUID()` — generates a version 4 UUID: `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`. This is 128 bits of randomness, which is sufficient for a nonce.
2. `Buffer.from(...).toString("base64")` — base64-encodes the UUID string. This gives a compact, URL-safe string safe to embed in an HTTP header value.

The result looks like: `"ZjQ3YWMxMGItNThjYy00MzcyLWE1NjctMGUwMmIyYzNkNDc5"`

> Each page load gets a completely different nonce. An attacker cannot predict it, so they cannot forge a valid nonce to execute injected scripts.

### Injecting Headers per Request

```typescript
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = buildContentSecurityPolicy(process.env.NODE_ENV).replace(/{NONCE}/g, nonce)

  // 1. Add nonce and CSP to the REQUEST headers.
  //    Server components read x-nonce via headers().get("x-nonce").
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  // 2. Pass the modified request headers to the next handler.
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // 3. Also set CSP on the RESPONSE headers.
  //    This is what the browser actually enforces.
  response.headers.set("Content-Security-Policy", csp)

  return response
}
```

Notice that CSP is set **twice** — on both the request and the response. This is intentional:

- **Request header (`x-nonce`):** Lets your server components retrieve the nonce so they can pass it to `<script nonce={nonce}>` tags.
- **Response header (`Content-Security-Policy`):** This is what the browser sees and enforces.

### The Matcher

```typescript
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
```

The matcher controls which requests the proxy runs on. This configuration skips:

| Excluded path / condition                   | Reason                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `/api/*`                                    | API responses are JSON, not HTML — no nonce needed                              |
| `/_next/static/*`                           | Static JS/CSS assets — browsers don't enforce CSP on these responses themselves |
| `/_next/image/*`                            | Image optimization responses                                                    |
| `/favicon.ico`                              | Static asset                                                                    |
| Requests with `next-router-prefetch` header | Next.js prefetch requests fetch RSC payloads, not full HTML                     |
| Requests with `purpose: prefetch` header    | Same — prefetch, not a full page load                                           |

Running the proxy on these would waste CPU and add latency without any security benefit.

---

## File: `next.config.ts`

**Path:** `next.config.ts` (project root)

```typescript
import "./src/lib/env" // Validates env vars at startup
import { buildSecurityHeaders } from "@/lib/security/headers"
import type { NextConfig } from "next"

// buildSecurityHeaders() is called ONCE here at module load time.
// The result is a plain array — safe to compute statically.
const securityHeaders = buildSecurityHeaders()

const nextConfig: NextConfig = {
  reactCompiler: true, // Enables automatic memoization via React Compiler
  output: "standalone", // Bundles a self-contained Node.js server for deployment

  async headers() {
    return [
      {
        source: "/:path*", // Apply to ALL routes
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
```

The `headers()` function is a Next.js config API that registers HTTP response headers for matching routes. Unlike `proxy.ts`, this runs at build time (for static routes) or startup, not per request — which is why dynamic values like nonces cannot live here.

> **Notice that `Content-Security-Policy` is not in `securityHeaders`.** It is deliberately absent. The CSP is handled entirely by `proxy.ts`. If you added it here as well, the browser would receive two `Content-Security-Policy` headers and combine them — almost certainly breaking your app.

---

## Step-by-Step: Reading a Nonce in a Server Component

The nonce generated in `proxy.ts` is forwarded via the `x-nonce` request header. Here is how to use it in a Server Component to authorize inline scripts or styles:

**1. Create a helper to read the nonce:**

```typescript
// src/lib/security/get-nonce.ts
import { headers } from "next/headers"

export async function getNonce(): Promise<string> {
  const headersList = await headers()
  return headersList.get("x-nonce") ?? ""
}
```

**2. Use the nonce in your layout or page:**

```tsx
// src/app/layout.tsx
import { getNonce } from "@/lib/security/get-nonce"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = await getNonce()

  return (
    <html lang="en">
      <head>
        {/* Pass nonce to any inline script */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.__NONCE__ = "${nonce}"`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**3. Use the nonce with third-party scripts:**

```tsx
import Script from "next/script"

export default async function AnalyticsScript() {
  const nonce = await getNonce()

  return (
    <Script
      src="https://analytics.example.com/script.js"
      nonce={nonce}
      strategy="afterInteractive"
    />
  )
}
```

> ⚠️ **Never expose the nonce to client components via props or context.** A client component is serialized to HTML where the nonce would be visible, defeating its purpose. Read the nonce only in Server Components.

---

## Step-by-Step: Adding a New External Resource

Suppose you want to load images from `https://images.example.com` and a font from `https://fonts.example.com`.

**1. Open `src/lib/security/headers.ts`**

**2. Update the relevant CSP directives:**

```typescript
// Before
"img-src 'self' blob: data:",
"font-src 'self' https://fonts.gstatic.com",

// After
"img-src 'self' blob: data: https://images.example.com",
"font-src 'self' https://fonts.gstatic.com https://fonts.example.com",
```

**3. If the external resource makes its own fetch requests, add to `connect-src`:**

```typescript
// Before
"connect-src 'self'",

// After
"connect-src 'self' https://api.example.com",
```

**4. Test in the browser:**

Open DevTools → Console. Any blocked resource will appear as a CSP violation error like:

```
Refused to load the image 'https://images.example.com/photo.jpg' because it
violates the following Content Security Policy directive: "img-src 'self' blob: data:"
```

**5. Never use wildcards unless absolutely necessary:**

```typescript
// ❌ Too broad — allows any subdomain
"img-src 'self' https://*.example.com"

// ✅ Specific — allows only what you need
"img-src 'self' https://images.example.com"
```

---

## Common Mistakes & How to Avoid Them

### ❌ Adding CSP to `next.config.ts`

```typescript
// WRONG — static CSP has no nonce, breaks nonced scripts
async headers() {
  return [{
    source: "/:path*",
    headers: [
      ...securityHeaders,
      { key: "Content-Security-Policy", value: "script-src 'self'" }, // ← never do this
    ],
  }]
}
```

CSP must live exclusively in `proxy.ts`. Adding it here creates a duplicate header and conflicts with the nonce-based policy.

---

### ❌ Reading `x-nonce` in a Client Component

```tsx
// WRONG — client components cannot call headers()
"use client"
import { headers } from "next/headers" // This will throw at runtime

export function MyClientComponent() {
  const nonce = headers().get("x-nonce") // ← error
}
```

`headers()` from `next/headers` is a Server Component API. Only call it in Server Components or Server Actions.

---

### ❌ Using `'unsafe-inline'` in production scripts

```typescript
// WRONG — defeats the entire purpose of a nonce-based CSP
;`script-src 'self' 'unsafe-inline'`
```

`'unsafe-inline'` allows any inline script to execute — exactly what the nonce is designed to prevent. Never add it to `script-src` in production.

---

### ❌ Mismatched `X-Frame-Options` and `frame-ancestors`

```typescript
// WRONG — contradictory: one says deny all, the other says same-origin is ok
{ key: "X-Frame-Options", value: "SAMEORIGIN" },
// frame-ancestors 'none' in CSP
```

Always keep `X-Frame-Options` and `frame-ancestors` aligned:

| You want               | `X-Frame-Options` | CSP `frame-ancestors` |
| ---------------------- | ----------------- | --------------------- |
| Block all framing      | `DENY`            | `'none'`              |
| Allow same-origin only | `SAMEORIGIN`      | `'self'`              |
| Allow specific origin  | _(not supported)_ | `https://trusted.com` |

---

### ❌ Forgetting to update the matcher when adding API routes

If you add an API route that returns HTML (uncommon, but possible), ensure the proxy matcher includes it. By default, `/api/*` is excluded.

---

## Security Header Reference

| Header                         | Value in this project             | What it prevents                         |
| ------------------------------ | --------------------------------- | ---------------------------------------- |
| `Content-Security-Policy`      | Nonce-based (per request)         | XSS, script injection, data exfiltration |
| `Strict-Transport-Security`    | 2 years + preload                 | Protocol downgrade attacks, MITM         |
| `X-Frame-Options`              | `DENY`                            | Clickjacking                             |
| `X-Content-Type-Options`       | `nosniff`                         | MIME-type confusion attacks              |
| `Referrer-Policy`              | `strict-origin-when-cross-origin` | Sensitive URL leakage                    |
| `Permissions-Policy`           | camera, mic, geo, topics disabled | API abuse via injected scripts           |
| `Cross-Origin-Opener-Policy`   | `same-origin`                     | Cross-window data leakage (Spectre)      |
| `Cross-Origin-Embedder-Policy` | `unsafe-none`                     | Third-party resource compatibility       |
| `Cross-Origin-Resource-Policy` | `same-origin`                     | Cross-origin resource theft              |
| `X-DNS-Prefetch-Control`       | `on`                              | _(performance, not security)_            |

---

## Hardening Checklist

Use this when reviewing a PR or preparing for a production launch.

- [ ] `Content-Security-Policy` is **not** present in `next.config.ts` headers
- [ ] `X-Frame-Options` value matches `frame-ancestors` in CSP (`DENY` ↔ `'none'`, or `SAMEORIGIN` ↔ `'self'`)
- [ ] `'unsafe-inline'` is **not** present in `script-src` for production
- [ ] `'unsafe-eval'` is **only** present in `script-src` when `nodeEnv === "development"`
- [ ] Every external domain loaded by the app is listed explicitly in the CSP (no `*` wildcards)
- [ ] The proxy matcher excludes all non-HTML routes (`/api`, `/_next/static`, `/_next/image`)
- [ ] Nonces are read only in Server Components, never passed as props to Client Components
- [ ] HSTS `preload` is intentional and the whole domain (including subdomains) is on HTTPS
- [ ] `Permissions-Policy` only allows APIs the app actually uses
- [ ] If `SharedArrayBuffer` is needed, `COEP` has been changed from `unsafe-none` to `require-corp` and all third-party resources verified
