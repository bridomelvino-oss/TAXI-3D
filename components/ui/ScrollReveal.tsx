"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  translateY?: number
  once?: boolean
}

// Reusable wrapper that fades + slides up when entering the viewport.
// Never bounces — uses a slow, confident easing.
export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  translateY = 24,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-10% 0px" })

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y: translateY }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: translateY }}
      transition={{
        duration,
        delay,
        ease: [0.65, 0, 0.35, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// Staggered children reveal — each child animates in sequence
interface StaggerRevealProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  baseDelay?: number
}

export function StaggerReveal({
  children,
  className,
  staggerDelay = 0.1,
  baseDelay = 0,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" })

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: baseDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Child item for StaggerReveal
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.65, ease: [0.65, 0, 0.35, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
