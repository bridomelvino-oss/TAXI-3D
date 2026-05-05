"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import { newsletterSchema, type NewsletterFormData } from "@/lib/schemas"
import { cn } from "@/lib/utils"

interface NewsletterFormProps {
  placeholder?: string
  cta?: string
  variant?: "hero" | "final"
}

export function NewsletterForm({
  placeholder = "votre@email.com",
  cta = "S'abonner",
  variant = "hero",
}: NewsletterFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  })

  const onSubmit = async (data: NewsletterFormData) => {
    setStatus("loading")
    setServerError(null)

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || !json.success) {
        setServerError(json.error ?? "Une erreur est survenue. Réessaie.")
        setStatus("error")
        return
      }

      setStatus("success")
      reset()
      setTimeout(() => setStatus("idle"), 5000)
    } catch {
      setServerError("Connexion impossible. Vérifie ta connexion et réessaie.")
      setStatus("error")
    }
  }

  const isFinal = variant === "final"

  return (
    <div className="w-full space-y-3">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
            className="flex items-center gap-3 text-gold"
          >
            <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
            <p className={cn("font-body", isFinal ? "text-base" : "text-sm")}>
              Bienvenue dans la famille. Vérifiez vos mails.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className={cn("flex flex-col gap-3", isFinal ? "sm:flex-row" : "sm:flex-row")}
          >
            <div className="relative flex-1">
              <label
                htmlFor={`email-${variant}`}
                className="sr-only"
              >
                Adresse email
              </label>
              <input
                id={`email-${variant}`}
                type="email"
                autoComplete="email"
                placeholder={placeholder}
                aria-describedby={errors.email ? `email-error-${variant}` : undefined}
                aria-invalid={!!errors.email}
                className={cn(
                  "w-full bg-transparent font-body text-ivory placeholder:text-mist",
                  "border border-ivory/20 focus:border-gold/70 focus:outline-none",
                  "transition-colors duration-300",
                  isFinal
                    ? "h-14 px-5 text-base rounded-none"
                    : "h-12 px-4 text-sm rounded-none",
                )}
                {...register("email")}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    id={`email-error-${variant}`}
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
                    className="absolute -bottom-5 left-0 font-body text-xs text-gold/80"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className={cn(
                "group relative overflow-hidden font-body font-medium tracking-wide",
                "border border-gold text-ivory",
                "transition-colors duration-500",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                isFinal ? "h-14 px-10 text-sm" : "h-12 px-8 text-sm",
              )}
            >
              {/* Gold fill on hover */}
              <span
                className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:translate-x-0"
                aria-hidden
              />
              <span className="relative flex items-center gap-2">
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    {cta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </>
                )}
              </span>
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Erreur serveur */}
      <AnimatePresence>
        {status === "error" && serverError && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
            className="font-body text-xs text-gold/70"
          >
            {serverError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
