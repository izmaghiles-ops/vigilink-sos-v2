import { useState, useCallback, useRef, useEffect } from 'react';

export type PermissionState = 'idle' | 'pending' | 'granted' | 'denied';

export interface PermissionsStatus {
  gps: PermissionState;
  mic: PermissionState;
  allGranted: boolean;
  anyDenied: boolean;
}

interface UsePermissionsReturn {
  status: PermissionsStatus;
  requestPermissions: () => Promise<PermissionsStatus>;
  showExplanation: boolean;
  confirmExplanation: () => void;
  alreadyGranted: boolean;
}

const PERM_KEY = 'vigilink-permissions-granted';

const buildStatus = (gps: PermissionState, mic: PermissionState): PermissionsStatus => ({
  gps,
  mic,
  allGranted: gps === 'granted' && mic === 'granted',
  anyDenied: gps === 'denied' || mic === 'denied',
});

async function checkBrowserPermissions(): Promise<{ gps: boolean; mic: boolean }> {
  let gps = false;
  let mic = false;
  try {
    if (navigator.permissions) {
      const [geoResult] = await Promise.allSettled([
        navigator.permissions.query({ name: 'geolocation' }),
      ]);
      gps = geoResult.status === 'fulfilled' && geoResult.value.state === 'granted';
    }
  } catch {}
  return { gps, mic };
}

export function usePermissions(): UsePermissionsReturn {
  const [gps, setGps] = useState<PermissionState>('idle');
  const [mic, setMic] = useState<PermissionState>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const alreadyGranted = useRef(false);
  const resolveRef = useRef<((s: PermissionsStatus) => void) | null>(null);

  useEffect(() => {
    const wasGranted = localStorage.getItem(PERM_KEY) === 'true';
    if (wasGranted) {
      checkBrowserPermissions().then(({ gps: gOk, mic: mOk }) => {
        if (gOk && mOk) {
          alreadyGranted.current = true;
          setGps('granted');
          setMic('granted');
        } else if (gOk || mOk) {
          if (gOk) setGps('granted');
          if (mOk) setMic('granted');
          alreadyGranted.current = true;
        } else {
          localStorage.removeItem(PERM_KEY);
        }
      });
    } else {
      checkBrowserPermissions().then(({ gps: gOk, mic: mOk }) => {
        if (gOk && mOk) {
          alreadyGranted.current = true;
          setGps('granted');
          setMic('granted');
          localStorage.setItem(PERM_KEY, 'true');
        }
      });
    }
  }, []);

  const doRequestPermissions = useCallback(async (): Promise<PermissionsStatus> => {
    let gpsState: PermissionState = 'idle';
    let micState: PermissionState = 'idle';

    if ('geolocation' in navigator) {
      setGps('pending');
      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
          );
        });
        gpsState = 'granted';
        setGps('granted');
      } catch {
        gpsState = 'denied';
        setGps('denied');
      }
    } else {
      gpsState = 'denied';
      setGps('denied');
    }

    micState = 'granted';
    setMic('granted');

    const result = buildStatus(gpsState, micState);
    if (gpsState === 'granted') {
      alreadyGranted.current = true;
      localStorage.setItem(PERM_KEY, 'true');
    }
    return result;
  }, []);

  const confirmExplanation = useCallback(async () => {
    setShowExplanation(false);
    const result = await doRequestPermissions();
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }, [doRequestPermissions]);

  const requestPermissions = useCallback((): Promise<PermissionsStatus> => {
    if (alreadyGranted.current) {
      return Promise.resolve(buildStatus('granted', 'granted'));
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setShowExplanation(true);
    });
  }, []);

  return {
    status: buildStatus(gps, mic),
    requestPermissions,
    showExplanation,
    confirmExplanation,
    alreadyGranted: alreadyGranted.current,
  };
}
