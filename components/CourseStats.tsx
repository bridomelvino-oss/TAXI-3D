// ─────────────────────────────────────────────
// CourseStats — Barre de statistiques de course
//
// Affichée en overlay sur la carte pendant la course.
// Montre : distance, durée, allure et vitesse.
// ─────────────────────────────────────────────

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { formatDuree, msToKmh } from '../services/location';

interface CourseStatsProps {
  distanceM: number;   // distance totale en mètres
  dureeMs: number;     // durée en millisecondes
  vitesseMps?: number; // vitesse instantanée en m/s
  pointsCount: number; // nombre de points GPS enregistrés
}

const CourseStats = memo(function CourseStats({
  distanceM,
  dureeMs,
  vitesseMps,
  pointsCount,
}: CourseStatsProps) {
  const dureeSecondes = Math.floor(dureeMs / 1000);
  const vitesseKmh = msToKmh(vitesseMps);

  // Allure (min/km) — calculée depuis la vitesse ou la distance/durée
  const allureSecParKm =
    distanceM > 0 && dureeSecondes > 0
      ? (dureeSecondes / distanceM) * 1000
      : 0;

  const allureFormatee = allureSecParKm > 0
    ? `${Math.floor(allureSecParKm / 60)}'${String(Math.floor(allureSecParKm % 60)).padStart(2, '0')}"  /km`
    : '--:--  /km';

  const distanceFormatee =
    distanceM < 1000
      ? `${Math.round(distanceM)} m`
      : `${(distanceM / 1000).toFixed(2)} km`;

  return (
    <View style={styles.container}>
      {/* Ligne 1 : Distance + Durée */}
      <View style={styles.row}>
        <StatBlock
          valeur={distanceFormatee}
          label="Distance"
          couleur={Colors.accent}
        />
        <View style={styles.separateur} />
        <StatBlock
          valeur={formatDuree(dureeSecondes)}
          label="Durée"
          couleur={Colors.textPrimary}
        />
      </View>

      {/* Ligne 2 : Vitesse + Allure */}
      <View style={[styles.row, styles.rowBottom]}>
        <StatBlock
          valeur={`${vitesseKmh.toFixed(1)} km/h`}
          label="Vitesse"
          couleur={vitesseKmh > 8 ? Colors.secondary : Colors.textSecondary}
          small
        />
        <View style={styles.separateur} />
        <StatBlock
          valeur={allureFormatee}
          label="Allure"
          couleur={Colors.textSecondary}
          small
        />
        <View style={styles.separateur} />
        <StatBlock
          valeur={String(pointsCount)}
          label="Points GPS"
          couleur={Colors.textMuted}
          small
        />
      </View>
    </View>
  );
});

export default CourseStats;

// ─── Sous-composant StatBlock ────────────────────────────────────────────────

interface StatBlockProps {
  valeur: string;
  label: string;
  couleur: string;
  small?: boolean;
}

function StatBlock({ valeur, label, couleur, small = false }: StatBlockProps) {
  return (
    <View style={styles.statBlock}>
      <Text
        style={[
          styles.valeur,
          { color: couleur, fontSize: small ? 14 : 20 },
        ]}
        numberOfLines={1}
      >
        {valeur}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(13, 13, 13, 0.92)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rowBottom: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  valeur: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  separateur: {
    width: 1,
    height: 28,
    backgroundColor: Colors.tabBarBorder,
  },
});
