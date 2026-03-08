/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        App.tsx — Vigilink-SOS                                  ║
 * ║                    Point d'entrée principal de l'application                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PLANS SUPPORTÉS                                                             ║
 * ║  ──────────────                                                              ║
 * ║  Gratuit   — SOS manuel, 1 contact, GPS basique.                             ║
 * ║              Micro et GPS haute précision désactivés.                        ║
 * ║                                                                              ║
 * ║  PRO       — SOS manuel, 5 contacts urgence,                                ║
 * ║              GPS haute précision, horloge de securite,                     ║
 * ║              enregistrement audio 30s + SMS suivi, mode discret.           ║
 * ║                                                                              ║
 * ║  Platinum  — Identique PRO + 10 contacts,                                 ║
 * ║              détection cris/pleurs IA, chute (accéléromètre),              ║
 * ║              secousse volontaire, membres illimités, codes enfants.         ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  ARCHITECTURE                                                                ║
 * ║  ────────────                                                                ║
 * ║  App      → Garde d'authentification uniquement.                             ║
 * ║             Affiche <LoginView> ou <AppCore>.                               ║
 * ║             Aucun autre hook ici (règle absolue des hooks React).            ║
 * ║                                                                              ║
 * ║  AppCore  → Tous les hooks système ici.                                     ║
 * ║             Jamais de return conditionnel AVANT le dernier hook.             ║
 * ║             Toutes les vues et overlays sont rendus depuis AppCore.          ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  GPS HAUTE PRÉCISION                                                         ║
 * ║  ───────────────────                                                         ║
 * ║  Forcé à chaque déclenchement SOS pour les plans PRO et Platinum.           ║
 * ║  Options : enableHighAccuracy=true, maximumAge=0, timeout=8000ms.           ║
 * ║  Si le GPS échoue, l'alerte part quand même avec la dernière position       ║
 * ║  connue du store (useAdaptiveGPS maintient la position en arrière-plan).    ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  DÉTECTION DE CHUTE (Platinum)                                               ║
 * ║  ──────────────────────────────                                              ║
 * ║  DeviceMotionEvent — accélération totale > 25 m/s² pendant < 80ms.          ║
 * ║  Signale une chute libre suivie d'un impact (pas un choc isolé).            ║
 * ║                                                                              ║
 * ║  DÉTECTION DE SECOUSSE (Platinum)                                            ║
 * ║  ─────────────────────────────────                                           ║
 * ║  DeviceMotionEvent — accélération totale > 15 m/s².                         ║
 * ║  Délai antirebond de 3 secondes entre deux déclenchements.                  ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  MODE DISCRET (Platinum)                                                     ║
 * ║  ────────────────────────                                                    ║
 * ║  Aucune vibration, aucun son lors du SOS.                                   ║
 * ║  Une micro-vibration de confirmation est envoyée après l'envoi du SMS       ║
 * ║  pour confirmer l'envoi sans alerter l'entourage.                           ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  NUMÉROS D'URGENCE                                                           ║
 * ║  ──────────────────                                                          ║
 * ║  PRO/Platinum : proPhone1 + proPhone2 (stockés en E.164 via PhoneField).    ║
 * ║  Gratuit/Fallback : contacts de priorité "primary" (max 2).                 ║
 * ║  Tous les numéros sont normalisés via normalisePhone() avant l'envoi.       ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  ADMIN                                                                       ║
 * ║  ─────                                                                       ║
 * ║  Accès réservé à Gilles (admin hardcodé).                                   ║
 * ║  Navigation : Settings → Admin via AdminView.                               ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore }  from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { HomeView }       from './components/views/HomeView';
