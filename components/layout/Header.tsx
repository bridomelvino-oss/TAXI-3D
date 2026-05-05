"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { nav, site } from "@/lib/content"
import { cn } from "@/lib/utils"

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.65, 0, 0.35, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-void/95 backdrop-blur-sm border-b border-ivory/5"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-20 md:px-10">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-[-0.02em] text-ivory md:text-2xl"
          aria-label="Diego Newsletter — Accueil"
        >
          Diego
          <span className="text-gold">.</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-8 md:flex"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline font-body text-sm tracking-wide text-ivory/70 transition-colors duration-300 hover:text-ivory"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="#subscribe"
            className="group relative overflow-hidden border border-gold/60 px-6 py-2.5 font-body text-sm font-medium text-ivory transition-colors duration-500 hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:translate-x-0" aria-hidden />
            <span className="relative">S&apos;abonner</span>
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="flex h-10 w-10 items-center justify-center text-ivory md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <motion.div
        id="mobile-menu"
        initial={false}
        animate={menuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
        className="overflow-hidden border-t border-ivory/5 bg-void/98 md:hidden"
        aria-hidden={!menuOpen}
      >
        <nav
          aria-label="Navigation mobile"
          className="flex flex-col gap-1 px-6 py-6"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="font-body py-3 text-base text-ivory/70 transition-colors hover:text-ivory"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="#subscribe"
            onClick={() => setMenuOpen(false)}
            className="mt-4 inline-block border border-gold px-6 py-3 text-center font-body text-sm font-medium text-ivory"
          >
            S&apos;abonner
          </Link>
        </nav>
      </motion.div>
    </motion.header>
  )
}
