import { RootProvider } from "fumadocs-ui/provider/next"
import "./global.css"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import { connection } from "next/server"

import type { Metadata } from "next"

const inter = Inter({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://shadcn.izakcode.com"),
}

export default async function Layout({ children }: LayoutProps<"/">) {
  // Nonce-based CSP requires request-time rendering so Next can attach the
  // nonce to framework scripts and styles.
  await connection()
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ nonce }}>{children}</RootProvider>
      </body>
    </html>
  )
}