import { LoginView }      from './components/views/LoginView';
import { SettingsView }   from './components/views/SettingsView';
import { SponsorView }    from './components/views/SponsorView';
import { AlzheimerSponsorView } from './components/views/AlzheimerSponsorView';
import { ContactsView }   from './components/views/ContactsView';
import { HistoryView }    from './components/views/HistoryView';
import { UpgradeView }    from './components/views/UpgradeView';
import { LegalView }      from './components/views/LegalView';
import { ChecklistView }  from './components/views/ChecklistView';
import { OnboardingView } from './components/views/OnboardingView';
import { AdminView }      from './components/views/AdminView';
import { SupportView }    from './components/views/SupportView';
import { MeetingModeView } from './components/views/MeetingModeView';
import { TravelModeView } from './components/views/TravelModeView';
import { EmergencyNumbersView } from './components/views/EmergencyNumbersView';
import { MedicalProfileView } from './components/views/MedicalProfileView';
import JournalView from './components/views/JournalView';
import { QRCodeView } from './components/views/QRCodeView';
import { AlertOverlay }     from './components/AlertOverlay';
import { BottomNav }        from './components/BottomNav';
import { GuardianChat }     from './components/GuardianChat';
import { NetworkStatusBar } from './components/NetworkStatusBar';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import LanguageSelector     from './components/LanguageSelector';
import { UpdateBanner }     from './components/UpdateBanner';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useOfflineQueue }      from './hooks/useOfflineQueue';
import { useAdaptiveGPS }       from './hooks/useAdaptiveGPS';
import { usePushNotifications } from './hooks/usePushNotifications';
import { usePlanTheme }         from './hooks/usePlanTheme';
import { useHaptics }           from './hooks/useHaptics';
import { logAlert, normalisePhone, startGPSWatch } from './lib/api';
import { initPWAInstallPrompt }     from './lib/pwa';
import { parseCheckoutResult, clearCheckoutParams } from './lib/stripe';
import { PLATINUM_CONFIG_DEFAUT } from './types';
import { v4 as uuidv4 } from 'uuid';
import { PhoneField, PAYS_LISTE, paysPourE164, localDepuisE164, SélecteurPays } from './components/PhoneField';
import type { Pays, SélecteurPaysProps, PhoneFieldProps } from './components/PhoneField';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const APP_LANG = 'fr' as const;

const GPS_HAUTE_PRECISION: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge:         0,
  timeout:            8_000,
};

