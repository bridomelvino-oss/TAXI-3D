// ─────────────────────────────────────────────
// Service GPS — RunZone
//
// Gère les permissions, le démarrage/arrêt du
// tracking et le calcul de distance Haversine.
// ─────────────────────────────────────────────

import * as Location from 'expo-location';
import { GpsPoint, Coordinate } from '../types';
import {
  GPS_UPDATE_INTERVAL_MS,
  GPS_MIN_DISTANCE_M,
  GPS_MIN_ACCURACY_M,
} from '../constants/config';

// ─── Permissions ────────────────────────────────────────────────────────────

/**
 * Demande les permissions de localisation.
 * Retourne true si accordées, false sinon.
 */
export async function demanderPermissionsGPS(): Promise<boolean> {
  try {
    // Permission "en utilisation" (foreground)
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    // Permission arrière-plan (Android uniquement, pour course en fond)
    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    // On accepte même sans background — la course fonctionnera en foreground
    return true;
  } catch {
    return false;
  }
}

/**
 * Vérifie si les permissions GPS sont déjà accordées sans les redemander.
 */
export async function verifierPermissionsGPS(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Position courante ──────────────────────────────────────────────────────

/**
 * Obtient la position GPS actuelle (une seule fois).
 * Timeout de 10 secondes.
 */
export async function getPositionActuelle(): Promise<Location.LocationObject | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
    });
    return pos;
  } catch {
    return null;
  }
}

// ─── Tracking continu ───────────────────────────────────────────────────────

let locationSubscription: Location.LocationSubscription | null = null;

/**
 * Démarre le suivi GPS continu.
 * Filtre les points avec mauvaise précision ou trop proches du précédent.
 *
 * @param onNouveauPoint — callback à chaque point GPS validé
 * @param onErreur       — callback en cas d'erreur
 */
export async function demarrerTracking(
  onNouveauPoint: (point: GpsPoint) => void,
  onErreur?: (msg: string) => void,
): Promise<boolean> {
  // Vérifie qu'un tracking n'est pas déjà actif
  if (locationSubscription) {
    arreterTracking();
  }

  const permis = await verifierPermissionsGPS();
  if (!permis) {
    onErreur?.('Permissions GPS non accordées');
    return false;
  }

  let dernierPoint: GpsPoint | null = null;

  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: GPS_UPDATE_INTERVAL_MS,
        distanceInterval: GPS_MIN_DISTANCE_M,
      },
      (location) => {
        const { latitude, longitude, accuracy, speed } = location.coords;

        // Filtre : on rejette les points avec précision insuffisante
        if (accuracy !== null && accuracy > GPS_MIN_ACCURACY_M) return;

        const point: GpsPoint = {
          latitude,
          longitude,
          timestamp: location.timestamp,
          accuracy: accuracy ?? undefined,
          speed: speed ?? undefined,
        };

        // Filtre doublon : distance depuis le dernier point
        if (dernierPoint) {
          const dist = calculerDistance(dernierPoint, point);
          if (dist < GPS_MIN_DISTANCE_M) return;
        }

        dernierPoint = point;
        onNouveauPoint(point);
      },
    );
    return true;
  } catch (err) {
    onErreur?.('Impossible de démarrer le GPS');
    return false;
  }
}

/**
 * Arrête le suivi GPS continu.
 */
export function arreterTracking(): void {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

// ─── Calculs géographiques ──────────────────────────────────────────────────

const EARTH_RADIUS_M = 6371000; // rayon Terre en mètres

/**
 * Formule de Haversine : distance en mètres entre deux coordonnées GPS.
 */
export function calculerDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const chord =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinLon * sinLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(chord));
}

/**
 * Distance totale d'un tracé (somme des segments).
 */
export function calculerDistanceTotale(points: Coordinate[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculerDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Vitesse instantanée en km/h depuis le champ speed (m/s).
 */
export function msToKmh(speedMs: number | undefined): number {
  if (!speedMs || speedMs < 0) return 0;
  return speedMs * 3.6;
}

/**
 * Formate une durée en secondes → "mm:ss" ou "hh:mm:ss".
 */
export function formatDuree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.floor(secondes % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Vérifie si le point actuel est suffisamment proche du point de départ
 * pour considérer le circuit comme fermé.
 */
export function estCircuitFerme(
  points: Coordinate[],
  distanceFermetureM: number,
): boolean {
  if (points.length < 3) return false;
  const debut = points[0];
  const actuel = points[points.length - 1];
  return calculerDistance(debut, actuel) <= distanceFermetureM;
}

// ─── Utilitaires internes ───────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
