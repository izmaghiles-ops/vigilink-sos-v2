import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

const WARN_5_MIN = 5 * 60;  // 300 seconds — first warning
const WARN_1_MIN = 1 * 60;  //  60 seconds — urgent warning

/**
 * usePushNotifications
 *
 * Fires local notifications (with vibration) when the Dead Man's Switch
 * is approaching expiry, giving the user time to confirm they're safe.
 *
 * Notification schedule:
 *   T-5 min → "Confirmez-vous que vous êtes en sécurité ?"  (vibrate 3×)
 *   T-1 min → "⚠️ 1 MINUTE RESTANTE — Réinitialisez maintenant !"  (vibrate 5×)
 *
 * Production enhancement:
 *   Subscribe to Web Push (VAPID) to receive server-sent notifications even
 *   when the app is backgrounded or the screen is locked.
 *   See: https://web.dev/push-notifications-overview/
 */
export function usePushNotifications() {
  const { timerActive, timerSeconds, isAlertActive } = useAppStore();

  const notifiedAt5Ref = useRef(false);
  const notifiedAt1Ref = useRef(false);
  const permissionRef = useRef<NotificationPermission>('default');

  // Request permission once
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return;
    }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      permissionRef.current = perm;
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const vibrate = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const sendNotification = useCallback(
    (title: string, body: string, vibrationPattern: number[]) => {
      // Vibrate even if notification permission not granted
      vibrate(vibrationPattern);

      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        const n = new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'vigilinksos-dms-warning',
          requireInteraction: true,
          silent: false,
          ...({ renotify: true } as any),
        });

        // Clicking the notification focuses the app
        n.onclick = () => {
          window.focus();
          n.close();
        };

        // Auto-close after 30 seconds
        setTimeout(() => n.close(), 30_000);
      } catch {}
    },
    [vibrate]
  );

  // Reset flags when timer restarts
  useEffect(() => {
    if (!timerActive) {
      notifiedAt5Ref.current = false;
      notifiedAt1Ref.current = false;
    }
  }, [timerActive]);

  // Watch timer countdown for notification triggers
  useEffect(() => {
    if (!timerActive || isAlertActive) return;

    // T-5 minutes warning
    if (timerSeconds <= WARN_5_MIN && timerSeconds > WARN_1_MIN && !notifiedAt5Ref.current) {
      notifiedAt5Ref.current = true;
      sendNotification(
        'Vigilink-SOS — Êtes-vous en sécurité ?',
        'Votre minuteur expire dans 5 minutes. Appuyez pour confirmer que vous allez bien.',
        [200, 100, 200, 100, 200] // 3 pulses
      );
    }

    // T-1 minute urgent warning
    if (timerSeconds <= WARN_1_MIN && !notifiedAt1Ref.current) {
      notifiedAt1Ref.current = true;
      sendNotification(
        '⚠️ Vigilink-SOS — 1 MINUTE RESTANTE',
        'Réinitialisez votre minuteur immédiatement ou une alerte sera envoyée à vos contacts.',
        [300, 100, 300, 100, 300, 100, 300, 100, 300] // 5 urgent pulses
      );
    }
  }, [timerSeconds, timerActive, isAlertActive, sendNotification]);

  return { requestPermission };
}
