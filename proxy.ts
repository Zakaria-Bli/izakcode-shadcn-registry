import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation"
import { NextRequest, NextResponse } from "next/server"

import { buildContentSecurityPolicy } from "@/lib/security/headers"
import { docsContentRoute, docsRoute } from "@/lib/shared"

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`
)
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.mdx`,
  `${docsContentRoute}{/*path}/content.md`
)

function createNonce() {
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)

  return Buffer.from(nonceBytes).toString("base64")
}

function withContentSecurityPolicy(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp)

  return response
}

export default function proxy(request: NextRequest) {
  const result = rewriteSuffix(request.nextUrl.pathname)
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl))
  }

  if (isMarkdownPreferred(request)) {
    const result = rewriteDocs(request.nextUrl.pathname)

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl))
    }
  }

  const nonce = createNonce()
  const csp = buildContentSecurityPolicy(process.env.NODE_ENV).replace(/{NONCE}/g, nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  return withContentSecurityPolicy(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    csp
  )
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next|__nextjs|favicon.ico|robots.txt|sitemap.xml|llms.txt|llms-full.txt|llms.mdx/docs|og/docs).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
