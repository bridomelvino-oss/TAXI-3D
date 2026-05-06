// ─────────────────────────────────────────────
// Types globaux de l'application RunZone
// ─────────────────────────────────────────────

/** Coordonnée GPS brute */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Point GPS enrichi avec timestamp et précision */
export interface GpsPoint extends Coordinate {
  timestamp: number;
  accuracy?: number;
  speed?: number; // m/s
}

/** Une zone conquise par un joueur */
export interface Zone {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerColor: string;       // couleur hex du joueur
  coordinates: Coordinate[]; // polygone fermé
  aireM2: number;           // surface en m²
  createdAt: number;        // timestamp Unix ms
  conqueredAt?: number;     // si reconquise : quand
  previousOwnerId?: string; // ancien propriétaire
}

/** Profil utilisateur stocké dans Firestore */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  color: string;             // couleur hex unique du joueur
  totalAireM2: number;       // territoire total actuel
  zonesCount: number;        // nombre de zones possédées
  coursesCount: number;      // nombre total de courses
  createdAt: number;
  derniersCourses?: CourseHistoryEntry[]; // 5 dernières courses
}

/** Entrée d'historique de course (stockée dans le profil) */
export interface CourseHistoryEntry {
  date: number;          // timestamp Unix ms
  distanceM: number;     // distance parcourue
  aireM2: number;        // surface de la zone créée
  zonesConquises: number; // zones adverses conquises
}

/** Session de course en cours */
export interface CourseSession {
  startedAt: number;
  points: GpsPoint[];
  distanceM: number;         // distance cumulée en mètres
  isRunning: boolean;
}

/** Entrée du classement */
export interface ClassementEntry {
  uid: string;
  displayName: string;
  color: string;
  totalAireM2: number;
  zonesCount: number;
  rank: number;
}

/** Résultat d'un algorithme de conquête */
export interface ConqueteResult {
  zonesConquises: Zone[];
  nouvelleZone: Zone;
}
