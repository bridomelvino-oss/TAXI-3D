import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"
import { site, footer } from "@/lib/content"

export function Footer() {
  return (
    <footer className="border-t border-ivory/5 bg-void py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Top row */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Logo & tagline */}
          <div className="space-y-2">
            <p className="font-display text-2xl font-bold text-ivory">
              Diego<span className="text-gold">.</span>
            </p>
            <p className="font-body text-sm text-mist">
              {site.tagline}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Liens du pied de page" className="flex flex-wrap gap-x-8 gap-y-3">
            {footer.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="link-underline font-body text-sm text-ivory/50 transition-colors duration-300 hover:text-ivory/80"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social */}
          <div className="flex items-center gap-5">
            <a
              href={site.social.instagram}
              aria-label="Diego Newsletter sur Instagram"
              className="text-ivory/40 transition-colors duration-300 hover:text-gold"
            >
              <Instagram className="h-4.5 w-4.5" aria-hidden />
            </a>
            <a
              href={site.social.facebook}
              aria-label="Diego Newsletter sur Facebook"
              className="text-ivory/40 transition-colors duration-300 hover:text-gold"
            >
              <Facebook className="h-4.5 w-4.5" aria-hidden />
            </a>
            <a
              href={site.social.twitter}
              aria-label="Diego Newsletter sur X (Twitter)"
              className="text-ivory/40 transition-colors duration-300 hover:text-gold"
            >
              <Twitter className="h-4.5 w-4.5" aria-hidden />
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 border-t border-ivory/5 pt-8">
          <p className="font-body text-xs text-ivory/25 md:text-center">
            {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
