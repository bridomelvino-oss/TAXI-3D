import { forWho } from "@/lib/content"
import { ScrollReveal, StaggerReveal, StaggerItem } from "@/components/ui/ScrollReveal"

export function ForWho() {
  return (
    <section
      className="bg-ivory py-24 md:py-36"
      aria-labelledby="for-who-heading"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <ScrollReveal className="mb-16 md:mb-20">
          <div className="flex flex-col gap-2">
            <p className="font-body text-[10px] tracking-[0.35em] uppercase text-gold">
              Pour vous, si —
            </p>
            <h2
              id="for-who-heading"
              className="font-display text-3xl font-bold tracking-[-0.025em] text-void md:text-5xl"
            >
              Pour qui c&apos;est fait
            </h2>
          </div>
        </ScrollReveal>

        {/* 3-column profiles */}
        <StaggerReveal
          className="grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-16"
          staggerDelay={0.13}
          baseDelay={0.05}
        >
          {forWho.map((profile, i) => (
            <StaggerItem key={profile.id}>
              <article className="group">
                {/* Number */}
                <div className="mb-6 flex items-center gap-4">
                  <span
                    className="font-display text-5xl font-black leading-none text-void/8 transition-colors duration-500 group-hover:text-gold/15"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="h-px flex-1 bg-void/10" aria-hidden />
                </div>

                {/* Profile title */}
                <h3 className="mb-4 font-display text-xl font-bold leading-[1.2] tracking-[-0.02em] text-void md:text-2xl">
                  {profile.profile}
                </h3>

                {/* Description */}
                <p className="mb-6 font-body text-sm leading-relaxed text-void/55">
                  {profile.description}
                </p>

                {/* Detail tag */}
                <p className="inline-block font-body text-xs tracking-wide text-emerald border-b border-emerald/30 pb-0.5">
                  {profile.detail}
                </p>
              </article>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  )
}
