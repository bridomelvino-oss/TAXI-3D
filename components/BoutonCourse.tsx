// ─────────────────────────────────────────────
// BoutonCourse — Bouton central de démarrage/arrêt
//
// Affiche un bouton animé pour :
//  - Démarrer la course (vert + icône play)
//  - Terminer la course (rouge + icône stop)
//  - État chargement (spinner)
// ─────────────────────────────────────────────

import React, { useEffect, useRef, memo } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';

interface BoutonCourseProps {
  isRunning: boolean;
  isLoading?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const BoutonCourse = memo(function BoutonCourse({
  isRunning,
  isLoading = false,
  onPress,
  disabled = false,
}: BoutonCourseProps) {
  // Animation de pulsation quand la course est active
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRunning) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }

    return () => pulseLoop.current?.stop();
  }, [isRunning]);

  const bgColor = isRunning ? Colors.primary : Colors.secondary;
  const label = isRunning ? 'TERMINER' : 'DÉMARRER';
  const icon = isRunning ? '⏹' : '▶';

  return (
    <View style={styles.wrapper}>
      {/* Halo de pulsation (visible uniquement en course) */}
      {isRunning && (
        <Animated.View
          style={[
            styles.halo,
            { transform: [{ scale: pulseAnim }], backgroundColor: bgColor },
          ]}
          pointerEvents="none"
        />
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.bouton,
            { backgroundColor: bgColor },
            disabled && styles.boutonDisabled,
          ]}
          onPress={onPress}
          disabled={disabled || isLoading}
          activeOpacity={0.8}
          accessibilityLabel={label}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.icone}>{icon}</Text>
              <Text style={styles.label}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

export default BoutonCourse;

// ─── Styles ──────────────────────────────────────────────────────────────────

const BOUTON_SIZE = 80;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BOUTON_SIZE + 40,
    height: BOUTON_SIZE + 40,
  },
  halo: {
    position: 'absolute',
    width: BOUTON_SIZE + 20,
    height: BOUTON_SIZE + 20,
    borderRadius: (BOUTON_SIZE + 20) / 2,
    opacity: 0.25,
  },
  bouton: {
    width: BOUTON_SIZE,
    height: BOUTON_SIZE,
    borderRadius: BOUTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  boutonDisabled: {
    opacity: 0.5,
  },
  icone: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 2,
  },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
