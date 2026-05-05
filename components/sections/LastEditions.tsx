"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { editions } from "@/lib/content"
import { ScrollReveal, StaggerReveal, StaggerItem } from "@/components/ui/ScrollReveal"

function FeaturedCard({ edition }: { edition: typeof editions[number] }) {
  return (
    <article className="group flex h-full flex-col border border-ivory/8 bg-ivory/[0.03] p-8 transition-colors duration-500 hover:border-gold/20 md:p-10 lg:p-12">
      {/* Category + Number */}
      <div className="mb-8 flex items-center justify-between">
        <span className="font-body text-[10px] tracking-[0.3em] uppercase text-gold/70">
          {edition.category}
        </span>
        <span className="font-body text-xs text-ivory/20">{edition.number}</span>
      </div>

      {/* Color block — placeholder for edition image */}
      <div
        className="mb-8 aspect-[16/9] w-full transition-opacity duration-500 group-hover:opacity-90"
        style={{
          background:
            "linear-gradient(135deg, rgba(196,129,58,0.08) 0%, rgba(30,77,64,0.08) 100%)",
          borderLeft: "1px solid rgba(196,129,58,0.15)",
        }}
        aria-hidden
      />

      {/* Text */}
      <h3 className="mb-4 font-display text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-ivory transition-colors duration-300 group-hover:text-ivory md:text-3xl lg:text-4xl">
        {edition.title}
      </h3>
      <p className="mb-6 font-body text-sm leading-relaxed text-mist line-clamp-3">
        {edition.excerpt}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <time
          dateTime={edition.date}
          className="font-body text-xs text-ivory/25"
        >
          {edition.date}
        </time>
        <motion.span
          className="flex items-center gap-2 font-body text-xs text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          Lire <ArrowRight className="h-3 w-3" />
        </motion.span>
      </div>
    </article>
  )
}

function CompactCard({ edition }: { edition: typeof editions[number] }) {
  return (
    <article className="group flex flex-col border border-ivory/8 bg-ivory/[0.03] p-6 transition-colors duration-500 hover:border-gold/20 md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <span className="font-body text-[10px] tracking-[0.3em] uppercase text-gold/70">
          {edition.category}
        </span>
        <span className="font-body text-xs text-ivory/20">{edition.number}</span>
      </div>

      <h3 className="mb-3 font-display text-xl font-bold leading-[1.2] tracking-[-0.02em] text-ivory md:text-2xl">
        {edition.title}
      </h3>
      <p className="mb-5 font-body text-sm leading-relaxed text-mist line-clamp-2">
        {edition.excerpt}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <time
          dateTime={edition.date}
          className="font-body text-xs text-ivory/25"
        >
          {edition.date}
        </time>
        <motion.span
          className="flex items-center gap-1.5 font-body text-xs text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          Lire <ArrowRight className="h-3 w-3" />
        </motion.span>
      </div>
    </article>
  )
}

export function LastEditions() {
  const [featured, ...rest] = editions

  return (
    <section
      className="bg-void py-24 md:py-36"
      aria-labelledby="editions-heading"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <ScrollReveal>
            <h2
              id="editions-heading"
              className="font-display text-3xl font-bold tracking-[-0.025em] text-ivory md:text-5xl"
            >
              Dernières éditions
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <Link
              href="/archives"
              className="group flex items-center gap-2 font-body text-sm text-ivory/40 transition-colors duration-300 hover:text-gold"
            >
              Voir toutes les éditions
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </ScrollReveal>
        </div>

        {/* Asymmetric editorial layout */}
        <div className="grid gap-px bg-ivory/4 md:grid-cols-[1.6fr_1fr]">
          {/* Featured — left, full height */}
          <ScrollReveal>
            <FeaturedCard edition={featured} />
          </ScrollReveal>

          {/* Right column — 2 stacked compact cards */}
          <StaggerReveal
            className="flex flex-col gap-px"
            staggerDelay={0.15}
            baseDelay={0.15}
          >
            {rest.map((edition) => (
              <StaggerItem key={edition.id} className="flex-1">
                <CompactCard edition={edition} />
              </StaggerItem>
            ))}
          </StaggerReveal>
        </div>
      </div>
    </section>
  )
}
