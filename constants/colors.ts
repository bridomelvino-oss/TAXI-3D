// ─────────────────────────────────────────────
// Palette de couleurs de RunZone
// Thème sombre inspiré des cartes nocturnes
// ─────────────────────────────────────────────

export const Colors = {
  // Fonds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  card: '#1E1E1E',

  // Accents principaux
  primary: '#FF4136',      // rouge course
  primaryDark: '#CC2A21',
  secondary: '#00C851',    // vert territoire
  secondaryDark: '#008C38',
  accent: '#FF851B',       // orange distance

  // Texte
  textPrimary: '#F5F5F5',
  textSecondary: '#9E9E9E',
  textMuted: '#5A5A5A',

  // Navbar / Tabs
  tabBar: '#111111',
  tabBarBorder: '#2A2A2A',
  tabActive: '#FF4136',
  tabInactive: '#5A5A5A',

  // Carte
  mapOverlay: 'rgba(0, 0, 0, 0.3)',

  // États
  success: '#00C851',
  warning: '#FFB300',
  error: '#FF4136',
  info: '#2979FF',

  // Zones joueurs (palette pour attribuer une couleur par joueur)
  playerColors: [
    '#FF4136', // rouge
    '#2ECC40', // vert
    '#0074D9', // bleu
    '#FF851B', // orange
    '#B10DC9', // violet
    '#39CCCC', // cyan
    '#FFDC00', // jaune
    '#F012BE', // magenta
    '#01FF70', // lime
    '#7FDBFF', // bleu ciel
  ],

  // Transparences pour les polygones de zones
  zoneOpacity: 0.35,
  zoneStrokeOpacity: 0.9,
  traceColor: '#FF4136',
  traceOpacity: 0.9,
} as const;

export type ColorKey = keyof typeof Colors;
