/**
 * Vigilink-SOS PWA Configuration
 *
 * This module manages:
 * 1. Service Worker registration for offline capability
 * 2. Install prompt capture (Add to Home Screen)
 * 3. Network-state awareness
 *
 * ─── Service Worker Strategy ────────────────────────────────────────────────
 * Cache-First for static assets (JS/CSS/icons)
 * Network-First for API calls (alerts, GPS, contacts)
 * Background-Sync for queued alerts when offline
 *
 * ─── manifest.json (place in /public) ──────────────────────────────────────
 * {
 *   "name": "Vigilink-SOS",
 *   "short_name": "Vigilink-SOS",
 *   "description": "Protection personnelle 24/7 — Votre garde du corps numérique",
 *   "start_url": "/",
 *   "display": "standalone",
 *   "background_color": "#000000",
 *   "theme_color": "#000000",
 *   "orientation": "portrait",
 *   "icons": [
 *     { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
 *     { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
 *   ],
 *   "categories": ["lifestyle", "utilities"],
 *   "lang": "fr"
 * }
 *
 * ─── Node.js / Express Backend (production) ─────────────────────────────────
 * POST /api/emergency
 *   Body: { user_id, user_name, trigger_type, latitude, longitude, maps_link }
 *   → Validates request
 *   → Calls Twilio SMS API (server-side — key never reaches client)
 *   → Logs to database
 *   → Returns { ok: true, alertId }
 *
 * POST /api/alive
 *   Body: { user_id, session_token }
 *   → Resets server-side DMS countdown for user
 *   → If countdown expires: server independently triggers Twilio alert
 *     (protects against phone destruction / battery death)
 *
 * ─── Twilio SMS format ───────────────────────────────────────────────────────
 * "ALERTE VIGILINK-SOS : [Nom] est en danger.
 *  Position : https://www.google.com/maps?q=[lat],[lng]
 *  Audio en cours d'enregistrement."
 */

let deferredPrompt: any = null;

/**
 * Capture the PWA install prompt for later use.
 * Call this once at app startup.
 */
export function initPWAInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Trigger the native "Add to Home Screen" prompt.
 * Returns true if the user accepted.
 */
export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

/**
 * Check if the app is running in standalone (installed PWA) mode.
 */
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Register the service worker.
 * In Vite, use vite-plugin-pwa for full service worker generation.
 * This function handles registration and update cycles.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.info('[Vigilink-SOS] New Service Worker activated — reloading page');
      window.location.reload();
    });

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        }
      });
    });

    await reg.update();

    console.info('[Vigilink-SOS] Service Worker registered.');
  } catch (err) {
    console.warn('[Vigilink-SOS] Service Worker registration failed:', err);
  }
}
