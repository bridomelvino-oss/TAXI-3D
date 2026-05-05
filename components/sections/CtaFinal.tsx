import { Shield } from "lucide-react"
import { ctaFinal } from "@/lib/content"
import { NewsletterForm } from "@/components/ui/NewsletterForm"
import { ScrollReveal } from "@/components/ui/ScrollReveal"

export function CtaFinal() {
  return (
    <section
      className="bg-void py-24 md:py-36"
      id="subscribe-final"
      aria-labelledby="cta-heading"
    >
      {/* Subtle gold line at top */}
      <div className="mx-auto mb-0 max-w-7xl px-6 md:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          {/* Heading */}
          <ScrollReveal>
            <h2
              id="cta-heading"
              className="mb-6 font-display text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-ivory md:text-6xl"
            >
              {ctaFinal.title}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="mb-12 font-body text-base leading-relaxed text-mist md:text-lg">
              {ctaFinal.subtitle}
            </p>
          </ScrollReveal>

          {/* Form */}
          <ScrollReveal delay={0.2} className="mx-auto max-w-md">
            <NewsletterForm cta={ctaFinal.cta} variant="final" />
          </ScrollReveal>

          {/* Reassurance */}
          <ScrollReveal delay={0.3} className="mt-8">
            <p className="flex items-center justify-center gap-2 font-body text-xs text-ivory/25">
              <Shield className="h-3.5 w-3.5 shrink-0 text-ivory/20" aria-hidden />
              {ctaFinal.reassurance}
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
