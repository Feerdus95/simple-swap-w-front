import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { Suspense } from "react"
import { AppHeader } from "@/components/app-header"
import { Providers } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: "SimpleSwap DEX",
    template: "%s | SimpleSwap DEX"
  },
  description: "Decentralized Exchange on Ethereum Sepolia",
  generator: 'Next.js',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "SimpleSwap DEX",
    description: "Decentralized Exchange on Ethereum Sepolia",
    url: "/",
    siteName: "SimpleSwap DEX",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    title: "SimpleSwap DEX",
    card: "summary_large_image",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            <AppHeader />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
              {children}
            </Suspense>
          </Providers>
        </ThemeProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
