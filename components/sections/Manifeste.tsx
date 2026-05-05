"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { manifeste } from "@/lib/content"
import { ScrollReveal } from "@/components/ui/ScrollReveal"

function AnimatedParagraph({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-15% 0px" })

  // Split into lines (rough split — 1 sentence per animation unit)
  const sentences = text.split(". ").filter(Boolean)

  return (
    <p
      ref={ref}
      className="font-body text-lg leading-relaxed text-ivory/65 md:text-xl md:leading-relaxed"
    >
      {sentences.map((sentence, i) => (
        <motion.span
          key={i}
          className="inline"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: 0.65,
            delay: delay + i * 0.15,
            ease: [0.65, 0, 0.35, 1],
          }}
        >
          {sentence}
          {i < sentences.length - 1 ? ". " : ""}
        </motion.span>
      ))}
    </p>
  )
}

export function Manifeste() {
  return (
    <section
      className="bg-void py-24 md:py-40"
      aria-labelledby="manifeste-heading"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Label */}
        <ScrollReveal>
          <p className="mb-12 font-body text-[10px] tracking-[0.35em] text-gold/70 uppercase md:mb-16">
            {manifeste.label}
          </p>
        </ScrollReveal>

        <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-24 lg:gap-40">
          {/* Left — intro statement */}
          <div>
            <ScrollReveal>
              <h2
                id="manifeste-heading"
                className="font-display text-3xl font-bold leading-[1.1] tracking-[-0.025em] text-ivory md:text-4xl lg:text-5xl"
              >
                {manifeste.intro}
              </h2>
            </ScrollReveal>
          </div>

          {/* Right — body paragraphs */}
          <div className="space-y-6 md:pt-2">
            {manifeste.body.map((paragraph, i) => (
              <AnimatedParagraph key={i} text={paragraph} delay={i * 0.1} />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 border-t border-ivory/8 pt-16 md:mt-28 md:pt-20">
          <div className="grid grid-cols-3 gap-8 md:gap-16">
            {manifeste.stats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.12}>
                <div className="space-y-2">
                  <p
                    className="font-display font-bold leading-none text-ivory"
                    style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="font-body text-xs text-mist tracking-wide md:text-sm">
                    {stat.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
