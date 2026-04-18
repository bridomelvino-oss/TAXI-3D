// ─────────────────────────────────────────────
// Écran principal — Carte + Course
//
// Fonctionnalités :
//  1. Carte OpenStreetMap Dark (Leaflet via WebView)
//  2. Tracking GPS temps réel avec tracé + cercle de précision
//  3. Overlay stats de course (distance, durée, vitesse)
//  4. Bouton démarrer/terminer + bouton recentrer GPS
//  5. Affichage de toutes les zones en temps réel
//  6. Détection de conquête + partage du résultat
// ─────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  Modal,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import MapLeaflet, { MapLeafletRef } from '../../components/MapLeaflet';
import CourseStats from '../../components/CourseStats';
import BoutonCourse from '../../components/BoutonCourse';

import {
  demanderPermissionsGPS,
  demarrerTracking,
  arreterTracking,
  getPositionActuelle,
  calculerDistanceTotale,
  estCircuitFerme,
} from '../../services/location';
import {
  ecouterZones,
  getProfilUtilisateur,
  appliquerConquete,
  sauvegarderHistoriqueCourse,
} from '../../services/firebase';
import {
  creerZone,
  detecterZonesConquises,
  formatAire,
} from '../../services/zones';

import { Colors } from '../../constants/colors';
import { CIRCUIT_MIN_POINTS, CIRCUIT_CLOSE_DISTANCE_M } from '../../constants/config';
import { Coordinate, GpsPoint, Zone, UserProfile } from '../../types';

// ─── Types locaux ────────────────────────────────────────────────────────────

interface CourseState {
  isRunning: boolean;
  points: GpsPoint[];
  startedAt: number;
  dureeMs: number;
  distanceM: number;
  vitesseMps: number;
}

const INITIAL_COURSE: CourseState = {
  isRunning: false,
  points: [],
  startedAt: 0,
  dureeMs: 0,
  distanceM: 0,
  vitesseMps: 0,
};

// ─── Composant principal ─────────────────────────────────────────────────────

