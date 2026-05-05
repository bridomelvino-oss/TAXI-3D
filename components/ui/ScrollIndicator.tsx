"use client"

import { motion } from "framer-motion"

export function ScrollIndicator() {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 text-ivory/40"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      aria-hidden="true"
    >
      <span className="font-body text-[10px] tracking-[0.25em] uppercase">
        Défiler
      </span>
      <div className="relative h-10 w-px bg-ivory/20 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-full bg-gold/60"
          animate={{ y: ["−100%", "200%"] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: [0.65, 0, 0.35, 1],
            repeatDelay: 0.3,
          }}
        />
      </div>
    </motion.div>
  )
}
