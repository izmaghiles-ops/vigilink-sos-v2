import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiOff, CheckCircle, AlertTriangle,
  Phone, Zap, Sparkles,
  Check, X, Star, Baby, Volume2, Users, ChevronDown, Shield,
} from 'lucide-react';
import { SOSButton }        from '../SOSButton';
import { PermissionModal }  from '../PermissionModal';
import { FakeCallScreen }   from '../FakeCallScreen';
import { SecretCountdown }  from '../SecretCountdown';
import { useAppStore }      from '../../store/useAppStore';
import { useHaptics }       from '../../hooks/useHaptics';
import { usePermissions }   from '../../hooks/usePermissions';
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor';
import { getGPSPosition, getCachedGPS, logAlert, normalisePhone, AlertResult } from '../../lib/api';
import { useTranslation }   from 'react-i18next';
import { v4 as uuidv4 }    from 'uuid';
import {
  saveBackgroundTimer,
  getBackgroundTimer,
  clearBackgroundTimer,
  getTimeRemaining,
  isTimerExpired,
  syncAllTimersToSW,
} from '../../lib/backgroundTimer';

interface HomeViewProps {
  onAlertTriggered: () => void;
}

type SendStatus =
  | 'idle' | 'sending' | 'sent' | 'queued'
  | 'error' | 'error_server' | 'error_no_contacts';

const STATUS_KEYS: Record<Exclude<SendStatus, 'idle'>, string> = {
  sending:           'home.sendStatus.sending',
  sent:              'home.sendStatus.sent',
  queued:            'home.sendStatus.queued',
  error:             'home.sendStatus.error',
  error_server:      'home.sendStatus.errorServer',
  error_no_contacts: 'home.sendStatus.errorNoContacts',
};

