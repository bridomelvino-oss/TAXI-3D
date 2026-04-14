// ─────────────────────────────────────────────
// Service Notifications Push — RunZone
//
// Gère l'enregistrement du token Expo Push,
// la demande de permission, et l'envoi de
// notifications locales (conquête de zone).
// ─────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FIRESTORE_COLLECTIONS, NOTIF_CHANNEL_ID } from '../constants/config';
import { Zone } from '../types';

// Configuration du comportement des notifications reçues
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Enregistrement ──────────────────────────────────────────────────────────

/**
 * Demande les permissions et enregistre le token push Expo.
 * Sauvegarde le token dans le profil Firestore du joueur.
 *
 * @returns le token ou null si refusé / non supporté
 */
export async function enregistrerNotifications(uid: string): Promise<string | null> {
  // Canal Android (obligatoire pour Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL_ID, {
      name: 'Conquêtes RunZone',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4136',
    });
  }

  // Demande de permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission notifications refusée');
    return null;
  }

  // Récupère le token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Sauvegarde dans Firestore
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.users, uid), {
      expoPushToken: token,
    });

    return token;
  } catch (err) {
    console.error('Erreur token push:', err);
    return null;
  }
}

// ─── Notification locale (conquête) ─────────────────────────────────────────

/**
 * Affiche une notification locale quand une des zones du joueur est conquise.
 * Appelé après réception d'un événement Firestore.
 */
export async function notifierZoneConquise(
  zone: Zone,
  conquérantNom: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚔️ Ta zone a été conquise !',
      body: `${conquérantNom} vient de s'emparer de ton territoire (${
        zone.aireM2 > 10000
          ? `${(zone.aireM2 / 10000).toFixed(2)} ha`
          : `${Math.round(zone.aireM2)} m²`
      })`,
      data: { zoneId: zone.id },
      sound: true,
    },
    trigger: null, // immédiat
  });
}

/**
 * Affiche une notification locale après une conquête réussie.
 */
export async function notifierConqueteReussie(
  nbZonesConquises: number,
  aireM2: number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚔️ Conquête ! ${nbZonesConquises} zone${nbZonesConquises > 1 ? 's' : ''} prise${nbZonesConquises > 1 ? 's' : ''}`,
      body: `Tu as étendu ton territoire de ${
        aireM2 > 10000
          ? `${(aireM2 / 10000).toFixed(2)} ha`
          : `${Math.round(aireM2)} m²`
      }`,
      sound: true,
    },
    trigger: null,
  });
}
