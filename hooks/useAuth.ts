// ─────────────────────────────────────────────
// Hook useAuth — RunZone
//
// Expose l'état d'authentification Firebase
// et le profil utilisateur Firestore.
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getProfilUtilisateur } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profil: UserProfile | null;
  loading: boolean;
}

/**
 * Hook d'accès à l'authentification.
 *
 * @example
 * const { user, profil, loading } = useAuth();
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profil: null,
    loading: true,
  });

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Charge le profil Firestore en parallèle
        const profil = await getProfilUtilisateur(user.uid);
        setState({ user, profil, loading: false });
      } else {
        setState({ user: null, profil: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}
