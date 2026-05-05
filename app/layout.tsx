import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import "./globals.css"
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider"
import { CustomCursor } from "@/components/ui/CustomCursor"
import { site } from "@/lib/content"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: "variable",
  axes: ["SOFT", "WONK", "opsz"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `${site.name} Newsletter — ${site.tagline}`,
    template: `%s — ${site.name} Newsletter`,
  },
  description: site.description,
  keywords: [
    "newsletter",
    "Diego Suarez",
    "Antsiranana",
    "Madagascar",
    "actualité",
    "jeunes",
    "informations",
  ],
  authors: [{ name: "Diego Newsletter" }],
  creator: "Diego Newsletter",
  openGraph: {
    type: "website",
    locale: "fr_MG",
    url: site.url,
    title: `${site.name} Newsletter`,
    description: site.description,
    siteName: site.name,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Diego Newsletter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} Newsletter`,
    description: site.description,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body>
        <SmoothScrollProvider>
          <CustomCursor />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  )
}
