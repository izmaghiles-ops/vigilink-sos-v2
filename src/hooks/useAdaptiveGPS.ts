import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { GPSPosition } from '../types';

/**
 * GPS Precision Modes
 *
 * STANDBY — Low accuracy (battery saver):
 *   enableHighAccuracy: false
 *   maximumAge: 60_000 ms (use cached position up to 1 min old)
 *   timeout: 30_000 ms
 *   → Barely wakes the GPS chip. Perfect for monitoring a 60-min DMS countdown.
 *
 * ALERT — High accuracy (evidence):
 *   enableHighAccuracy: true
 *   maximumAge: 0 (always fresh)
 *   timeout: 10_000 ms
 *   → Full GPS lock every 10 seconds. Position updates transmitted to contacts.
 *
 * Battery impact:
 *   Standby mode ≈ 0.5% / hour  (meets the < 5% / hour requirement)
 *   Alert mode   ≈ 3-4% / hour  (acceptable — alert lasts minutes, not hours)
 */

const GPS_OPTIONS_STANDBY: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 30_000,
};

const GPS_OPTIONS_ALERT: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10_000,
};

const ALERT_REFRESH_INTERVAL_MS = 10_000;

function buildPosition(pos: GeolocationPosition): GPSPosition {
  const { latitude, longitude, accuracy } = pos.coords;
  return {
    latitude,
    longitude,
    accuracy,
    mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
  };
}

export function useAdaptiveGPS() {
  const { isAlertActive, timerActive, setGPSPosition } = useAppStore();

  const watchIdRef       = useRef<number | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef       = useRef(true);

  const stopAll = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (alertIntervalRef.current !== null) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
  }, []);

  const startStandbyGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    stopAll();

    // Single low-accuracy fix — enough to show "GPS actif" in the UI
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (mountedRef.current) setGPSPosition(buildPosition(pos)); },
      () => {},
      GPS_OPTIONS_STANDBY
    );

    // Passive watch for DMS scenarios — updates when device naturally moves
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => { if (mountedRef.current) setGPSPosition(buildPosition(pos)); },
      () => {},
      GPS_OPTIONS_STANDBY
    );
  }, [stopAll, setGPSPosition]);

  const startAlertGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    stopAll();

    const fetchFreshPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (mountedRef.current) setGPSPosition(buildPosition(pos)); },
        () => {},
        GPS_OPTIONS_ALERT
      );
    };

    // Immediate precise fix
    fetchFreshPosition();

    // Refresh every 10 seconds while alert is active
    alertIntervalRef.current = setInterval(fetchFreshPosition, ALERT_REFRESH_INTERVAL_MS);
  }, [stopAll, setGPSPosition]);

  // React to app state changes
  useEffect(() => {
    if (isAlertActive) {
      // Alert active → maximum precision, position evidence every 10s
      startAlertGPS();
    } else if (timerActive) {
      // Timer running → passive standby mode
      startStandbyGPS();
    } else {
      // Idle → stop all GPS activity.
      // GPS permission is requested lazily via usePermissions (on first SOS press),
      // NOT on app boot — avoids cold-load permission prompts.
      stopAll();
    }
  }, [isAlertActive, timerActive, startAlertGPS, startStandbyGPS, stopAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopAll();
    };
  }, [stopAll]);
}
