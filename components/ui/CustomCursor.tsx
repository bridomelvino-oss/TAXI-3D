"use client"

import { useEffect, useRef } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  // Spring for the trailing dot
  const springX = useSpring(mouseX, { stiffness: 120, damping: 22, mass: 0.5 })
  const springY = useSpring(mouseY, { stiffness: 120, damping: 22, mass: 0.5 })

  // Faster spring for the small dot
  const fastX = useSpring(mouseX, { stiffness: 400, damping: 30 })
  const fastY = useSpring(mouseY, { stiffness: 400, damping: 30 })

  useEffect(() => {
    // Only show on devices that support hover
    const isTouchDevice = window.matchMedia("(hover: none)").matches
    if (isTouchDevice) return

    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    const onLinkEnter = () => {
      cursorRef.current?.setAttribute("data-hover", "true")
    }

    const onLinkLeave = () => {
      cursorRef.current?.removeAttribute("data-hover")
    }

    window.addEventListener("mousemove", onMove)

    // Delegate hover detection to all interactive elements
    const addListeners = () => {
      const els = document.querySelectorAll("a, button, [data-cursor-hover]")
      els.forEach((el) => {
        el.addEventListener("mouseenter", onLinkEnter)
        el.addEventListener("mouseleave", onLinkLeave)
      })
    }

    addListeners()

    // Re-apply on route changes / dynamic content
    const observer = new MutationObserver(addListeners)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener("mousemove", onMove)
      observer.disconnect()
    }
  }, [mouseX, mouseY])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] hidden [@media(hover:hover)]:block"
    >
      {/* Outer ring — slow, trailing */}
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full border border-ivory/30 transition-all duration-300 [&[data-hover]]:scale-150 [&[data-hover]]:border-gold"
      />
      {/* Inner dot — fast, precise */}
      <motion.div
        style={{ x: fastX, y: fastY }}
        className="absolute -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-gold"
      />
    </div>
  )
}
