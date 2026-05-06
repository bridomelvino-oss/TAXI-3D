// ─────────────────────────────────────────────
// Écran Classement — RunZone
//
// Affiche le top 50 des joueurs en temps réel,
// triés par territoire total (m²).
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';

import { ecouterClassement } from '../../services/firebase';
import { formatAire } from '../../services/zones';
import { Colors } from '../../constants/colors';
import { ClassementEntry } from '../../types';

// Médailles pour le podium
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<ClassementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUid = getAuth().currentUser?.uid;

  useEffect(() => {
    const unsub = ecouterClassement((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centred}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>Aucun joueur encore</Text>
        <Text style={styles.emptyText}>Cours pour conquérir le premier territoire !</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classement</Text>
        <Text style={styles.headerSub}>Territoire conquis (temps réel)</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ClassementRow
            entry={item}
            isCurrentUser={item.uid === currentUid}
          />
        )}
      />
    </View>
  );
}

// ─── Ligne de classement ─────────────────────────────────────────────────────

interface ClassementRowProps {
  entry: ClassementEntry;
  isCurrentUser: boolean;
}

function ClassementRow({ entry, isCurrentUser }: ClassementRowProps) {
  const medal = MEDALS[entry.rank];

  return (
    <View style={[styles.row, isCurrentUser && styles.rowHighlighted]}>
      {/* Rang */}
      <View style={styles.rankContainer}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={styles.rank}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar coloré */}
      <View style={[styles.avatar, { backgroundColor: entry.color }]}>
        <Text style={styles.avatarText}>
          {entry.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Infos joueur */}
      <View style={styles.playerInfo}>
        <Text style={styles.playerName} numberOfLines={1}>
          {entry.displayName}
          {isCurrentUser && (
            <Text style={styles.youLabel}> (toi)</Text>
          )}
        </Text>
        <Text style={styles.playerZones}>
          {entry.zonesCount} zone{entry.zonesCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Territoire */}
      <View style={styles.aireContainer}>
        <Text style={[styles.aire, { color: entry.color }]}>
          {formatAire(entry.totalAireM2)}
        </Text>
      </View>
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
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.tabBarBorder,
    marginLeft: 72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowHighlighted: {
    backgroundColor: 'rgba(255, 65, 54, 0.08)',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rank: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  medal: {
    fontSize: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  youLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  playerZones: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  aireContainer: {
    alignItems: 'flex-end',
  },
  aire: {
    fontSize: 14,
    fontWeight: '800',
  },
});
