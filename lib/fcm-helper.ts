import { fcmService } from './firebase';
import api from './api';

let isInitialized = false;

// Constants for Notification Channel
const CHANNEL_ID = 'brand_foreground';
const CHANNEL_NAME = 'brand_foreground';

/**
 * Initialize Push Notifications (Web Adapter)
 * Adapted from Capacitor logic for standard Web/Firebase
 */
export async function initializePushNotifications(userId?: string): Promise<string | null> {
  console.log('🚀 [TEST LOG] initializePushNotifications() called at:', new Date().toISOString());

  // Ne pas initialiser plusieurs fois
  if (isInitialized) {
    console.log('⚠️ [TEST LOG] Push notifications already initialized, skipping...');
    return fcmService.getToken();
  }

  console.log('🔍 [TEST LOG] Checking platform compatibility...');

  // Pour le web, on vérifie si le navigateur supporte les notifications
  // et si fcmService est disponible
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.log('❌ [TEST LOG] Push notifications not available on this browser/environment - exiting');
    return null;
  }

  const platform = 'web';
  console.log(`✅ [TEST LOG] Initializing push notifications on ${platform} platform`);
  console.log(`ℹ️ [TEST LOG] Platform: ${platform}, ServiceWorker supported: ${'serviceWorker' in navigator}`);

  try {
    // Vérifier d'abord l'état actuel des permissions
    console.log('🔐 [TEST LOG] Checking current push notification permissions...');
    let permStatus = Notification.permission;
    console.log('🔐 [TEST LOG] Current permission status:', permStatus);

    // Si la permission n'a pas encore été demandée (default), la demander
    if (permStatus === 'default') {
      console.log('📋 [TEST LOG] Requesting push notification permissions...');
      const permission = await Notification.requestPermission();
      permStatus = permission;
      console.log('📋 [TEST LOG] Permission request result:', permStatus);
    } else if (permStatus === 'denied') {
      // Si la permission a été refusée, ne pas continuer
      console.warn('🚫 [TEST LOG] Push notification permission denied by user. User can enable it in browser settings.');
      return null;
    } else if (permStatus === 'granted') {
      console.log('✅ [TEST LOG] Push notification permission already granted');
    }

    // Vérifier si la permission a été accordée avant de continuer
    if (permStatus !== 'granted') {
      console.warn('🚫 [TEST LOG] Push notification permission not granted:', permStatus);
      return null;
    }

    console.log('✅ [TEST LOG] Push notification permission granted, setting up listeners...');

    // Simulation de la création du canal pour le contexte Web (pour garder la logique "1xstore")
    console.log(`✅ [TEST LOG] Configuring notification channel: ${CHANNEL_NAME} (${CHANNEL_ID})`);
    // Note: Sur le web, les "channels" ne sont pas gérés par le navigateur de la même façon qu'Android, 
    // mais on définit ces constantes pour la cohérence des logs et l'usage futur.

    // IMPORTANT: Ajouter les listeners 
    console.log('👂 [TEST LOG] Adding push notification event listeners...');

    // Écouter les messages au premier plan (Foreground)
    fcmService.setupForegroundListener((payload) => {
      console.log('📨 [TEST LOG] Push notification received while app in foreground:', {
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
        timestamp: new Date().toISOString(),
      });

      // Afficher une notification système même au premier plan si possible
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(payload.notification?.title || 'Notification', {
            body: payload.notification?.body || '',
            icon: '/icon-192x192.png',
            tag: CHANNEL_ID, // Utilise l'ID du canal comme tag pour regrouper/remplacer
            data: {
              ...payload.data,
              channelId: CHANNEL_ID
            }
          });
          console.log(`✅ [TEST LOG] System notification displayed for foreground push (Channel: ${CHANNEL_NAME})`);
        } catch (error) {
          console.error('❌ [TEST LOG] Error displaying system notification:', error);
        }
      }
    });

    console.log('👂 [TEST LOG] All listeners added, now registering for push notifications (getting token)...');

    // Enregistrer pour recevoir les notifications (Get Token)
    console.log('📝 [TEST LOG] Calling fcmService.refreshToken() / getToken...');

    // Assurer que le SW est enregistré
    await fcmService.registerServiceWorker();

    const token = await fcmService.refreshToken();

    if (token) {
      console.log('🔔 [TEST LOG] Push registration success! Token received:', {
        token_preview: token.substring(0, 30) + '...',
        full_token_length: token.length,
        timestamp: new Date().toISOString(),
      });

      console.log(`📱 [TEST LOG] Platform detected: ${platform}, preparing to send token to backend...`);

      // Enregistrer le device sur le backend
      if (userId) {
        await sendTokenToBackend(token, userId);
      } else {
        console.warn('⚠️ [TEST LOG] No userId provided, skipping backend registration until login');
      }

      isInitialized = true;
      console.log('✅ [TEST LOG] Push notifications registration completed successfully!');
      return token;
    } else {
      console.error('❌ [TEST LOG] Failed to get FCM token');
      return null;
    }

  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
}

/**
 * Send FCM token to backend
 */
export async function sendTokenToBackend(
  token: string,
  userId?: string
): Promise<boolean> {
  if (!userId) {
    console.warn('[FCM] User ID is required to send token to backend');
    return false;
  }

  try {
    // Send to the devices endpoint with the required payload format
    await api.post('/mobcash/devices/', {
      registration_id: token,
      type: 'web',
      user_id: userId,
    });

    console.log('[FCM] Token sent to backend successfully');
    return true;
  } catch (error: any) {
    console.error('[FCM] Error sending token to backend:', error);
    return false;
  }
}

/**
 * Legacy/Wrapper for compatibility
 */
export async function setupNotifications(userId?: string): Promise<string | null> {
  return initializePushNotifications(userId);
}

// Keep initializeFCM for backward compatibility if imported elsewhere, 
// strictly mapped to the new function
export async function initializeFCM(userId?: string): Promise<string | null> {
  return initializePushNotifications(userId);
}

/**
 * Setup foreground message listener
 */
export function setupForegroundListener(
  onMessage: (payload: any) => void
): void {
  fcmService.setupForegroundListener((payload) => {
    console.log('Foreground message received:', payload);
    onMessage(payload);
  });
}
