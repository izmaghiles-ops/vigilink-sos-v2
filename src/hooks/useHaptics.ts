/**
 * useHaptics — Safe vibration feedback hook
 *
 * Wraps the Web Vibration API (navigator.vibrate) with:
 *  - Feature detection guard (no crash on unsupported browsers / iOS PWA)
 *  - Named patterns for consistent UX across the app
 *
 * iOS note: vibration via PWA only works when the app is added to the home
 * screen (navigator.vibrate is available in some Safari versions but may
 * silently no-op depending on device / iOS version).
 */

type VibrationPattern = number | number[];

// Predefined patterns ──────────────────────────────────────────────────────────

/** Short 80ms tap — confirms button press was registered */
const TAP: VibrationPattern = 80;

/** Triple-pulse — confirms SOS alert was sent successfully */
const SUCCESS: VibrationPattern = [500, 150, 500, 150, 500];

/** Double-short — Dead Man Switch warning (T-1 min) */
const WARNING: VibrationPattern = [200, 100, 200];

/** Long single — Dead Man Switch triggered */
const EMERGENCY: VibrationPattern = 1000;

/** Very short — UI navigation / toggle feedback */
const LIGHT: VibrationPattern = 30;

/**
 * Micro-vibration — confirmation discrète Mode Discret
 * Presque imperceptible (25ms) : confirme que le SMS est parti
 * sans attirer l'attention de l'entourage.
 */
const MICRO: VibrationPattern = 25;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHaptics() {
  const supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function';

  const vibrate = (pattern: VibrationPattern) => {
    if (!supported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently swallow — some browsers expose vibrate but throw on call
    }
  };

  return {
    /** Whether the device supports vibration */
    supported,

    /** 80ms — confirms button press */
    tap: () => vibrate(TAP),

    /** [500,150,500,150,500] — SOS sent successfully */
    success: () => vibrate(SUCCESS),

    /** [200,100,200] — DMS warning pulse */
    warning: () => vibrate(WARNING),

    /** 1000ms — emergency triggered */
    emergency: () => vibrate(EMERGENCY),

    /** 30ms — light UI feedback */
    light: () => vibrate(LIGHT),

    /**
     * 25ms — micro-vibration de confirmation Mode Discret
     * Presque imperceptible : confirme que le SMS d'urgence est parti
     * sans alerter l'entourage.
     */
    micro: () => vibrate(MICRO),

    /** Double micro — step completed in discretion mode */
    stepDiscret: () => vibrate([30, 50, 30]),

    /** Raw pattern — for custom sequences */
    custom: (pattern: VibrationPattern) => vibrate(pattern),
  };
}
