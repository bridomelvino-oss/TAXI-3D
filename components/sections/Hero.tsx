"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { hero } from "@/lib/content"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { ScrollIndicator } from "@/components/ui/ScrollIndicator"

const WORD_DELAY_BASE = 0.5
const WORD_DELAY_STEP = 0.12

export function Hero() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  // Subtle parallax on the background layer (12px max)
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"])
  // Slight fade and lift on the content
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={containerRef}
      className="relative flex h-svh min-h-[600px] flex-col items-start justify-end overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background layer — gradient evocating Diego sunset over the bay */}
      {/* Replace with next/image for a real photo of Diego */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 -top-[8%]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-void" />
        {/* Sunset glow — warm amber radiating from lower-right, suggesting the bay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 80% 110%, rgba(196,129,58,0.18) 0%, rgba(196,129,58,0.04) 45%, transparent 70%)",
          }}
        />
        {/* Subtle top-left counter-light for depth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 5% 5%, rgba(30,77,64,0.12) 0%, transparent 60%)",
          }}
        />
        {/* Grain texture overlay for premium feel */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 pt-32 md:px-10 md:pb-20"
      >
        <div className="max-w-4xl">
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
            className="mb-6 font-body text-xs tracking-[0.3em] text-ivory/40 uppercase md:mb-8 md:text-[11px]"
          >
            Newsletter hebdomadaire — Antsiranana, Madagascar
          </motion.p>

          {/* Main title — words animate in sequence */}
          <h1
            id="hero-heading"
            className="font-display font-black leading-[0.88] tracking-[-0.03em] text-ivory"
            style={{ fontSize: "clamp(3.5rem, 12vw, 10rem)" }}
          >
            {hero.title.map((line, lineIdx) => (
              <span key={lineIdx} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "100%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 0.8,
                    delay: WORD_DELAY_BASE + lineIdx * WORD_DELAY_STEP,
                    ease: [0.65, 0, 0.35, 1],
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: WORD_DELAY_BASE + hero.title.length * WORD_DELAY_STEP + 0.1,
              ease: [0.65, 0, 0.35, 1],
            }}
            className="mt-6 max-w-xl font-body text-base leading-relaxed text-ivory/55 md:mt-8 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: WORD_DELAY_BASE + hero.title.length * WORD_DELAY_STEP + 0.25,
              ease: [0.65, 0, 0.35, 1],
            }}
            className="mt-10 max-w-md md:mt-12"
            id="subscribe"
          >
            <NewsletterForm
              placeholder={hero.ctaPlaceholder}
              cta={hero.cta}
              variant="hero"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator — bottom-center */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <ScrollIndicator />
      </div>

      {/* Bottom fade to next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #0A0A0A)",
        }}
        aria-hidden
      />
    </section>
  )
}
