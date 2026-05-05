# Diego Newsletter — Site vitrine

Site one-page premium pour la newsletter hebdomadaire **Diego**, destinée aux 18-30 ans d'Antsiranana (Diego Suarez), Madagascar.

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS v4** (config CSS-native via `@theme`)
- **Framer Motion v12** (animations scroll, parallaxe, transitions)
- **Lenis** (smooth scroll, désactivé sur mobile)
- **react-hook-form + zod** (validation formulaire)
- **Lucide React** (icônes line)

## Démarrer

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Structure des fichiers

```
├── app/
│   ├── layout.tsx            # Root layout : fonts, providers, métadonnées
│   ├── page.tsx              # Home page (assemblage des sections)
│   ├── globals.css           # Variables CSS, Tailwind v4 @theme, base styles
│   ├── a-propos/             # Page À propos
│   ├── archives/             # Page Archives
│   └── mentions-legales/     # Page Mentions légales
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx        # Navigation — transparent → solide au scroll
│   │   └── Footer.tsx        # Pied de page minimal
│   ├── sections/             # Sections de la home dans l'ordre
│   │   ├── Hero.tsx
│   │   ├── Manifeste.tsx
│   │   ├── Categories.tsx
│   │   ├── LastEditions.tsx
│   │   ├── ForWho.tsx
│   │   └── CtaFinal.tsx
│   ├── ui/
│   │   ├── NewsletterForm.tsx  # Formulaire réutilisable (zod + react-hook-form)
│   │   ├── CustomCursor.tsx    # Curseur custom desktop uniquement
│   │   ├── ScrollReveal.tsx    # Wrappers d'animation au scroll
│   │   └── ScrollIndicator.tsx
│   └── providers/
│       └── SmoothScrollProvider.tsx  # Lenis singleton
│
└── lib/
    ├── content.ts    # ← TOUT le contenu texte est ici
    ├── schemas.ts    # Validation Zod
    └── utils.ts      # cn() helper
```

## Ajouter une nouvelle édition de newsletter

Toutes les éditions sont dans **`lib/content.ts`**.

1. Ouvre `lib/content.ts`
2. Dans le tableau `allEditions`, ajoute un objet en haut du tableau :

```ts
{
  id: "13",                          // ID unique (incrémenter)
  number: "N°13",                    // Numéro affiché
  title: "Titre de l'édition",
  date: "5 mai 2025",
  excerpt: "Résumé en 1-2 phrases...",
  category: "Politique",             // Politique | Économie | Culture | Sport | Tech | Société
  featured: false,
},
```

3. Pour qu'elle apparaisse dans les **3 dernières éditions** de la home, mets à jour aussi le tableau `editions` (les 3 premières entrées).

## Remplacer l'image du hero

Le hero utilise actuellement un gradient CSS évoquant le coucher de soleil sur la baie de Diego. Pour remplacer par une vraie photo :

1. Place la photo dans `public/images/hero.jpg`
2. Dans `components/sections/Hero.tsx`, remplace le div de fond par :

```tsx
<motion.div style={{ y: bgY }} className="absolute inset-0 -top-[8%]">
  <Image
    src="/images/hero.jpg"
    alt="La baie de Diego Suarez au coucher du soleil"
    fill
    priority
    className="object-cover"
    sizes="100vw"
  />
  <div className="absolute inset-0 bg-void/70" />
</motion.div>
```

## Connecter le formulaire newsletter

Dans `components/ui/NewsletterForm.tsx`, remplace le `setTimeout` par un vrai appel API :

```ts
const res = await fetch("/api/subscribe", {
  method: "POST",
  body: JSON.stringify(data),
  headers: { "Content-Type": "application/json" },
})
if (!res.ok) throw new Error("Subscription failed")
```

Puis crée `app/api/subscribe/route.ts` avec votre intégration Mailchimp / Brevo / Kit.

## Palette couleurs

| Token | Hex | Usage |
|---|---|---|
| `void` | `#0A0A0A` | Fond principal |
| `ivory` | `#F5F1E8` | Texte et fonds clairs |
| `gold` | `#C4813A` | Accent unique (CTA, hovers) |
| `emerald` | `#1E4D40` | Usage minimal (tags) |
| `mist` | `#6B6058` | Texte secondaire |

## Déploiement

Le projet est optimisé pour **Vercel** — un `git push` sur la branche principale suffit.

```bash
npm run build   # Vérifier avant de déployer
```
