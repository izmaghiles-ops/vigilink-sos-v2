import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiUrl } from '../lib/apiBase';
import { Capacitor } from '@capacitor/core';
import NativeSMS from '../plugins/NativeSMS';

export function useOfflineQueue() {
  const { alertQueue, dequeueAlert, setIsOnline, isOnline } = useAppStore();
  const retryingRef = useRef(false);

  const flushQueue = useCallback(async () => {
    if (retryingRef.current || alertQueue.length === 0) return;
    retryingRef.current = true;

    for (const queued of alertQueue) {
      try {
        if (Capacitor.isNativePlatform()) {
          try {
            const { success } = await NativeSMS.sendSMS({
              phones: [queued.phone],
              message: queued.message,
            });
            if (success) {
              dequeueAlert(queued.id);
              console.info(`[Vigilink-SOS] Queued alert ${queued.id} sent via native SMS.`);
              continue;
            }
          } catch {}
        }

        const response = await fetch(apiUrl('/api/emergency'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: queued.payload?.userName ?? '',
            userPhone: queued.payload?.userPhone ?? '',
            contactPhones: [queued.phone],
            gps: queued.payload?.latitude
              ? {
                  latitude: queued.payload.latitude,
                  longitude: queued.payload.longitude,
                  mapsLink: queued.payload.mapsLink ?? '',
                }
              : null,
            triggerType: queued.payload?.triggerType ?? 'sos',
          }),
        });

        const data = await response.json();
        if (data.ok) {
          dequeueAlert(queued.id);
          console.info(`[Vigilink-SOS] Queued alert ${queued.id} delivered via API.`);
        }
      } catch {
        console.warn(`[Vigilink-SOS] Alert ${queued.id} still failing — will retry.`);
      }
    }

    retryingRef.current = false;
  }, [alertQueue, dequeueAlert]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine && alertQueue.length > 0) {
      flushQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue, alertQueue.length, setIsOnline]);

  return { isOnline, pendingCount: alertQueue.length };
}
