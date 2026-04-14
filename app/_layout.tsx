// ─────────────────────────────────────────────
// Layout racine — RunZone
//
// Responsabilités :
//  - Initialise expo-splash-screen
//  - Charge les fonts (si besoin)
//  - Écoute l'état d'authentification Firebase
//  - Redirige vers (auth)/login ou (tabs) selon la session
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Garde le splash visible jusqu'à ce que l'auth soit déterminée
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // undefined = en chargement, null = déconnecté, User = connecté

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // On cache le splash dès que l'état auth est connu
      SplashScreen.hideAsync();
    });
    return () => unsubscribe();
  }, []);

  // Tant que l'état auth n'est pas connu, on ne rend rien
  // (le splash est encore visible)
  if (user === undefined) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor="#000" />
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          // Utilisateur connecté → app principale
          <Stack.Screen name="(tabs)" />
        ) : (
          // Pas connecté → écrans d'auth
          <Stack.Screen name="(auth)" />
        )}
        {/* Page 404 */}
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
