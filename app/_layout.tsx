// ─────────────────────────────────────────────
// Layout racine — RunZone
//
// Responsabilités :
//  - Initialise expo-splash-screen
//  - Écoute l'état d'authentification Firebase
//  - Redirige vers (auth)/login ou (tabs) selon la session
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Garde le splash visible jusqu'à ce que l'auth soit déterminée
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  // ─── Écoute Firebase Auth ──────────────────────────────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      SplashScreen.hideAsync();
    });
    return () => unsubscribe();
  }, []);

  // ─── Redirection selon état auth ───────────────────────────────────────
  useEffect(() => {
    if (user === undefined) return; // encore en chargement

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Pas connecté → login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Connecté mais sur l'auth → app principale
      router.replace('/(tabs)');
    }
  }, [user, segments]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor="#000" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
