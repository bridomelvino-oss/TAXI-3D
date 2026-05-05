"use client"

import {
  Landmark,
  TrendingUp,
  Palette,
  Trophy,
  Cpu,
  Users,
  type LucideIcon,
} from "lucide-react"
import { motion } from "framer-motion"
import { categories } from "@/lib/content"
import { ScrollReveal, StaggerReveal, StaggerItem } from "@/components/ui/ScrollReveal"

const iconMap: Record<string, LucideIcon> = {
  Landmark,
  TrendingUp,
  Palette,
  Trophy,
  Cpu,
  Users,
}

function CategoryCard({
  label,
  description,
  icon,
}: {
  label: string
  description: string
  icon: string
}) {
  const Icon = iconMap[icon] ?? Landmark

  return (
    <motion.article
      className="group relative border border-ivory-dim/10 bg-ivory/[0.02] p-7 transition-colors duration-500 hover:border-gold/20 hover:bg-ivory/[0.04] md:p-8 lg:p-10"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
    >
      {/* Gold accent line — grows from left on hover */}
      <div className="absolute left-0 top-0 h-px w-0 bg-gold/60 transition-all duration-500 group-hover:w-full" aria-hidden />

      {/* Icon */}
      <div className="mb-6">
        <Icon
          className="h-5 w-5 text-ivory/30 transition-colors duration-500 group-hover:text-gold"
          aria-hidden
          strokeWidth={1.5}
        />
      </div>

      {/* Label */}
      <h3 className="mb-3 font-display text-xl font-bold tracking-tight text-ivory md:text-2xl">
        {label}
      </h3>

      {/* Description */}
      <p className="font-body text-sm leading-relaxed text-mist transition-colors duration-300 group-hover:text-mist-light">
        {description}
      </p>
    </motion.article>
  )
}

export function Categories() {
  return (
    <section
      className="bg-ivory py-24 md:py-36"
      aria-labelledby="categories-heading"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <ScrollReveal>
            <h2
              id="categories-heading"
              className="font-display text-3xl font-bold tracking-[-0.025em] text-void md:text-5xl"
            >
              Ce qu&apos;on couvre
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="max-w-xs font-body text-sm leading-relaxed text-void/50 md:text-right">
              Six domaines. Une lecture. <br className="hidden md:block" />
              Chaque semaine, sans exception.
            </p>
          </ScrollReveal>
        </div>

        {/* Grid */}
        <StaggerReveal
          className="grid gap-px bg-ivory-dim/20 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.08}
          baseDelay={0.1}
        >
          {categories.map((cat) => (
            <StaggerItem key={cat.id}>
              <CategoryCard
                label={cat.label}
                description={cat.description}
                icon={cat.icon}
              />
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  )
}