export default function CarteScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapLeafletRef>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const circuitFermeRef = useRef(false);
  const startShownRef = useRef(false);
  const terminerCourseRef = useRef<() => Promise<void>>();

  const [profil, setProfil] = useState<UserProfile | null>(null);
  const [permisGPS, setPermisGPS] = useState<boolean | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [course, setCourse] = useState<CourseState>(INITIAL_COURSE);
  const [loading, setLoading] = useState(false);

  const [modalResultat, setModalResultat] = useState<{
    visible: boolean;
    nouvelleZone?: Zone;
    zonesConquises: Zone[];
    distanceM: number;
  }>({ visible: false, zonesConquises: [], distanceM: 0 });

  // ─── Initialisation ─────────────────────────────────────────────────────

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const p = await getProfilUtilisateur(user.uid);
        setProfil(p);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = ecouterZones(setZones);
    return () => unsub();
  }, []);

  useEffect(() => {
    demanderPermissionsGPS().then((ok) => {
      setPermisGPS(ok);
      if (ok) centrerSurPosition();
    });
  }, []);

  // ─── Centrage carte ─────────────────────────────────────────────────────

  async function centrerSurPosition() {
    const pos = await getPositionActuelle();
    if (!pos) return;
    const { latitude, longitude } = pos.coords;
    mapRef.current?.centerOn(latitude, longitude);
  }

  // ─── Démarrer la course ─────────────────────────────────────────────────

  async function demarrerCourse() {
    if (!profil) {
      Alert.alert('Profil manquant', 'Reconnecte-toi.');
      return;
    }
    setLoading(true);

    const ok = await demanderPermissionsGPS();
    if (!ok) {
      Alert.alert('GPS requis', 'Active la localisation dans les paramètres.');
      setLoading(false);
      return;
    }

    const now = Date.now();
    circuitFermeRef.current = false;
    startShownRef.current = false;
    setCourse({ ...INITIAL_COURSE, isRunning: true, startedAt: now });

    timerRef.current = setInterval(() => {
      setCourse((prev) =>
        prev.isRunning ? { ...prev, dureeMs: Date.now() - prev.startedAt } : prev,
      );
    }, 1000);

    const success = await demarrerTracking(
      (point) => {
        if (!startShownRef.current) {
          startShownRef.current = true;
          mapRef.current?.showStart(point.latitude, point.longitude);
        }
        mapRef.current?.updateLocation(point.latitude, point.longitude, point.accuracy);
        setCourse((prev) => {
          if (!prev.isRunning) return prev;
          const dernierPoint = prev.points[prev.points.length - 1];
          const delta = dernierPoint ? calculerDistanceTotale([dernierPoint, point]) : 0;
          return {
            ...prev,
            points: [...prev.points, point],
            distanceM: prev.distanceM + delta,
            vitesseMps: point.speed ?? 0,
          };
        });
      },
      (errMsg) => {
        Alert.alert('Erreur GPS', errMsg);
        arreterCourseTimer();
        setCourse(INITIAL_COURSE);
      },
    );

    if (!success) {
      arreterCourseTimer();
      setCourse(INITIAL_COURSE);
    }
    setLoading(false);
  }

  // ─── Terminer la course ─────────────────────────────────────────────────

  async function terminerCourse() {
    arreterCourseTimer();
    arreterTracking();

    const { points, distanceM } = course;
    setCourse((prev) => ({ ...prev, isRunning: false }));

    if (points.length < CIRCUIT_MIN_POINTS) {
      Alert.alert(
        'Course trop courte',
        `Minimum ${CIRCUIT_MIN_POINTS} points GPS pour créer une zone. Cours encore un peu !`,
      );
      setCourse(INITIAL_COURSE);
      return;
    }

    if (!profil) return;
    setLoading(true);

    try {
      const coordsCourse: Coordinate[] = points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      const zonesConquises = detecterZonesConquises(coordsCourse, zones, profil.uid);
      const nouvelleZone = creerZone(points, profil, zonesConquises);

      if (!nouvelleZone) {
        Alert.alert(
          'Zone invalide',
          'Le circuit est trop petit. Trace une surface plus grande.',
        );
        setCourse(INITIAL_COURSE);
        setLoading(false);
        return;
      }

      const anciensProprio = zonesConquises.map((z) => ({
        uid: z.ownerId,
        aireM2: z.aireM2,
      }));

      await appliquerConquete(
        nouvelleZone,
        zonesConquises.map((z) => z.id),
        profil.uid,
        anciensProprio,
      );

      // Sauvegarde l'historique (non-bloquant, erreur ignorée)
      sauvegarderHistoriqueCourse(profil.uid, {
        date: Date.now(),
        distanceM: Math.round(distanceM),
        aireM2: nouvelleZone.aireM2,
        zonesConquises: zonesConquises.length,
      }).catch(() => {});

      setModalResultat({
        visible: true,
        nouvelleZone,
        zonesConquises,
        distanceM,
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder. Vérifie ta connexion.');
    } finally {
      setCourse(INITIAL_COURSE);
      setLoading(false);
    }
  }

  function arreterCourseTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mapRef.current?.clearStart();
  }

  // Keep ref pointing to latest terminerCourse (avoids stale closure in Alert)
  terminerCourseRef.current = terminerCourse;

  // Auto circuit-close detection
  useEffect(() => {
    if (!course.isRunning || course.points.length < CIRCUIT_MIN_POINTS + 2) return;
    if (circuitFermeRef.current) return;
    const coords = course.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    if (!estCircuitFerme(coords, CIRCUIT_CLOSE_DISTANCE_M)) return;
    circuitFermeRef.current = true;
    Alert.alert(
      'Circuit bouclé !',
      'Tu es revenu à ton point de départ. Créer la zone maintenant ?',
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Créer la zone', onPress: () => terminerCourseRef.current?.() },
      ],
    );
  }, [course.points.length]);

  useEffect(() => {
    return () => {
      arreterCourseTimer();
      arreterTracking();
    };
  }, []);

  // ─── Partager le résultat ───────────────────────────────────────────────

  async function partagerResultat() {
    if (!modalResultat.nouvelleZone) return;
    const zone = modalResultat.nouvelleZone;
    const dist = modalResultat.distanceM >= 1000
      ? `${(modalResultat.distanceM / 1000).toFixed(2)} km`
      : `${Math.round(modalResultat.distanceM)} m`;
    const conq = modalResultat.zonesConquises.length > 0
      ? ` et conquis ${modalResultat.zonesConquises.length} zone(s) adverse(s)` : '';
    await Share.share({
      message: `🏃 RunZone — J'ai tracé ${dist} et créé une zone de ${formatAire(zone.aireM2)}${conq} à Diego-Suarez ! Tu joues ?`,
    });
  }

  // ─── Tap sur une zone ───────────────────────────────────────────────────

  function handleZonePress(zoneId: string) {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const date = new Date(zone.createdAt);
    const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const isMine = zone.ownerId === profil?.uid;
    Alert.alert(
      isMine ? '⭐ Ta zone' : `Zone de ${zone.ownerName}`,
      `Surface : ${formatAire(zone.aireM2)}\nCréée le : ${dateStr}`,
    );
  }

  // ─── Bouton principal ───────────────────────────────────────────────────

  function handleBoutonCourse() {
    if (course.isRunning) {
      Alert.alert(
        'Terminer la course ?',
        'Cela va créer ta zone à partir de ton tracé.',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Terminer', style: 'destructive', onPress: terminerCourse },
        ],
      );
    } else {
      demarrerCourse();
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────

  if (permisGPS === false) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errTitle}>GPS désactivé</Text>
        <Text style={styles.errText}>
          RunZone a besoin du GPS pour tracer tes courses.{'\n'}
          Active la localisation dans les paramètres.
        </Text>
      </View>
    );
  }

  const traceCoords: Coordinate[] = course.points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <View style={styles.root}>
      {/* ─── Carte OpenStreetMap Dark ───────────────────────────── */}
      <MapLeaflet ref={mapRef} zones={zones} traceCoords={traceCoords} onZonePress={handleZonePress} />

      {/* ─── Stats de course (overlay haut) ────────────────────── */}
      {course.isRunning && (
        <View style={[styles.statsContainer, { top: insets.top + 12 }]}>
          <CourseStats
            distanceM={course.distanceM}
            dureeMs={course.dureeMs}
            vitesseMps={course.vitesseMps}
            pointsCount={course.points.length}
          />
        </View>
      )}

      {/* ─── Bouton recentrer GPS (bas droite) ─────────────────── */}
      <TouchableOpacity
        style={[styles.btnRecentrer, { bottom: insets.bottom + 170 }]}
        onPress={centrerSurPosition}
        activeOpacity={0.8}
      >
        <Text style={styles.btnRecentrerIcon}>◎</Text>
      </TouchableOpacity>

      {/* ─── Bouton démarrer/terminer ───────────────────────────── */}
      <View style={[styles.boutonContainer, { paddingBottom: insets.bottom + 90 }]}>
        <BoutonCourse
          isRunning={course.isRunning}
          isLoading={loading}
          onPress={handleBoutonCourse}
          disabled={permisGPS === null}
        />
      </View>

      {/* ─── Modal résultat ────────────────────────────────────── */}
      <Modal
        visible={modalResultat.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalResultat({ visible: false, zonesConquises: [], distanceM: 0 })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalResultat.zonesConquises.length > 0 ? '⚔️ Conquête !' : '✅ Zone créée !'}
            </Text>

            {modalResultat.nouvelleZone && (
              <>
                <Text style={styles.modalSubtitle}>Ta nouvelle zone</Text>
                <Text style={styles.modalAire}>
                  {formatAire(modalResultat.nouvelleZone.aireM2)}
                </Text>
                {modalResultat.distanceM > 0 && (
                  <Text style={styles.modalDist}>
                    {modalResultat.distanceM >= 1000
                      ? `${(modalResultat.distanceM / 1000).toFixed(2)} km parcourus`
                      : `${Math.round(modalResultat.distanceM)} m parcourus`}
                  </Text>
                )}
              </>
            )}

            {modalResultat.zonesConquises.length > 0 && (
              <View style={styles.modalConquetes}>
                <Text style={styles.modalConquetesTitle}>
                  {modalResultat.zonesConquises.length} zone(s) conquise(s) :
                </Text>
                {modalResultat.zonesConquises.map((z) => (
                  <Text key={z.id} style={styles.modalConqueteItem}>
                    • {z.ownerName} ({formatAire(z.aireM2)})
                  </Text>
                ))}
              </View>
            )}

            {/* Boutons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnShare}
                onPress={partagerResultat}
              >
                <Text style={styles.modalBtnShareText}>Partager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnClose}
                onPress={() => setModalResultat({ visible: false, zonesConquises: [], distanceM: 0 })}
              >
                <Text style={styles.modalBtnCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centred: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  errText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  statsContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  btnRecentrer: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  btnRecentrerIcon: { fontSize: 20, color: Colors.primary },
  boutonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalAire: {
    color: Colors.secondary,
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4,
  },
  modalDist: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalConquetes: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
  },
  modalConquetesTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalConqueteItem: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtnShare: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  modalBtnShareText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  modalBtnClose: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnCloseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
