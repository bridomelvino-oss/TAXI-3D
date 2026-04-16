// ─────────────────────────────────────────────
// Écran principal — Carte + Course
//
// Fonctionnalités :
//  1. Carte OpenStreetMap (Leaflet via WebView — pas de clé API)
//  2. Tracking GPS temps réel avec tracé sur la carte
//  3. Overlay stats de course (distance, durée, vitesse)
//  4. Bouton démarrer/terminer la course
//  5. Affichage de toutes les zones en temps réel
//  6. Détection de conquête à la fin de la course
// ─────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  Modal,
  TouchableOpacity,
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
} from '../../services/location';
import {
  ecouterZones,
  getProfilUtilisateur,
  appliquerConquete,
} from '../../services/firebase';
import {
  creerZone,
  detecterZonesConquises,
  formatAire,
} from '../../services/zones';

import { Colors } from '../../constants/colors';
import { CIRCUIT_MIN_POINTS } from '../../constants/config';
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

  // État utilisateur
  const [profil, setProfil] = useState<UserProfile | null>(null);
  const [permisGPS, setPermisGPS] = useState<boolean | null>(null);

  // État zones et course
  const [zones, setZones] = useState<Zone[]>([]);
  const [course, setCourse] = useState<CourseState>(INITIAL_COURSE);
  const [loading, setLoading] = useState(false);

  // Modal résultat de course
  const [modalResultat, setModalResultat] = useState<{
    visible: boolean;
    nouvelleZone?: Zone;
    zonesConquises: Zone[];
  }>({ visible: false, zonesConquises: [] });

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
      Alert.alert(
        'GPS requis',
        'Active la localisation dans les paramètres pour utiliser RunZone.',
      );
      setLoading(false);
      return;
    }

    const now = Date.now();
    setCourse({ ...INITIAL_COURSE, isRunning: true, startedAt: now });

    timerRef.current = setInterval(() => {
      setCourse((prev) =>
        prev.isRunning
          ? { ...prev, dureeMs: Date.now() - prev.startedAt }
          : prev,
      );
    }, 1000);

    const success = await demarrerTracking(
      (point) => {
        setCourse((prev) => {
          if (!prev.isRunning) return prev;

          const dernierPoint = prev.points[prev.points.length - 1];
          const delta = dernierPoint
            ? calculerDistanceTotale([dernierPoint, point])
            : 0;

          const nouveauxPoints = [...prev.points, point];

          // Met à jour la position sur la carte Leaflet
          mapRef.current?.updateLocation(point.latitude, point.longitude);

          return {
            ...prev,
            points: nouveauxPoints,
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

    const { points } = course;
    setCourse((prev) => ({ ...prev, isRunning: false }));

    if (points.length < CIRCUIT_MIN_POINTS) {
      Alert.alert(
        'Course trop courte',
        `Minimum ${CIRCUIT_MIN_POINTS} points GPS pour créer une zone. Cours plus longtemps !`,
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

      const zonesConquises = detecterZonesConquises(
        coordsCourse,
        zones,
        profil.uid,
      );

      const nouvelleZone = creerZone(points, profil, zonesConquises);

      if (!nouvelleZone) {
        Alert.alert(
          'Zone invalide',
          'Le circuit tracé est trop petit. Essaie de tracer une surface plus grande.',
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

      setModalResultat({ visible: true, nouvelleZone, zonesConquises });
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder la course. Vérifie ta connexion.');
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
  }

  useEffect(() => {
    return () => {
      arreterCourseTimer();
      arreterTracking();
    };
  }, []);

  // ─── Bouton principal ───────────────────────────────────────────────────

  function handleBoutonCourse() {
    if (course.isRunning) {
      Alert.alert(
        'Terminer la course ?',
        'Cela va créer ta zone à partir de ton tracé.',
        [
          { text: 'Continuer à courir', style: 'cancel' },
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
          Active la localisation dans les paramètres de ton téléphone.
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
      {/* ─── Carte OpenStreetMap (Leaflet, sans clé API) ────────── */}
      <MapLeaflet
        ref={mapRef}
        zones={zones}
        traceCoords={traceCoords}
      />

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

      {/* ─── Bouton central (bas de carte) ─────────────────────── */}
      <View style={[styles.boutonContainer, { paddingBottom: insets.bottom + 90 }]}>
        <BoutonCourse
          isRunning={course.isRunning}
          isLoading={loading}
          onPress={handleBoutonCourse}
          disabled={permisGPS === null}
        />
      </View>

      {/* ─── Modal résultat de course ───────────────────────────── */}
      <Modal
        visible={modalResultat.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalResultat({ visible: false, zonesConquises: [] })}
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

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setModalResultat({ visible: false, zonesConquises: [] })}
            >
              <Text style={styles.modalBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centred: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  errText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
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
    marginVertical: 8,
  },
  modalConquetes: {
    marginTop: 16,
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
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
