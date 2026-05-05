import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollReveal } from "@/components/ui/ScrollReveal"
import { NewsletterForm } from "@/components/ui/NewsletterForm"

export const metadata: Metadata = {
  title: "À propos",
  description: "L'histoire de Diego Newsletter et l'équipe derrière le projet.",
}

export default function AProposPage() {
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

          <div className="grid gap-16 md:grid-cols-[1fr_1.8fr] md:gap-24 lg:gap-40">
            {/* Left — title */}
            <div className="md:sticky md:top-32 md:self-start">
              <ScrollReveal>
                <p className="mb-4 font-body text-[10px] tracking-[0.35em] uppercase text-gold/70">
                  Le projet
                </p>
                <h1 className="font-display text-4xl font-bold tracking-[-0.03em] text-ivory md:text-5xl lg:text-6xl">
                  À propos
                </h1>
              </ScrollReveal>
            </div>

            {/* Right — content */}
            <div className="space-y-16">
              <ScrollReveal>
                <section>
                  <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ivory md:text-3xl">
                    L&apos;origine
                  </h2>
                  <div className="space-y-4 font-body text-base leading-relaxed text-ivory/60">
                    <p>
                      Diego Newsletter est né d&apos;un constat simple : les jeunes d&apos;Antsiranana
                      manquaient d&apos;une source d&apos;information pensée pour eux. Ni trop lente,
                      ni trop dense. Locale dans son ancrage, nationale dans sa portée.
                    </p>
                    <p>
                      La baie de Diego est l&apos;une des plus belles du monde. Ses habitants
                      méritent une presse à la hauteur de cette réputation — rigoureuse,
                      lisible, respectueuse de leur intelligence.
                    </p>
                    <p>
                      Nous avons commencé à écrire en 2025. Chaque vendredi, une édition.
                      Pas plus, pas moins.
                    </p>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <section>
                  <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ivory md:text-3xl">
                    La ligne éditoriale
                  </h2>
                  <div className="space-y-4 font-body text-base leading-relaxed text-ivory/60">
                    <p>
                      Nous traitons l&apos;actualité nationale — politique, économique, culturelle,
                      sportive, technologique, sociale — depuis le prisme de Diego. Ce que ça
                      change ici, ce qui se passe là-bas, ce qui va arriver demain.
                    </p>
                    <p>
                      Notre ligne : aucun parti pris, aucune langue de bois. La complexité
                      rendue accessible, jamais simpliste. L&apos;honnêteté avant tout.
                    </p>
                  </div>
                </section>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <section>
                  <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ivory md:text-3xl">
                    L&apos;équipe
                  </h2>
                  <div className="space-y-4 font-body text-base leading-relaxed text-ivory/60">
                    <p>
                      Diego Newsletter est porté par une petite équipe de journalistes et
                      rédacteurs basés à Antsiranana et Antananarivo, passionnés par Madagascar
                      et convaincus que la jeunesse malgache mérite mieux que les fils d&apos;actu
                      standardisés.
                    </p>
                    <p className="italic text-ivory/30">
                      Les portraits de l&apos;équipe arrivent bientôt.
                    </p>
                  </div>
                </section>
              </ScrollReveal>

              {/* Mini CTA */}
              <ScrollReveal delay={0.2}>
                <div className="border border-ivory/8 p-8 md:p-10">
                  <p className="mb-6 font-display text-xl font-bold text-ivory">
                    Rejoindre la communauté
                  </p>
                  <NewsletterForm cta="S'abonner" variant="hero" />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
