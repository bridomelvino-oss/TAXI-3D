import { NextResponse } from "next/server"
import { newsletterSchema } from "@/lib/schemas"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  }

  const result = newsletterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 })
  }

  const { email } = result.data

  // Mode développement — pas de clé API configurée
  if (!process.env.BREVO_API_KEY) {
    console.info("[Newsletter] Subscription enregistrée (mode dev) :", email)
    return NextResponse.json({ success: true })
  }

  try {
    const listId = Number(process.env.BREVO_LIST_ID ?? "2")

    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // met à jour si le contact existe déjà
      }),
    })

    // 204 = succès sans contenu, 201 = créé
    if (res.status === 204 || res.status === 201) {
      return NextResponse.json({ success: true })
    }

    const data = (await res.json()) as { code?: string; message?: string }

    // Contact déjà existant — pas une vraie erreur
    if (data.code === "duplicate_parameter") {
      return NextResponse.json({ success: true })
    }

    console.error("[Newsletter] Brevo error:", data)
    return NextResponse.json(
      { error: "Erreur lors de l'inscription. Réessaie dans un moment." },
      { status: 500 },
    )
  } catch (err) {
    console.error("[Newsletter] Fetch error:", err)
    return NextResponse.json(
      { error: "Impossible de contacter le serveur d'envoi." },
      { status: 500 },
    )
  }
}
