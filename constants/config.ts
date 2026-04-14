// ─────────────────────────────────────────────
// Configuration globale de RunZone
// Contexte géographique : Diego-Suarez, Madagascar
// ─────────────────────────────────────────────

import { Coordinate } from '../types';

/** Centre de la carte par défaut : Diego-Suarez */
export const DIEGO_CENTER: Coordinate = {
  latitude: -12.355,
  longitude: 49.300,
};

/** Zoom initial de la carte (delta lat/lng) */
export const CARTE_DELTA_INITIAL = {
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/** Zoom pendant la course (plus précis) */
export const CARTE_DELTA_COURSE = {
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

/** Quartiers de Diego-Suarez (pour affichage informatif) */
export const QUARTIERS_DIEGO: Record<string, Coordinate> = {
  Dixon:        { latitude: -12.345, longitude: 49.295 },
  'Tanambao 1': { latitude: -12.360, longitude: 49.305 },
  'Tanambao 5': { latitude: -12.370, longitude: 49.310 },
  Ambalabe:     { latitude: -12.380, longitude: 49.300 },
  Ankorika:     { latitude: -12.350, longitude: 49.285 },
  Andranofaly:  { latitude: -12.390, longitude: 49.295 },
  Ramena:       { latitude: -12.285, longitude: 49.370 },
};

// ─── Tracking GPS ────────────────────────────
/** Intervalle de mise à jour GPS pendant la course (ms) */
export const GPS_UPDATE_INTERVAL_MS = 2000;

/** Distance minimale entre deux points GPS pour enregistrer (mètres) */
export const GPS_MIN_DISTANCE_M = 5;

/** Précision GPS minimale acceptable (mètres) */
export const GPS_MIN_ACCURACY_M = 30;

// ─── Algorithme zones ─────────────────────────
/** Aire minimale d'une zone pour être valide (m²) */
export const ZONE_MIN_AREA_M2 = 500;

/** Distance de fermeture du circuit (mètres) :
 *  quand le coureur revient à moins de X mètres du départ, le circuit se ferme */
export const CIRCUIT_CLOSE_DISTANCE_M = 30;

/** Nombre minimum de points GPS pour créer une zone */
export const CIRCUIT_MIN_POINTS = 10;

// ─── Firebase collections ────────────────────
export const FIRESTORE_COLLECTIONS = {
  zones: 'zones',
  users: 'users',
  classement: 'classement',
} as const;

// ─── Notifications ───────────────────────────
export const NOTIF_CHANNEL_ID = 'runzone-conquetes';

// ─── Course ──────────────────────────────────
/** Vitesse minimale considérée comme "en train de courir" (km/h) */
export const VITESSE_MIN_COURSE_KMH = 3;

/** Durée maximale d'une course (ms) — sécurité */
export const COURSE_MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4h
