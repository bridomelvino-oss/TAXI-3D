// ─────────────────────────────────────────────
// Layout Tabs — RunZone
//
// Navbar du bas avec 3 onglets :
//  - index (Carte) → écran principal de course
//  - classement     → top joueurs
//  - profil         → profil + stats
// ─────────────────────────────────────────────

import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

// ─── Icônes custom (emoji simple, pas de lib externe) ───────────────────────

function TabIcon({
  focused,
  emoji,
  label,
}: {
  focused: boolean;
  emoji: string;
  label: string;
}) {
  return (
    <View style={styles.tabIconWrapper}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
        {emoji}
      </Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.tabActive : Colors.tabInactive },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Carte',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🗺" label="Carte" />
          ),
        }}
      />
      <Tabs.Screen
        name="classement"
        options={{
          title: 'Classement',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🏆" label="Classement" />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Profil" />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.tabBarBorder,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 4,
    paddingBottom: 8,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
