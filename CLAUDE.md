# RUNZONE

Dépôt mono-fichier : un mini jeu de tactique au tour par tour « Tribu Jungle »,
livré sous forme d'un seul composant React (`jungletribes.tsx`) destiné à
tourner dans le bac à sable d'artefact Claude.

## Structure

```
.
├── jungletribes.tsx     # Le composant React autonome (= l'artefact)
├── sandbox/             # Mini projet Vite pour tester localement
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/main.tsx     # Monte App depuis ../../jungletribes
└── README.md
```

## Convention clé : le fichier est un artefact

`jungletribes.tsx` doit rester **autonome** :

- Pas d'import relatif vers d'autres modules du repo.
- Le bloc en tête (`var React = { createElement, Fragment, useState, useMemo }`
  + `globalThis.React = React`) est volontaire — il permet à JSX (transform
  classique) de fonctionner dans le sandbox d'artefact sans import React. Ne
  pas le retirer.
- `export default function App()` est la seule sortie.

## Lancer en local pour tester

```bash
cd sandbox
npm install        # première fois
npm run dev        # http://127.0.0.1:5179/
```

Le dev server importe `../../jungletribes` (Vite résout le `.tsx`). Modifier
`jungletribes.tsx` déclenche HMR.

## Tester en headless (smoke + screenshots)

`sandbox/smoke.mjs` lance Playwright contre le dev server, clique des unités,
joue un tour et capture 4 PNG. Utile pour vérifier qu'une modif n'a rien
cassé visuellement.

```bash
cd sandbox
npm link playwright    # playwright est installé globalement dans cet env
node smoke.mjs
```

## Règles du jeu (résumé)

- Grille 8×8, 30 tours max.
- Terrains : Clairière, Forêt (def +1, coût mvt 2), Rivière (infranchissable),
  Marécage (coût 2), Ruines (def +1).
- Unités : Campement (20 PV, immobile), Cueilleur (3 PV, mvt 3, récolte),
  Guerrier (6 PV, atk 4), Sarbacane (3 PV, atk 3, portée 2).
- Ressources : 🍌 nourriture, 🪵 bois, 💎 gemme. Coûts de recrutement définis
  dans `UC[type].cost`.
- Victoire : détruire le camp ennemi, ou avoir ≥ d'unités que l'IA au tour 30.

## Notes pour l'IA / contributeurs

- Tout le code de jeu vit dans `jungletribes.tsx`. Pas de split par fichier.
- Le style "compact" (variables 1-2 lettres, ternaires imbriqués) est
  volontaire pour rester dans la limite d'artefact. Garder ce style.
- Pas de TypeScript strict : pas de types explicites, beaucoup d'implicit
  any. Tolérer.
- `_id` est un compteur module-global, OK car un seul `<App>` est monté.
- Pour ajouter une unité : étendre `UC`, ajouter une branche dans le SVG
  `Spr`, ajouter un bouton dans la barre de recrutement (≈ l. 410).
