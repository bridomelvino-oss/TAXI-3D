// ─────────────────────────────────────────────
// MapZone — Composant polygone de zone sur la carte
//
// Affiche une zone colorée (territoire d'un joueur)
// avec une bordure et une étiquette du propriétaire.
// Optimisé : mémoïsé pour éviter les re-renders.
// ─────────────────────────────────────────────

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polygon, Marker } from 'react-native-maps';
import { Zone } from '../types';
import { calculerCentroide, formatAire } from '../services/zones';
import { Colors } from '../constants/colors';

interface MapZoneProps {
  zone: Zone;
  /** Si true, affiche les détails au tap (nom du joueur + aire) */
  interactive?: boolean;
  /** Appelé quand le polygone est pressé */
  onPress?: (zone: Zone) => void;
  /** Met en surbrillance cette zone (ex: zone sélectionnée) */
  highlighted?: boolean;
}

const MapZone = memo(function MapZone({
  zone,
  interactive = true,
  onPress,
  highlighted = false,
}: MapZoneProps) {
  // Calcule le centre pour placer l'étiquette
  const centroid = calculerCentroide(zone.coordinates);

  // Couleur du joueur avec opacité
  const fillColor = hexToRgba(zone.ownerColor, highlighted ? 0.55 : Colors.zoneOpacity);
  const strokeColor = hexToRgba(zone.ownerColor, Colors.zoneStrokeOpacity);
  const strokeWidth = highlighted ? 3 : 2;

  return (
    <>
      {/* Polygone de la zone */}
      <Polygon
        coordinates={zone.coordinates}
        fillColor={fillColor}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        tappable={interactive}
        onPress={() => onPress?.(zone)}
      />

      {/* Étiquette centrale avec le nom du joueur */}
      {interactive && (
        <Marker
          coordinate={centroid}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false} // performance : désactive le re-track
        >
          <View style={[styles.label, { borderColor: zone.ownerColor }]}>
            <Text style={styles.labelName} numberOfLines={1}>
              {zone.ownerName}
            </Text>
            <Text style={[styles.labelAire, { color: zone.ownerColor }]}>
              {formatAire(zone.aireM2)}
            </Text>
          </View>
        </Marker>
      )}
    </>
  );
});

export default MapZone;

// ─── Utilitaire couleur ─────────────────────────────────────────────────────

/**
 * Convertit une couleur hex (#RRGGBB) + opacité en rgba().
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 60,
    maxWidth: 120,
  },
  labelName: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelAire: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
});
