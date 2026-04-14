// ─────────────────────────────────────────────
// Écran Profil — RunZone
//
// Affiche les stats du joueur connecté,
// son territoire total, nombre de zones,
// nombre de courses et bouton déconnexion.
// ─────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';

import { getProfilUtilisateur } from '../../services/firebase';
import { formatAire } from '../../services/zones';
import { Colors } from '../../constants/colors';
import { UserProfile } from '../../types';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const auth = getAuth();
  const [profil, setProfil] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const chargerProfil = useCallback(async (uid: string) => {
    const p = await getProfilUtilisateur(uid);
    setProfil(p);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        chargerProfil(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  function onRefresh() {
    const user = auth.currentUser;
    if (user) {
      setRefreshing(true);
      chargerProfil(user.uid);
    }
  }

  async function handleDeconnexion() {
    Alert.alert(
      'Se déconnecter ?',
      'Tu devras te reconnecter pour jouer.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!profil) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errText}>Profil introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Avatar + nom */}
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: profil.color }]}>
          <Text style={styles.avatarText}>
            {profil.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>{profil.displayName}</Text>
        <Text style={styles.email}>{profil.email}</Text>

        {/* Badge couleur */}
        <View style={[styles.colorBadge, { backgroundColor: profil.color + '22', borderColor: profil.color }]}>
          <View style={[styles.colorDot, { backgroundColor: profil.color }]} />
          <Text style={[styles.colorLabel, { color: profil.color }]}>
            Ta couleur de territoire
          </Text>
        </View>
      </View>

      {/* Statistiques */}
      <Text style={styles.sectionTitle}>Mes statistiques</Text>

      <View style={styles.statsGrid}>
        <StatCard
          valeur={formatAire(profil.totalAireM2)}
          label="Territoire total"
          couleur={Colors.secondary}
        />
        <StatCard
          valeur={String(profil.zonesCount)}
          label="Zones actives"
          couleur={Colors.primary}
        />
        <StatCard
          valeur={String(profil.coursesCount)}
          label="Courses totales"
          couleur={Colors.accent}
        />
      </View>

      {/* Conseils */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Comment jouer</Text>
        <Tip
          icone="▶"
          texte="Appuie sur DÉMARRER pour lancer ta course."
        />
        <Tip
          icone="🗺"
          texte="Trace un circuit fermé en courant pour créer une zone."
        />
        <Tip
          icone="⚔️"
          texte="Englobe la zone d'un adversaire pour la conquérir !"
        />
        <Tip
          icone="🔔"
          texte="Tu seras notifié quand une de tes zones est conquise."
        />
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.btnDeconnexion} onPress={handleDeconnexion}>
        <Text style={styles.btnDeconnexionText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function StatCard({
  valeur,
  label,
  couleur,
}: {
  valeur: string;
  label: string;
  couleur: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValeur, { color: couleur }]} numberOfLines={1} adjustsFontSizeToFit>
        {valeur}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Tip({ icone, texte }: { icone: string; texte: string }) {
  return (
    <View style={styles.tipRow}>
      <Text style={styles.tipIcone}>{icone}</Text>
      <Text style={styles.tipTexte}>{texte}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 20,
  },
  centred: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },

  // Profil
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  email: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  colorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Statistiques
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  statValeur: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },

  // Tips
  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    gap: 10,
  },
  tipsTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipIcone: {
    fontSize: 16,
    width: 20,
  },
  tipTexte: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },

  // Déconnexion
  btnDeconnexion: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDeconnexionText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
