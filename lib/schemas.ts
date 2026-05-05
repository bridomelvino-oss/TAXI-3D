import { z } from "zod"

export const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise.")
    .email("Cette adresse email n'est pas valide."),
})

export type NewsletterFormData = z.infer<typeof newsletterSchema>
