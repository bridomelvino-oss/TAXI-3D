// ─────────────────────────────────────────────
// Écran d'inscription — RunZone
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, creerProfilUtilisateur } from '../../services/firebase';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    // Validations basiques
    if (!nom.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Champs manquants', 'Remplis tous les champs.');
      return;
    }
    if (nom.trim().length < 2) {
      Alert.alert('Nom trop court', 'Ton pseudo doit faire au moins 2 caractères.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // 1. Crée le compte Firebase Auth
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      // 2. Ajoute le nom d'affichage dans Firebase Auth
      await updateProfile(credential.user, {
        displayName: nom.trim(),
      });

      // 3. Crée le profil dans Firestore
      await creerProfilUtilisateur(
        credential.user.uid,
        email.trim(),
        nom.trim(),
      );

      // 4. Redirection vers l'app
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = firebaseErrMessage(err.code);
      Alert.alert('Inscription impossible', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoins la course pour le territoire</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Pseudo</Text>
          <TextInput
            style={styles.input}
            placeholder="TonPseudo"
            placeholderTextColor={Colors.textMuted}
            value={nom}
            onChangeText={setNom}
            autoCapitalize="words"
            maxLength={20}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 caractères"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.btnSecondaryText}>
              Déjà un compte ?{' '}
              <Text style={{ color: Colors.primary }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Message d'erreur Firebase lisible ──────────────────────────────────────

function firebaseErrMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cet email est déjà utilisé.';
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/weak-password':
      return 'Mot de passe trop faible (6 caractères minimum).';
    case 'auth/network-request-failed':
      return 'Pas de connexion réseau.';
    default:
      return 'Une erreur s\'est produite. Réessaie.';
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    gap: 8,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnSecondary: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  btnSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
