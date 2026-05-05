import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollReveal } from "@/components/ui/ScrollReveal"

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de Diego Newsletter.",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollReveal>
      <section className="border-t border-ivory/8 pt-10">
        <h2 className="mb-5 font-display text-xl font-bold tracking-tight text-ivory md:text-2xl">
          {title}
        </h2>
        <div className="space-y-3 font-body text-sm leading-relaxed text-ivory/50">
          {children}
        </div>
      </section>
    </ScrollReveal>
  )
}

export default function MentionsLegalesPage() {
  return (
    <>
      <Header />
      <main className="min-h-svh bg-void pt-32 pb-24 md:pt-40 md:pb-36">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          {/* Back */}
          <Link
            href="/"
            className="group mb-12 inline-flex items-center gap-2 font-body text-sm text-ivory/40 transition-colors duration-300 hover:text-ivory"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden
            />
            Retour
          </Link>

          <ScrollReveal className="mb-14">
            <h1 className="font-display text-4xl font-bold tracking-[-0.03em] text-ivory md:text-5xl">
              Mentions légales
            </h1>
          </ScrollReveal>

          <div className="space-y-10">
            <Section title="Éditeur">
              <p>Diego Newsletter</p>
              <p>Antsiranana (Diego Suarez), Madagascar</p>
              <p>
                Contact :{" "}
                <a
                  href="mailto:hello@diego.mg"
                  className="text-gold underline-offset-2 hover:underline"
                >
                  hello@diego.mg
                </a>
              </p>
            </Section>

            <Section title="Hébergement">
              <p>
                Ce site est hébergé par Vercel, Inc., 440 N Barranca Ave #4133,
                Covina, CA 91723, États-Unis.
              </p>
            </Section>

            <Section title="Propriété intellectuelle">
              <p>
                L&apos;ensemble des contenus présents sur ce site (textes, images,
                design, code) est protégé par le droit d&apos;auteur et est la
                propriété exclusive de Diego Newsletter, sauf mention contraire
                explicite.
              </p>
              <p>
                Toute reproduction, distribution ou utilisation sans autorisation
                écrite préalable est strictement interdite.
              </p>
            </Section>

            <Section title="Données personnelles">
              <p>
                Dans le cadre de l&apos;abonnement à la newsletter, nous collectons
                uniquement votre adresse email. Ces données ne sont jamais vendues ni
                partagées avec des tiers à des fins commerciales.
              </p>
              <p>
                Vous pouvez vous désinscrire à tout moment en cliquant sur le lien
                présent en bas de chaque email reçu, ou en nous contactant
                directement.
              </p>
              <p>
                Pour exercer vos droits d&apos;accès, de rectification ou de
                suppression, écrivez à{" "}
                <a
                  href="mailto:hello@diego.mg"
                  className="text-gold underline-offset-2 hover:underline"
                >
                  hello@diego.mg
                </a>
                .
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                Ce site utilise des cookies techniques strictement nécessaires à son
                fonctionnement. Aucun cookie publicitaire ou de traçage n&apos;est
                déposé.
              </p>
            </Section>

            <Section title="Limitation de responsabilité">
              <p>
                Diego Newsletter s&apos;efforce d&apos;assurer l&apos;exactitude des
                informations publiées, mais ne saurait être tenu responsable des
                erreurs ou omissions, ni des conséquences de l&apos;utilisation de ces
                informations.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