function obtenirGPSHautePrecision(): Promise<{
  latitude:  number;
  longitude: number;
  accuracy:  number;
  mapsLink:  string;
}> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GPS non disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
          mapsLink:  `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
        }),
      reject,
      GPS_HAUTE_PRECISION,
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL : AppCore
// ═══════════════════════════════════════════════════════════════════════════

const AppCore: React.FC = () => {
  const { i18n } = useTranslation();
  const {
    currentView,
    setView: setViewRaw,
    isAlertActive,
    setAlertActive,
    user,
    gpsPosition,
    setGPSPosition,
    contacts,
    prependAlert,
    onboardingComplete,
    setOnboardingComplete,
    enqueueAlert,
    setUser,
    setContacts,
  } = useAppStore();

  const setView = React.useCallback((view: string) => {
    if (view !== currentView) {
      window.history.pushState({ view }, '', window.location.pathname);
    }
    setViewRaw(view as any);
  }, [currentView, setViewRaw]);

  const checkoutHandled = React.useRef(false);
  React.useEffect(() => {
    if (checkoutHandled.current) return;

    let saved: { status: string; plan?: string; ts?: number } | null = null;
    try {
      const raw = localStorage.getItem('vigilink-checkout-return');
      if (raw) {
        saved = JSON.parse(raw);
        localStorage.removeItem('vigilink-checkout-return');
      }
    } catch {}

    if (!saved) {
      const result = parseCheckoutResult();
      if (result.status === 'success') saved = { status: 'success', plan: result.plan };
      else if (result.status === 'cancelled') saved = { status: 'cancelled' };
    }

    if (saved?.status === 'success') {
      checkoutHandled.current = true;
      const plan = (saved.plan === 'platinum' ? 'platinum' : 'pro') as 'pro' | 'platinum';
      setUser({ subscription: plan });
      useAuthStore.getState().changerPlan(plan);
      clearCheckoutParams();
      useAppStore.setState({ _checkoutReturn: 'success' });
      setView('upgrade');
    } else if (saved?.status === 'cancelled') {
      checkoutHandled.current = true;
      clearCheckoutParams();
      useAppStore.setState({ _checkoutReturn: 'cancelled' });
      setView('upgrade');
    }
  }, []);

  const initialViewSet = React.useRef(false);
  React.useEffect(() => {
    if (!initialViewSet.current) {
      initialViewSet.current = true;
      const params = new URLSearchParams(window.location.search);
      const hasCheckout = params.has('checkout');
      window.history.replaceState({ view: hasCheckout ? 'upgrade' : 'home' }, '', window.location.pathname);
    }

    const onPopState = (e: PopStateEvent) => {
      const view = e.state?.view;
      if (view) {
        setViewRaw(view);
      } else {
        setViewRaw('home' as any);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setViewRaw]);

  const { compteActif, essaiExpire } = useAuthStore();

  React.useEffect(() => {
    initPWAInstallPrompt();
    startGPSWatch();
  }, []);

  usePlanTheme(user.subscription);

  const compteActifPhone = compteActif?.phone ?? null;
  const compteActifSub   = compteActif?.subscription ?? null;
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    if (!compteActif) return;
    if (hydrated.current) return;
    hydrated.current = true;
    const abonnement = essaiExpire() ? 'free' : compteActif.subscription;
    setUser({
      name:           compteActif.profileName  ?? 'Utilisateur',
      phone:          compteActif.phone        ?? '',
      subscription:   abonnement,
      platinumConfig: compteActif.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,
      normalCode:     compteActif.normalCode   || '1234',
      duressCode:     compteActif.duressCode   || '9999',
      proPhone1:      compteActif.proPhone1    ?? '',
      proPhone2:      compteActif.proPhone2    ?? '',
    });
    if (compteActif.contacts) {
      useAppStore.setState({ contacts: compteActif.contacts });
    }
  }, [compteActifPhone, compteActifSub]);

  const adminSession = useAppStore((s) => s.adminSession);
  const estPro      = adminSession || user.subscription === 'pro' || user.subscription === 'platinum';
  const estPlatinum = adminSession || user.subscription === 'platinum';

  React.useEffect(() => {
    if (currentView === 'admin' && !adminSession) setView('home');
  }, [currentView, adminSession]);

  const platinumCfg = user.platinumConfig ?? PLATINUM_CONFIG_DEFAUT;

  useOfflineQueue();
  usePushNotifications();
  useAdaptiveGPS();
  const haptics = useHaptics();

  const modeDiscret = (estPro || estPlatinum) && (platinumCfg.modeDiscret ?? false);

  // ── Fonction centrale : envoi de l'alerte SOS ─────────────────────────
  const sendEmergencySMS = React.useCallback(async (source: string) => {
    if (isAlertActive) return;
    setAlertActive(true);

    let position = gpsPosition;

    try {
      const { getGPSPosition } = await import('./lib/api');
      position = await getGPSPosition();
      setGPSPosition(position);
      if (modeDiscret) haptics.stepDiscret();
    } catch {}

    const destinataires: string[] = [];

    if ((estPro || estPlatinum) && (user.proPhone1 || user.proPhone2)) {
      if (user.proPhone1) destinataires.push(normalisePhone(user.proPhone1));
      if (user.proPhone2) destinataires.push(normalisePhone(user.proPhone2));
    }

    contacts.forEach((c) => {
      const num = normalisePhone(c.phone);
      if (num && !destinataires.includes(num)) destinataires.push(num);
    });

    console.log(`[SOS] subscription=${user.subscription}, contacts=${contacts.length}, destinataires=${destinataires.length}`, destinataires);

    if (destinataires.length === 0) {
      console.error('[SOS] AUCUN CONTACT — impossible d\'envoyer le SOS');
      alert('Aucun contact d\'urgence configuré. Ajoutez au moins un contact dans vos paramètres.');
      setAlertActive(false);
      return;
    }

    const alertId = uuidv4();

    const isStealthTrigger = source === 'volume' || source === 'ecouteurs';
    if (!modeDiscret && !isStealthTrigger) {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }

    if (modeDiscret || isStealthTrigger) haptics.micro();

    prependAlert({
      id:          alertId,
      type:        'sos',
      source,
      timestamp:   Date.now(),
      position:    position ?? undefined,
      recipients:  destinataires,
    });

    const currentLang = i18n.language || localStorage.getItem('vigilink-language') || 'fr';

    const { meetingMode, contacts: allContacts, journalEntries } = useAppStore.getState();

    const recentJournal = journalEntries.slice(0, 10).map(e => ({
      title: e.title,
      description: e.description,
      date: e.date,
      photo: e.photo || undefined,
    }));

    const result = await logAlert(
      {
        id: alertId,
        source,
        gps: position,
        contactPhones: destinataires,
        userName: user.name,
        userPhone: user.phone,
        triggerType: source,
        lang: currentLang,
        meetingMode: meetingMode.active ? meetingMode as unknown as Record<string, unknown> : undefined,
        emergencyContacts: allContacts.map(c => `${c.name}:${c.phone}`),
        subscription: user.subscription,
        journalEntries: recentJournal.length > 0 ? recentJournal : undefined,
      },
      (queued) => enqueueAlert(queued),
    );

    if (!result.ok) {
      console.warn('[Vigilink-SOS] SOS alert result:', (result as any).reason);
    }

    if (modeDiscret) haptics.stepDiscret();

    setTimeout(() => {
      setAlertActive(false);
    }, 5_000);
  }, [
    isAlertActive, setAlertActive, gpsPosition, setGPSPosition,
    estPro, estPlatinum, modeDiscret, haptics, user, contacts, i18n.language,
    enqueueAlert, prependAlert,
  ]);

  const estPayant = estPro || estPlatinum;

  // ── Unified SOS handler — PWA shortcut, Google Assistant, deep link ──
  const lastSosTs = React.useRef(0);
  const checkPendingAction = React.useCallback(() => {
    if (Date.now() - lastSosTs.current < 10000) return;

    let action: string | null = null;
    let source = 'widget_sos';

    try {
      const saved = localStorage.getItem('vigilink-pending-action');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.action && Date.now() - (parsed.ts || 0) < 30000) {
          action = parsed.action;
        }
        localStorage.removeItem('vigilink-pending-action');
      }
    } catch {}

    if (!action) {
      const params = new URLSearchParams(window.location.search);
      action = params.get('action');
    }

    if (!action && window.location.hash === '#sos') {
      action = 'sos';
      source = 'assistant_sos';
    }

    if (action === 'sos') {
      lastSosTs.current = Date.now();
      window.history.replaceState({}, '', '/');
      console.log('[Vigilink-SOS] Pending SOS detected, source:', source);
      setTimeout(() => sendEmergencySMS(source), 1500);
    } else if (action === 'emergency-numbers') {
      window.history.replaceState({}, '', '/');
      setView('emergency-numbers');
    }
  }, [sendEmergencySMS, setView]);

  React.useEffect(() => {
    checkPendingAction();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(checkPendingAction, 300);
      }
    };

    const onFocus = () => {
      setTimeout(checkPendingAction, 300);
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setTimeout(checkPendingAction, 300);
      }
    };

    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PENDING_ACTION' && e.data.action === 'sos') {
        if (Date.now() - lastSosTs.current < 10000) return;
        lastSosTs.current = Date.now();
        console.log('[Vigilink-SOS] SOS via SW message');
        setTimeout(() => sendEmergencySMS('assistant_sos'), 1500);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    const onHashChange = () => checkPendingAction();
    window.addEventListener('hashchange', onHashChange);

    if (Capacitor.isNativePlatform()) {
      const checkLaunchUrl = async () => {
        try {
          const launchUrl = await CapApp.getLaunchUrl();
          if (launchUrl?.url) {
            const url = new URL(launchUrl.url);
            if (url.searchParams.get('action') === 'sos' || url.host === 'sos') {
              if (Date.now() - lastSosTs.current < 10000) return;
              lastSosTs.current = Date.now();
              setTimeout(() => sendEmergencySMS('assistant_sos'), 2000);
            }
          }
        } catch {}
      };
      checkLaunchUrl();

      const listener = CapApp.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          if (url.searchParams.get('action') === 'sos' || url.host === 'sos') {
            if (Date.now() - lastSosTs.current < 10000) return;
            lastSosTs.current = Date.now();
            setTimeout(() => sendEmergencySMS('assistant_sos'), 2000);
          }
        } catch {}
      });

      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('pageshow', onPageShow);
        window.removeEventListener('hashchange', onHashChange);
        navigator.serviceWorker?.removeEventListener('message', onSwMessage);
        listener.then(l => l.remove());
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('hashchange', onHashChange);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [checkPendingAction, sendEmergencySMS]);

  // ── Permission DeviceMotion (iOS) — demander une seule fois ──────────
  const motionPermGranted = React.useRef(false);
  React.useEffect(() => {
    if (!estPlatinum) return;
    if (!platinumCfg.chuteActif && !platinumCfg.secoussesActif) return;

    const requestMotionPermission = async () => {
      if (motionPermGranted.current) return;
      const DME = DeviceMotionEvent as any;
      if (typeof DME.requestPermission === 'function') {
        try {
          const perm = await DME.requestPermission();
          motionPermGranted.current = perm === 'granted';
          if (perm !== 'granted') {
            console.warn('[Vigilink-SOS] DeviceMotion permission denied');
          }
        } catch (err) {
          console.warn('[Vigilink-SOS] DeviceMotion permission error:', err);
        }
      } else {
        motionPermGranted.current = true;
      }
    };

    const handler = () => {
      requestMotionPermission();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [estPlatinum, platinumCfg.chuteActif, platinumCfg.secoussesActif]);

  // ── Détection de chute + secousse combinée (Platinum) ──────────────
  const isFakeCallActive = useAppStore((s) => s.isFakeCallActive);
  React.useEffect(() => {
    if (!estPlatinum) return;
    if (!platinumCfg.chuteActif && !platinumCfg.secoussesActif) return;

    const SEUIL_CHUTE_MS2 = 25;
    const FENETRE_MS      = 300;
    const SEUIL_SECOUSSE  = 15;
    const DELAI_SECOUSSE  = 5_000;
    const DELAI_REVEIL    = 4_000;
    let enChute           = false;
    let tChute            = 0;
    let dernierDeclench   = 0;
    let dernierReveil     = Date.now();

    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        dernierReveil = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    const onMotion = (e: DeviceMotionEvent) => {
      if (useAppStore.getState().isFakeCallActive) return;
      if (Date.now() - dernierReveil < DELAI_REVEIL) return;
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);

      if (platinumCfg.chuteActif) {
        if (!enChute && mag > SEUIL_CHUTE_MS2) {
          enChute = true;
          tChute  = Date.now();
        } else if (enChute) {
          const delta = Date.now() - tChute;
          if (delta < FENETRE_MS && mag < 5) {
            enChute = false;
            if (Date.now() - dernierDeclench > DELAI_SECOUSSE) {
              dernierDeclench = Date.now();
              sendEmergencySMS('chute');
            }
          } else if (delta >= FENETRE_MS) {
            enChute = false;
          }
        }
      }

      if (platinumCfg.secoussesActif) {
        if (mag > SEUIL_SECOUSSE && Date.now() - dernierDeclench > DELAI_SECOUSSE) {
          dernierDeclench = Date.now();
          sendEmergencySMS('secousse');
        }
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [estPlatinum, platinumCfg.chuteActif, platinumCfg.secoussesActif, sendEmergencySMS, isFakeCallActive]);

  // ── Earbuds SOS — triple media key press (PRO/Platinum) ────────────
  React.useEffect(() => {
    if (!estPayant) return;
    let pressCount = 0;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMediaKey = () => {
      pressCount++;
      if (pressTimer) clearTimeout(pressTimer);
      if (pressCount >= 3) {
        pressCount = 0;
        sendEmergencySMS('ecouteurs');
      } else {
        pressTimer = setTimeout(() => { pressCount = 0; }, 2000);
      }
    };

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', handleMediaKey);
        navigator.mediaSession.setActionHandler('pause', handleMediaKey);
        navigator.mediaSession.setActionHandler('previoustrack', handleMediaKey);
        navigator.mediaSession.setActionHandler('nexttrack', handleMediaKey);
      } catch {}
    }

    return () => {
      if (pressTimer) clearTimeout(pressTimer);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
        } catch {}
      }
    };
  }, [estPayant, sendEmergencySMS]);

  // ── Volume Button SOS — triple press volume up/down ────────────────
  React.useEffect(() => {
    if (!estPayant) return;
    let pressCount = 0;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVolumeKey = (e: KeyboardEvent) => {
      if (e.key !== 'AudioVolumeUp' && e.key !== 'AudioVolumeDown' &&
          e.key !== 'VolumeUp' && e.key !== 'VolumeDown') return;

      e.preventDefault();
      pressCount++;
      if (pressTimer) clearTimeout(pressTimer);

      if (pressCount >= 3) {
        pressCount = 0;
        haptics.micro();
        sendEmergencySMS('volume');
      } else {
        pressTimer = setTimeout(() => { pressCount = 0; }, 2000);
      }
    };

    window.addEventListener('keydown', handleVolumeKey);
    return () => {
      window.removeEventListener('keydown', handleVolumeKey);
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [estPayant, sendEmergencySMS, haptics]);

  // ── Travel Mode — missed check-in detection ────────────────────────
  const { travelMode } = useAppStore();
  React.useEffect(() => {
    if (!estPayant || !travelMode.active) return;

    const GRACE_MINUTES = 30;
    const CHECK_INTERVAL = 60_000;

    const checkMissed = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return new Date(`${today}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      };

      const morningDeadline = new Date(parseTime(travelMode.checkInMorning).getTime() + GRACE_MINUTES * 60_000);
      const eveningDeadline = new Date(parseTime(travelMode.checkInEvening).getTime() + GRACE_MINUTES * 60_000);

      const lastCheck = travelMode.lastCheckIn ? new Date(travelMode.lastCheckIn) : null;
      const lastCheckToday = lastCheck && lastCheck.toISOString().slice(0, 10) === today;

      let missed = false;

      if (now > morningDeadline && now < parseTime(travelMode.checkInEvening)) {
        if (!lastCheckToday || (lastCheck && lastCheck < parseTime(travelMode.checkInMorning))) {
          missed = true;
        }
      }

      if (now > eveningDeadline) {
        if (!lastCheckToday || (lastCheck && lastCheck < parseTime(travelMode.checkInEvening))) {
          missed = true;
        }
      }

      if (missed) {
        const store = useAppStore.getState();
        store.setTravelMode({ missedCheckIns: (store.travelMode.missedCheckIns || 0) + 1 });
        sendEmergencySMS('travel_missed');
      }
    };

    const interval = setInterval(checkMissed, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [estPayant, travelMode.active, travelMode.checkInMorning, travelMode.checkInEvening, travelMode.lastCheckIn, sendEmergencySMS]);

  // ── Garde onboarding ──────────────────────────────────────────────────
  if (!onboardingComplete) {
    return (
      <OnboardingView
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────
  const vues: Record<string, React.ReactNode> = {
    home:      <HomeView     onAlertTriggered={() => {}} />,
    settings:  <SettingsView />,
    contacts:  <ContactsView />,
    history:   <HistoryView />,
    upgrade:   <UpgradeView />,
    legal:     <LegalView onAccept={() => setView('home')} />,
    checklist: <ChecklistView />,
    sponsor:   <SponsorView />,
    'alzheimer-sponsor': <AlzheimerSponsorView />,
    admin:     adminSession ? <AdminView onBack={() => setView('settings')} /> : null,
    support:   <SupportView />,
    meeting:          <MeetingModeView />,
    travel:           <TravelModeView />,
    'emergency-numbers': <EmergencyNumbersView />,
    medical:          <MedicalProfileView />,
    journal:          <JournalView />,
    qrcode:           <QRCodeView />,
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      <PWAInstallBanner />
      <NetworkStatusBar />

      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{   opacity: 0, y: -8  }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {vues[currentView] ?? vues['home']}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav current={currentView} onChange={setView} />

      <AnimatePresence>
        {isAlertActive && (
          <AlertOverlay onDeactivate={() => setAlertActive(false)} onDuressAlert={() => sendEmergencySMS('duress')} />
        )}
      </AnimatePresence>

      <GuardianChat />
      <UpdateBanner />

    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — attrape les crashes et affiche un message au lieu d'écran noir
// ═══════════════════════════════════════════════════════════════════════════

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Vigilink-SOS] Crash:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#f5f5f5', padding: 24, textAlign: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span style={{ fontSize: 24 }}>⚠</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Vigilink-SOS</h2>
          <p style={{ fontSize: 13, color: '#999', maxWidth: 300 }}>
            An error occurred. Reload the page or clear the cache.
          </p>
          <pre style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '8px 16px', borderRadius: 12, maxWidth: '90vw', overflow: 'auto', border: '1px solid rgba(239,68,68,0.2)' }}>
            {this.state.error?.message}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 32px', borderRadius: 16, background: '#dc2626', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Reload
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
                if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
                window.location.reload();
              }}
              style={{ padding: '12px 32px', borderRadius: 16, background: '#333', color: '#fff', fontWeight: 700, border: '1px solid #555', cursor: 'pointer', fontSize: 13 }}
            >
              Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT RACINE : App — garde d'authentification uniquement
// ═══════════════════════════════════════════════════════════════════════════

const App: React.FC = () => {
  const { compteActif } = useAuthStore();
  const [langSelected, setLangSelected] = React.useState(
    () => localStorage.getItem('vigilink-language-selected') === 'true'
  );

  if (!langSelected) {
    return (
      <>
        <LanguageSelector onSelect={() => setLangSelected(true)} />
        <UpdateBanner />
      </>
    );
  }

  if (!compteActif) return (
    <>
      <LoginView />
      <UpdateBanner />
    </>
  );

  return (
    <ErrorBoundary>
      <AppCore />
    </ErrorBoundary>
  );
};

export default App;
const ChampTél = PhoneField;
type ChampTélProps = PhoneFieldProps;
export { ChampTél, SélecteurPays, PAYS_LISTE, paysPourE164, localDepuisE164 };
export type { Pays, ChampTélProps, SélecteurPaysProps };
