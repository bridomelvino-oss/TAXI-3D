// ─────────────────────────────────────────────
// Service Zones — RunZone
//
// Algorithmes de :
//   - Calcul d'aire d'un polygone GPS (Shoelace)
//   - Simplification du tracé (Douglas-Peucker)
//   - Détection de conquête (ray-casting)
//   - Génération d'ID de zone
// ─────────────────────────────────────────────

import { Coordinate, Zone, GpsPoint, ConqueteResult, UserProfile } from '../types';
import { ZONE_MIN_AREA_M2, CIRCUIT_MIN_POINTS } from '../constants/config';
import { calculerDistance } from './location';

const EARTH_RADIUS_M = 6371000;

// ─────────────────────────────────────────────────────────────────────────────
// CALCUL D'AIRE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'aire d'un polygone en m² via la formule de Shoelace adaptée
 * pour les coordonnées GPS (projection approximative sur plan local).
 *
 * Valide pour des petites surfaces (<100 km²) — parfait pour des zones de course.
 */
export function calculerAirePolygone(coords: Coordinate[]): number {
  if (coords.length < 3) return 0;

  // Convertit lat/lng en mètres par rapport au centroïde
  const centroid = calculerCentroide(coords);
  const latRad = (centroid.latitude * Math.PI) / 180;
  const mParDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mParDegLon = mParDegLat * Math.cos(latRad);

  const points = coords.map((c) => ({
    x: (c.longitude - centroid.longitude) * mParDegLon,
    y: (c.latitude - centroid.latitude) * mParDegLat,
  }));

  // Formule de Shoelace
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calcule le centroïde géographique d'un ensemble de coordonnées.
 */
export function calculerCentroide(coords: Coordinate[]): Coordinate {
  const lat = coords.reduce((s, c) => s + c.latitude, 0) / coords.length;
  const lon = coords.reduce((s, c) => s + c.longitude, 0) / coords.length;
  return { latitude: lat, longitude: lon };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLIFICATION DU TRACÉ (Douglas-Peucker)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simplifie un tracé GPS en réduisant le nombre de points
 * tout en conservant la forme générale.
 *
 * @param points   — tracé brut
 * @param epsilon  — tolérance en mètres (défaut : 3m)
 */
export function simplifierTrace(
  points: Coordinate[],
  epsilon = 3,
): Coordinate[] {
  if (points.length <= 2) return points;

  const debut = points[0];
  const fin = points[points.length - 1];
  let maxDist = 0;
  let indexMax = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = distancePointSegment(points[i], debut, fin);
    if (dist > maxDist) {
      maxDist = dist;
      indexMax = i;
    }
  }

  if (maxDist > epsilon) {
    const gauche = simplifierTrace(points.slice(0, indexMax + 1), epsilon);
    const droite = simplifierTrace(points.slice(indexMax), epsilon);
    return [...gauche.slice(0, -1), ...droite];
  }

  return [debut, fin];
}

/**
 * Distance perpendiculaire d'un point à un segment (en mètres).
 */
function distancePointSegment(p: Coordinate, a: Coordinate, b: Coordinate): number {
  const ab = calculerDistance(a, b);
  if (ab === 0) return calculerDistance(p, a);

  // Vecteurs simplifiés en degrés (approximation pour petites distances)
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.latitude - a.latitude) * (b.latitude - a.latitude) +
        (p.longitude - a.longitude) * (b.longitude - a.longitude)) /
        (Math.pow(b.latitude - a.latitude, 2) +
          Math.pow(b.longitude - a.longitude, 2)),
    ),
  );

  const proj: Coordinate = {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };

  return calculerDistance(p, proj);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITHME DE CONQUÊTE (Ray-Casting)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un point est à l'intérieur d'un polygone.
 * Algorithme ray-casting (Jordan curve theorem).
 */
