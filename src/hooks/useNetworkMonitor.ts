/**
 * useNetworkMonitor
 *
 * Listens to browser online/offline events.
 * On signal loss → vibrates 3 times (if supported).
 * Returns { isOnline } for use in components.
 */

import { useState, useEffect } from 'react';

export function useNetworkMonitor(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Vibrate 3 times: on–pause–on–pause–on
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 150, 200, 150, 200]);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
