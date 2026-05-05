// Central content file — edit here to update all text across the site.

export const site = {
  name: "Diego",
  tagline: "L'actualité malgache qui compte.",
  description:
    "Une newsletter hebdomadaire décryptant l'actualité nationale pour les 18-30 ans d'Antsiranana.",
  url: "https://diego.mg",
  social: {
    instagram: "#",
    facebook: "#",
    twitter: "#",
  },
}

export const hero = {
  title: ["Diego,", "dans votre", "boîte mail."],
  subtitle:
    "L'actualité qui façonne Madagascar — décryptée chaque semaine, livrée directement chez vous.",
  cta: "S'abonner",
  ctaPlaceholder: "votre@email.com",
  // Photo de fond du hero.
  // → Mets ici l'URL d'une photo de Diego (Unsplash, Google Drive direct, etc.)
  // → null = utilise le gradient par défaut
  heroImage: null as string | null,
  heroImageAlt: "La baie de Diego Suarez au coucher du soleil",
}

export const manifeste = {
  label: "N°01 — Le manifeste",
  intro:
    "Antsiranana possède l'une des plus belles rades du monde. Ses habitants le savent. Ce qu'ils méritent aussi, c'est une information à la hauteur de cette ambition.",
  body: [
    "Diego Newsletter, c'est un pari simple : offrir aux jeunes d'Antsiranana une lecture hebdomadaire qui informe sans condescendre, qui analyse sans complexifier, qui parle de Madagascar sans oublier que Diego est une ville à part entière.",
    "Politique nationale, économie qui bouge, culture qui résiste, sport qui unit — chaque semaine, en cinq minutes, vous savez ce qui compte vraiment. Pas de bruit. Pas de clickbait. Juste l'essentiel, bien écrit.",
  ],
  stats: [
    { value: "1", label: "édition par semaine" },
    { value: "5 min", label: "de lecture" },
    { value: "0", label: "publicité" },
  ],
}

export const categories = [
  {
    id: "politique",
    label: "Politique",
    description:
      "Les décisions qui façonnent le pays, analysées sans parti pris ni langue de bois.",
    icon: "Landmark",
  },
  {
    id: "economie",
    label: "Économie",
    description:
      "Investissements, emploi, pouvoir d'achat — ce qui change concrètement votre quotidien.",
    icon: "TrendingUp",
  },
  {
    id: "culture",
    label: "Culture",
    description:
      "Musique, cinéma, littérature, art — la création malgache vue depuis Diego.",
    icon: "Palette",
  },
  {
    id: "sport",
    label: "Sport",
    description:
      "Les Barea, les championnats locaux, les athlètes qui font la fierté d'Antsiranana.",
    icon: "Trophy",
  },
  {
    id: "tech",
    label: "Tech",
    description:
      "Startups, numérique, innovation — le futur qui s'invente à Madagascar.",
    icon: "Cpu",
  },
  {
    id: "societe",
    label: "Société",
    description:
      "Les tendances, les débats de fond, les questions que tout le monde se pose.",
    icon: "Users",
  },
]

export const editions = [
  {
    id: "1",
    number: "N°12",
    title: "Le budget 2025 expliqué en dix points",
    date: "28 avril 2025",
    excerpt:
      "Le gouvernement a présenté sa loi de finances rectificative. Entre coupes budgétaires et nouvelles priorités, on décortique ce que ça change pour vous.",
    category: "Économie",
    featured: true,
  },
  {
    id: "2",
    number: "N°11",
    title: "Tourisme à Diego : le grand retour ?",
    date: "14 avril 2025",
    excerpt:
      "Les arrivées touristiques dans la région DIANA ont bondi de 34% au premier trimestre. Qui en profite vraiment, et qui reste sur le bord du chemin ?",
    category: "Économie",
    featured: false,
  },
  {
    id: "3",
    number: "N°10",
    title: "La génération Z malgache face au marché de l'emploi",
    date: "7 avril 2025",
    excerpt:
      "Diplômés mais sous-employés, mobiles mais attachés à leur ville — portrait d'une génération qui réinvente ses stratégies de survie professionnelle.",
    category: "Société",
    featured: false,
  },
]

export const forWho = [
  {
    id: "etudiant",
    profile: "L'étudiant qui veut comprendre",
    description:
      "Tu lis les fils d'actu mais tu n'as jamais le contexte pour tout assembler. Diego te donne les clés — sans cours magistral, sans jargon — pour que tu saches vraiment de quoi tu parles.",
    detail: "Pour ceux qui construisent leur opinion.",
  },
  {
    id: "actif",
    profile: "Le jeune actif qui n'a pas le temps",
    description:
      "Entre le boulot, les transports et le reste, tu n'as pas une heure par jour pour décrypter l'actu. En cinq minutes le week-end, tu es à jour sur tout ce qui compte.",
    detail: "Pour ceux qui veulent l'essentiel, vite.",
  },
  {
    id: "curieux",
    profile: "Le curieux qui veut creuser",
    description:
      "Tu connais déjà les titres, mais tu veux le dessous des cartes. Diego va chercher les angles que les médias traditionnels négligent, depuis Diego, pour Diego.",
    detail: "Pour ceux qui ne se contentent pas des évidences.",
  },
]

export const ctaFinal = {
  title: "Rejoignez les lecteurs de Diego",
  subtitle:
    "Chaque semaine dans votre boîte mail, une lettre qui vous donne de l'avance.",
  reassurance:
    "Pas de spam. Désinscription en un clic. Vos données restent à Diego.",
  cta: "Je m'abonne",
}

export const nav = [
  { label: "Archives", href: "/archives" },
  { label: "À propos", href: "/a-propos" },
]

export const footer = {
  links: [
    { label: "À propos", href: "/a-propos" },
    { label: "Archives", href: "/archives" },
    { label: "Contact", href: "mailto:hello@diego.mg" },
    { label: "Mentions légales", href: "/mentions-legales" },
  ],
  copyright: `© ${new Date().getFullYear()} Diego Newsletter — Antsiranana, Madagascar`,
}

// Archives page — ajouter chaque nouvelle édition ici
export const allEditions = [
  ...editions,
  {
    id: "4",
    number: "N°09",
    title: "Les défis de l'eau potable dans le Grand-Nord",
    date: "31 mars 2025",
    excerpt:
      "Malgré les richesses naturelles de la région DIANA, l'accès à l'eau reste une bataille quotidienne pour des dizaines de milliers de familles.",
    category: "Société",
    featured: false,
  },
  {
    id: "5",
    number: "N°08",
    title: "Football : les Barea en route pour la CAN 2026 ?",
    date: "24 mars 2025",
    excerpt:
      "Après la déception des qualifications passées, la sélection nationale repart avec un nouveau staff et des ambitions renouvelées.",
    category: "Sport",
    featured: false,
  },
  {
    id: "6",
    number: "N°07",
    title: "Startups malgaches : l'année du pivot",
    date: "17 mars 2025",
    excerpt:
      "Plusieurs jeunes entreprises tech de Tana et Diego ont revu leurs modèles face aux réalités du financement. Qui a survécu, qui a prospéré ?",
    category: "Tech",
    featured: false,
  },
]