const StatusBanner: React.FC<{ status: SendStatus }> = ({ status }) => {
  const { t } = useTranslation();
  if (status === 'idle') return null;

  if (status === 'sending') {
    return (
      <motion.div
        className="flex items-center justify-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-5 text-lg text-gray-300"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
        {t('home.sendStatus.sending')}
      </motion.div>
    );
  }

  const isSent   = status === 'sent';
  const isQueued = status === 'queued';

  const cls = isSent
    ? 'border-green-500/30 bg-green-950/30 text-green-300'
    : isQueued
      ? 'border-amber-500/30 bg-amber-950/20 text-amber-300'
      : 'border-red-500/40 bg-red-950/30 text-red-300';

  const icon = isSent
    ? <CheckCircle size={22} className="shrink-0" />
    : isQueued
      ? <WifiOff size={22} className="shrink-0" />
      : <AlertTriangle size={22} className="shrink-0" />;

  return (
    <motion.div
      className={`flex items-center gap-3 w-full rounded-2xl border py-4 px-5 text-lg font-bold ${cls}`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
    >
      {icon}
      <span>{t(STATUS_KEYS[status])}</span>
    </motion.div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({ onAlertTriggered }) => {
  const { t, i18n } = useTranslation();
  const {
    user,
    isAlertActive,
    setAlertActive,
    gpsPosition,
    setGPSPosition,
    contacts,
    prependAlert,
    setView,
    enqueueAlert,
  } = useAppStore();

  const isPro      = user.subscription === 'pro' || user.subscription === 'trial';
  const isFree     = user.subscription === 'free';
  const isTrial    = user.subscription === 'trial';
  const isPlatinum = user.subscription === 'platinum';

  const numerosPourEnvoi = useMemo((): string[] => {
    if (isPro) {
      const proNums: string[] = [];
      if (user.proPhone1?.trim()) proNums.push(normalisePhone(user.proPhone1.trim()));
      if (user.proPhone2?.trim()) proNums.push(normalisePhone(user.proPhone2.trim()));
      if (proNums.length > 0) return proNums;
      return contacts.map((c) => c.phone).filter(Boolean).map(normalisePhone);
    }
    return contacts
      .filter((c) => c.priority === 'primary')
      .slice(0, 1)
      .map((c) => c.phone)
      .filter(Boolean)
      .map(normalisePhone);
  }, [isPro, user.proPhone1, user.proPhone2, contacts]);

  const haptics               = useHaptics();
  const { requestPermissions, showExplanation, confirmExplanation } = usePermissions();
  const { isOnline }          = useNetworkMonitor();

  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [plansOpen,  setPlansOpen]  = useState(false);

  const [fakeCallVisible,   setFakeCallVisible]   = useState(false);
  const [fakeCallCountdown, setFakeCallCountdown] = useState<number | null>(null);
  const fakeCallTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { fakeCallConfig, setFakeCallActive } = useAppStore();
  const primaryContact = contacts.find((c) => c.priority === 'primary') || contacts[0] || null;
  const callerName     = fakeCallConfig.callerName?.trim() || primaryContact?.name || t('common.unknown');
  const callerPhone    = fakeCallConfig.callerPhone?.trim() || primaryContact?.phone || '';

  useEffect(() => {
    syncAllTimersToSW();
    const stored = getBackgroundTimer('fakecall');
    if (stored) {
      if (stored.endTimestamp <= Date.now()) {
        clearBackgroundTimer('fakecall');
        setFakeCallVisible(true);
        setFakeCallActive(true);
      } else {
        const remaining = getTimeRemaining('fakecall');
        setFakeCallCountdown(remaining);
        const tick = () => {
          const r = getTimeRemaining('fakecall');
          if (r <= 0) {
            clearInterval(fakeCallTimer.current!);
            fakeCallTimer.current = null;
            clearBackgroundTimer('fakecall');
            setFakeCallCountdown(null);
            setFakeCallVisible(true);
            setFakeCallActive(true);
          } else {
            setFakeCallCountdown(r);
          }
        };
        fakeCallTimer.current = setInterval(tick, 1000);
      }
    }
    return () => {
      if (fakeCallTimer.current) {
        clearInterval(fakeCallTimer.current);
        fakeCallTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      syncAllTimersToSW();
      const stored = getBackgroundTimer('fakecall');
      if (!stored) return;
      if (isTimerExpired('fakecall')) {
        clearBackgroundTimer('fakecall');
        if (fakeCallTimer.current) {
          clearInterval(fakeCallTimer.current);
          fakeCallTimer.current = null;
        }
        setFakeCallCountdown(null);
        setFakeCallVisible(true);
        setFakeCallActive(true);
      } else {
        setFakeCallCountdown(getTimeRemaining('fakecall'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIMER_EXPIRED' && event.data.timerType === 'fakecall') {
        if (fakeCallTimer.current) {
          clearInterval(fakeCallTimer.current);
          fakeCallTimer.current = null;
        }
        setFakeCallCountdown(null);
        setFakeCallVisible(true);
        setFakeCallActive(true);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, []);

  const handleSOSTrigger = async () => {
    if (isAlertActive) return;

    if (contacts.length === 0) {
      haptics.tap();
      alert(t('sos.noContacts'));
      setView('contacts');
      return;
    }

    haptics.tap();
    setAlertActive(true, 'sos');
    setSendStatus('sending');

    let gps = getCachedGPS() || gpsPosition;
    try {
      gps = await getGPSPosition();
      setGPSPosition(gps);
    } catch {
    }

    prependAlert({
      id:          uuidv4(),
      userId:      user.id,
      triggerType: 'sos',
      latitude:    gps?.latitude,
      longitude:   gps?.longitude,
      mapsLink:    gps?.mapsLink,
      triggeredAt: Date.now(),
      status:      'pending',
    });

    let resultat: AlertResult;
    try {
      resultat = await logAlert(
        {
          userId:        user.id,
          userName:      user.name,
          userPhone:     user.phone,
          gps,
          lang:          i18n.language,
          contactPhones: numerosPourEnvoi,
        },
        (file) => enqueueAlert(file)
      );
    } catch {
      resultat = { ok: false, reason: 'network' };
    }

    if (resultat.ok) {
      haptics.success();
      setSendStatus('sent');
    } else {
      switch ((resultat as any).reason) {
        case 'queued':          setSendStatus('queued');             break;
        case 'no_contacts':     setSendStatus('error_no_contacts');  break;
        case 'server':          setSendStatus('error_server');       break;
        default:                setSendStatus('error');
      }
    }

    onAlertTriggered();
  };

  const handleFakeCall = () => {
    if (fakeCallTimer.current || fakeCallVisible) return;
    haptics.tap();

    const duration = fakeCallConfig.delaySeconds || 20;
    saveBackgroundTimer('fakecall', {
      endTimestamp: Date.now() + duration * 1000,
      duration,
      startedAt: Date.now(),
    });

    setFakeCallCountdown(duration);
    const tick = () => {
      const r = getTimeRemaining('fakecall');
      if (r <= 0) {
        clearInterval(fakeCallTimer.current!);
        fakeCallTimer.current = null;
        clearBackgroundTimer('fakecall');
        setFakeCallCountdown(null);
        setFakeCallVisible(true);
        setFakeCallActive(true);
      } else {
        setFakeCallCountdown(r);
      }
    };
    fakeCallTimer.current = setInterval(tick, 1000);
  };

  const handleFakeCallDecline = () => {
    setFakeCallVisible(false);
    setFakeCallActive(false);
    clearBackgroundTimer('fakecall');
    if (fakeCallTimer.current) {
      clearInterval(fakeCallTimer.current);
      fakeCallTimer.current = null;
    }
    setFakeCallCountdown(null);
  };

  const compteARebours = fakeCallCountdown !== null;

  return (
    <>
      <PermissionModal visible={showExplanation} onConfirm={confirmExplanation} />
      <FakeCallScreen
        visible={fakeCallVisible}
        callerName={callerName}
        callerPhone={callerPhone}
        onDecline={handleFakeCallDecline}
      />

      <div className="flex flex-col items-center gap-6 py-5 pb-12 w-full">

        <AnimatePresence>
          {!isOnline && (
            <motion.div
              className="w-full flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-950/30 py-4 px-5 text-lg font-bold text-red-300"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <WifiOff size={22} className="shrink-0" />
              {t('home.offlineBanner')}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-black tracking-[0.15em] text-white uppercase">Vigilink-SOS</h1>
          <p className="text-base text-gray-400 tracking-wider text-center font-medium">
            {t('app.tagline')}
          </p>
        </div>

        <motion.div
          className="flex flex-col items-center gap-5 py-3 w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <SOSButton onTrigger={handleSOSTrigger} isAlertActive={isAlertActive} />

          <AnimatePresence mode="wait">
            {sendStatus === 'idle' || sendStatus === 'sending' ? (
              <motion.p
                key="instruction"
                className="text-base text-gray-400 text-center max-w-64 leading-relaxed font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('home.sosInstruction')}
              </motion.p>
            ) : (
              <motion.div
                key="statut"
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <StatusBanner status={sendStatus} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {isTrial && (
          <motion.div
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-950/20 py-4 px-5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Sparkles size={20} className="text-sky-400 shrink-0" />
            <span className="text-lg font-bold text-sky-300">
              {t('home.trialBadge')}
            </span>
          </motion.div>
        )}

        <SecretCountdown />

        <button
          type="button"
          onClick={() => setView('emergency-numbers' as any)}
          className="btn-3d btn-3d-green flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-white text-lg font-bold tracking-wide"
        >
          <Shield size={24} className="shrink-0" />
          {t('emergencyNumbers.title')}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (compteARebours) {
              handleFakeCallDecline();
            } else {
              handleFakeCall();
            }
          }}
          disabled={fakeCallVisible}
          className={[
            'btn-3d flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-lg font-bold tracking-wide',
            compteARebours
              ? 'btn-3d-slate text-white'
              : 'btn-3d-slate text-gray-200',
          ].join(' ')}
        >
          <Phone size={24} className="shrink-0" />
          {compteARebours
            ? t('home.fakeCallCountdown', { seconds: fakeCallCountdown })
            : t('home.fakeCall')}
        </button>

        {!isPlatinum && (
          <motion.div
            className="w-full flex flex-col gap-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => setPlansOpen((o) => !o)}
              className="w-full flex items-center gap-3 py-4 group"
              aria-expanded={plansOpen}
            >
              <div className="flex-1 h-px bg-white/15 transition-colors group-hover:bg-white/25" />
              <span className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-widest px-2 group-hover:text-gray-200 transition-colors">
                {t('home.comparePlans')}
                <motion.span
                  animate={{ rotate: plansOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="inline-flex"
                >
                  <ChevronDown size={18} className="text-gray-400 group-hover:text-gray-300" />
                </motion.span>
              </span>
              <div className="flex-1 h-px bg-white/15 transition-colors group-hover:bg-white/25" />
            </button>

            <AnimatePresence initial={false}>
              {plansOpen && (
                <motion.div
                  key="plan-table"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-white/15 bg-white/[0.04] overflow-hidden mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/15">
                          <th className="text-left py-3 px-3 text-gray-400 font-bold uppercase tracking-wider">{t('home.planTable.feature')}</th>
                          <th className="text-center py-3 px-2 text-gray-300 font-black uppercase">{t('common.free')}</th>
                          <th className="text-center py-3 px-2 text-yellow-400 font-black uppercase">{t('common.pro')}</th>
                          <th className="text-center py-3 px-2 text-yellow-300 font-black uppercase">{t('common.platinum')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { labelKey: 'home.planTable.manualSos',          free: true,  pro: true,  plat: true  },
                          { labelKey: 'home.planTable.emergencyContacts',  free: '1',   pro: '5',   plat: '10' },
                          { labelKey: 'home.planTable.smsTwilio',          free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.highPrecisionGps',   free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.securityClock',      free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.medicalProfile',     free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.qrCode',             free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.meetingMode',        free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.travelMode',         free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.journal',            free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.sosWidget',           free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.earbudsSos',         free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.volumeSos',         free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.emergencyNumbers',   free: true,  pro: true,  plat: true  },
                          { labelKey: 'home.planTable.fakeCallCustom',     free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.fakeCallRingtone',   free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.guardianAI',         free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.googleAssistant',    free: false, pro: true,  plat: true  },
                          { labelKey: 'home.planTable.cloudSync',          free: true,  pro: true,  plat: true  },
                          { labelKey: 'settings.platinum.fallDetection',   free: false, pro: false, plat: true  },
                          { labelKey: 'settings.platinum.shaker',          free: false, pro: false, plat: true  },
                          { labelKey: 'settings.platinum.discreetMode',    free: false, pro: false, plat: true  },
                          { labelKey: 'home.planTable.familyPack',         free: false, pro: false, plat: true  },
                        ].map((row, i) => (
                          <tr key={row.labelKey} className={i % 2 === 0 ? 'bg-white/[0.03]' : ''}>
                            <td className="py-2.5 px-3 text-gray-300">{t(row.labelKey)}</td>
                            {[row.free, row.pro, row.plat].map((val, j) => (
                              <td key={j} className="text-center py-2.5 px-2">
                                {val === true ? (
                                  <Check size={18} className="text-green-400 mx-auto" />
                                ) : val === false ? (
                                  <X size={18} className="text-gray-600 mx-auto" />
                                ) : (
                                  <span className="text-sm font-bold text-white">{val}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t border-white/15 bg-white/[0.04]">
                          <td className="py-3 px-3 text-gray-400 font-bold text-base">{t('common.price')}</td>
                          <td className="text-center py-3 px-2 text-gray-300 font-black">0 $</td>
                          <td className="text-center py-3 px-2 text-yellow-400 font-black">9,99 $<span className="text-xs text-gray-500 font-normal">/{t('common.month')}</span></td>
                          <td className="text-center py-3 px-2 text-yellow-300 font-black">19,99 $<span className="text-xs text-gray-500 font-normal">/{t('common.month')}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => setView('upgrade')}
                    className="btn-3d btn-3d-gold w-full mt-4 py-4 rounded-2xl text-lg font-black uppercase tracking-wider"
                  >
                    {t('home.choosePlan')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </>
  );
};
