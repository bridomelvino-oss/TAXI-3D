import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { StaggerReveal, StaggerItem } from "@/components/ui/ScrollReveal"
import { allEditions } from "@/lib/content"

export const metadata: Metadata = {
  title: "Archives",
  description: "Toutes les éditions passées de Diego Newsletter.",
}

export default function ArchivesPage() {
  return (
    <>
      <Header />
      <main className="min-h-svh bg-void pt-32 pb-24 md:pt-40 md:pb-36">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Back link */}
          <Link
            href="/"
            className="group mb-12 inline-flex items-center gap-2 font-body text-sm text-ivory/40 transition-colors duration-300 hover:text-ivory md:mb-16"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden
            />
            Retour
          </Link>

          {/* Page header */}
          <div className="mb-16 md:mb-20">
            <p className="mb-3 font-body text-[10px] tracking-[0.35em] uppercase text-gold/70">
              Toutes les éditions
            </p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.03em] text-ivory md:text-6xl">
              Archives
            </h1>
          </div>

          {/* Grid */}
          <StaggerReveal
            className="grid gap-px bg-ivory/4 md:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {allEditions.map((edition) => (
              <StaggerItem key={edition.id}>
                <article className="group flex h-full flex-col border border-ivory/8 bg-ivory/[0.02] p-7 transition-colors duration-500 hover:border-gold/20 md:p-8">
                  {/* Meta */}
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-body text-[10px] tracking-[0.3em] uppercase text-gold/70">
                      {edition.category}
                    </span>
                    <span className="font-body text-xs text-ivory/20">
                      {edition.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="mb-3 font-display text-xl font-bold leading-[1.2] tracking-[-0.02em] text-ivory md:text-2xl">
                    {edition.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="mb-6 font-body text-sm leading-relaxed text-mist line-clamp-2">
                    {edition.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between">
                    <time
                      dateTime={edition.date}
                      className="font-body text-xs text-ivory/25"
                    >
                      {edition.date}
                    </time>
                    <span
                      className="flex items-center gap-1.5 font-body text-xs text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    >
                      Lire <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerReveal>
        </div>
      </main>
      <Footer />
    </>
  )
}
