// ─────────────────────────────────────────────
// Configuration Firebase pour RunZone
//
// IMPORTANT : Remplace les valeurs YOUR_* par tes
// vraies clés Firebase (console.firebase.google.com)
// ─────────────────────────────────────────────

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Zone, UserProfile, ClassementEntry, CourseHistoryEntry } from '../types';
import { FIRESTORE_COLLECTIONS } from '../constants/config';

// ─── Config Firebase ────────────────────────────────────────────────────────
// Remplace ces valeurs par celles de ton projet Firebase
const firebaseConfig = {
  apiKey:            'AIzaSyDj6JJlZe_rgTsen1e4dVr98b0KanNAB-4',
  authDomain:        'runzone-13452.firebaseapp.com',
  projectId:         'runzone-13452',
  storageBucket:     'runzone-13452.firebasestorage.app',
  messagingSenderId: '426532664130',
  appId:             '1:426532664130:web:c6f10d0224f34f2be60edb',
};

// ─── Initialisation (singleton : évite double init en dev HMR) ──────────────
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Persistance via AsyncStorage pour React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE UTILISATEURS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée le profil utilisateur dans Firestore après inscription.
 * Attribue automatiquement une couleur parmi la palette disponible.
 */
export async function creerProfilUtilisateur(
  uid: string,
  email: string,
  displayName: string,
): Promise<void> {
  const { Colors } = await import('../constants/colors');
  // Couleur déterminée par hachage simple du uid pour être stable
  const colorIndex = uid.charCodeAt(0) % Colors.playerColors.length;

  const profil: UserProfile = {
    uid,
    email,
    displayName,
    color: Colors.playerColors[colorIndex],
    totalAireM2: 0,
    zonesCount: 0,
    coursesCount: 0,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.users, uid), profil);
}

/**
 * Récupère le profil d'un utilisateur depuis Firestore.
 * Retourne null si introuvable.
 */
export async function getProfilUtilisateur(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/**
 * Sauvegarde une entrée d'historique de course dans le profil utilisateur.
 * Conserve les 5 dernières courses. Non-critique : l'erreur est silencieuse.
 */
export async function sauvegarderHistoriqueCourse(
  uid: string,
  entree: CourseHistoryEntry,
): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.users, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as UserProfile;
  const historique = data.derniersCourses ?? [];
  // Ajoute en tête, limite à 5
  const nouveau = [entree, ...historique].slice(0, 5);

  await updateDoc(ref, { derniersCourses: nouveau });
}

/**
 * Met à jour les statistiques d'un joueur après une course.
 */
export async function majStatsUtilisateur(
  uid: string,
  deltaAireM2: number, // peut être négatif si zones perdues
  deltaZones: number,
): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.users, uid);
  await updateDoc(ref, {
    totalAireM2: increment(deltaAireM2),
    zonesCount:  increment(deltaZones),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE ZONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sauvegarde une nouvelle zone dans Firestore.
 */
export async function sauvegarderZone(zone: Zone): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.zones, zone.id), zone);
}

/**
 * Supprime une zone (après conquête par un autre joueur).
 */
export async function supprimerZone(zoneId: string): Promise<void> {
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.zones, zoneId));
}

/**
 * Récupère TOUTES les zones actives (pour affichage carte).
 * Utilise un listener temps-réel pour mise à jour automatique.
 *
 * @param callback — appelé à chaque changement
 * @returns fonction pour se désabonner
 */
export function ecouterZones(callback: (zones: Zone[]) => void): () => void {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.zones),
    orderBy('createdAt', 'desc'),
    limit(500), // limiter pour éviter surcharge mémoire
  );

  return onSnapshot(q, (snapshot) => {
    const zones: Zone[] = [];
    snapshot.forEach((d) => zones.push(d.data() as Zone));
    callback(zones);
  }, (err) => {
    console.error('[RunZone] ecouterZones error:', err.message);
    callback([]); // zones reste vide, l'app ne plante pas
  });
}

/**
 * Transaction atomique : enregistre la nouvelle zone ET supprime
 * les zones conquises en une seule opération Firestore.
 */
export async function appliquerConquete(
  nouvelleZone: Zone,
  zonesConquisesIds: string[],
  conquérantUid: string,
  anciensPropriétaires: { uid: string; aireM2: number }[],
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Ajoute la nouvelle zone
  batch.set(doc(db, FIRESTORE_COLLECTIONS.zones, nouvelleZone.id), nouvelleZone);

  // 2. Supprime les zones conquises
  for (const id of zonesConquisesIds) {
    batch.delete(doc(db, FIRESTORE_COLLECTIONS.zones, id));
  }

  // 3. Met à jour les stats du conquérant
  batch.update(doc(db, FIRESTORE_COLLECTIONS.users, conquérantUid), {
    coursesCount: increment(1),
  });

  await batch.commit();

  // 4. Ajuste les aires séparément (nécessite read + write)
  for (const ancien of anciensPropriétaires) {
    await majStatsUtilisateur(ancien.uid, -ancien.aireM2, -1);
  }
  await majStatsUtilisateur(
    conquérantUid,
    nouvelleZone.aireM2,
    zonesConquisesIds.length > 0 ? zonesConquisesIds.length : 1,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CLASSEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Écoute le classement en temps réel (top 50 joueurs par territoire).
 */
export function ecouterClassement(
  callback: (entries: ClassementEntry[]) => void,
): () => void {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.users),
    orderBy('totalAireM2', 'desc'),
    limit(50),
  );

  return onSnapshot(q, (snapshot) => {
    const entries: ClassementEntry[] = [];
    let rank = 1;
    snapshot.forEach((d) => {
      const data = d.data() as UserProfile;
      entries.push({
        uid:          data.uid,
        displayName:  data.displayName,
        color:        data.color,
        totalAireM2:  data.totalAireM2,
        zonesCount:   data.zonesCount,
        rank,
      });
      rank++;
    });
    callback(entries);
  }, (err) => {
    console.error('[RunZone] ecouterClassement error:', err.message);
    callback([]);
  });
}

/**
 * Écoute en temps réel les zones appartenant à un joueur spécifique.
 */
export function ecouterZonesUtilisateur(
  uid: string,
  callback: (zones: Zone[]) => void,
): () => void {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.zones),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20),
  );

  return onSnapshot(q, (snapshot) => {
    const zones: Zone[] = [];
    snapshot.forEach((d) => zones.push(d.data() as Zone));
    callback(zones);
  }, (err) => {
    console.error('[RunZone] ecouterZonesUtilisateur error:', err.message);
    callback([]);
  });
}