export function pointDansPolygone(
  point: Coordinate,
  polygone: Coordinate[],
): boolean {
  const { latitude: py, longitude: px } = point;
  const n = polygone.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygone[i].longitude;
    const yi = polygone[i].latitude;
    const xj = polygone[j].longitude;
    const yj = polygone[j].latitude;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Vérifie si le polygone A englobe complètement le polygone B.
 * Condition : au moins 80% des points de B sont dans A.
 */
export function polygoneEnglobePolygone(
  exterieur: Coordinate[],
  interieur: Coordinate[],
): boolean {
  if (interieur.length === 0) return false;

  const ptsInterieur = interieur.filter((pt) =>
    pointDansPolygone(pt, exterieur),
  ).length;

  return ptsInterieur / interieur.length >= 0.8;
}

/**
 * Détermine quelles zones existantes sont conquises par le nouveau tracé.
 *
 * Une zone est conquise si le nouveau polygone l'englobe.
 * On exclut les zones déjà possédées par le coureur.
 */
export function detecterZonesConquises(
  nouveauPolygone: Coordinate[],
  zonesExistantes: Zone[],
  coureurUid: string,
): Zone[] {
  return zonesExistantes.filter((zone) => {
    // Ne conquiert pas ses propres zones
    if (zone.ownerId === coureurUid) return false;
    // Vérifie que la zone est englobée
    return polygoneEnglobePolygone(nouveauPolygone, zone.coordinates);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRÉATION D'UNE ZONE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un objet Zone à partir d'un tracé GPS et d'un profil utilisateur.
 * Simplifie d'abord le tracé, calcule l'aire, génère un ID.
 *
 * @returns null si la zone est trop petite ou invalide
 */
export function creerZone(
  points: GpsPoint[],
  joueur: UserProfile,
  zonesConquises: Zone[] = [],
): Zone | null {
  if (points.length < CIRCUIT_MIN_POINTS) return null;

  // Simplification du tracé pour réduire les données stockées
  const coordsBrutes: Coordinate[] = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const coordsSimplifiees = simplifierTrace(coordsBrutes, 5);

  // Fermeture du polygone (premier = dernier point)
  const polygone = [...coordsSimplifiees];
  if (
    polygone[0].latitude !== polygone[polygone.length - 1].latitude ||
    polygone[0].longitude !== polygone[polygone.length - 1].longitude
  ) {
    polygone.push(polygone[0]);
  }

  const aireM2 = calculerAirePolygone(polygone);

  if (aireM2 < ZONE_MIN_AREA_M2) {
    console.log(`Zone trop petite : ${Math.round(aireM2)} m² (minimum ${ZONE_MIN_AREA_M2} m²)`);
    return null;
  }

  const now = Date.now();

  const zone: Zone = {
    id:           genererIdZone(joueur.uid, now),
    ownerId:      joueur.uid,
    ownerName:    joueur.displayName,
    ownerColor:   joueur.color,
    coordinates:  polygone,
    aireM2:       Math.round(aireM2),
    createdAt:    now,
  };

  return zone;
}

/**
 * Point d'entrée principal : traite une course terminée.
 * Crée la zone, détecte les conquêtes, retourne le résultat.
 *
 * @returns null si le tracé est invalide
 */
export function traiterFinCourse(
  points: GpsPoint[],
  joueur: UserProfile,
  toutesLesZones: Zone[],
): ConqueteResult | null {
  // Créer la nouvelle zone
  const zonesConquises = detecterZonesConquises(
    points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    toutesLesZones,
    joueur.uid,
  );

  const nouvelleZone = creerZone(points, joueur, zonesConquises);
  if (!nouvelleZone) return null;

  return {
    zonesConquises,
    nouvelleZone,
  };
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

/**
 * Génère un ID unique pour une zone basé sur le uid et le timestamp.
 */
function genererIdZone(uid: string, timestamp: number): string {
  const hash = Math.random().toString(36).substring(2, 8);
  return `zone_${uid.substring(0, 6)}_${timestamp}_${hash}`;
}

/**
 * Formate une aire en m² de façon lisible.
 * < 10 000 m² → affiche en m²
 * ≥ 10 000 m² → affiche en ha
 */
export function formatAire(aireM2: number): string {
  if (aireM2 < 10000) {
    return `${Math.round(aireM2).toLocaleString()} m²`;
  }
  return `${(aireM2 / 10000).toFixed(2)} ha`;
}
