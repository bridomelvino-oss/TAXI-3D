import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Hero } from "@/components/sections/Hero"
import { Manifeste } from "@/components/sections/Manifeste"
import { Categories } from "@/components/sections/Categories"
import { LastEditions } from "@/components/sections/LastEditions"
import { ForWho } from "@/components/sections/ForWho"
import { CtaFinal } from "@/components/sections/CtaFinal"

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifeste />
        <Categories />
        <LastEditions />
        <ForWho />
        <CtaFinal />
      </main>
      <Footer />
    </>
  )
}
