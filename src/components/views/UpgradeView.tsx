import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Clock, Users, Crown,
  Loader2, Lock, Globe, RefreshCw, CheckCircle, XCircle,
  Sparkles, Baby, Star, FlaskConical, DollarSign, ChevronDown,
  ArrowDownCircle, XOctagon, AlertTriangle, Settings,
} from 'lucide-react';
import { useAppStore }  from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { CheckoutErrorBanner } from '../CheckoutErrorBanner';
import {
  createCheckoutSession,
  createTrialCheckoutSession,
  parseCheckoutResult,
  clearCheckoutParams,
  verifyPendingCheckout,
  hasPendingCheckout,
} from '../../lib/stripe';
import { useTranslation } from 'react-i18next';

const IS_DEV = import.meta.env?.DEV === true;

const MOYENS_PAIEMENT = ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'Amex'];

type CurrencyCode = 'cad' | 'usd' | 'eur';

const CURRENCIES: { code: CurrencyCode; symbol: string; flag: string; label: string }[] = [
  { code: 'cad', symbol: 'CA$', flag: '🇨🇦', label: 'CAD' },
  { code: 'usd', symbol: '$',   flag: '🇺🇸', label: 'USD' },
  { code: 'eur', symbol: '€',   flag: '🇪🇺', label: 'EUR' },
];

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

function formatPrice(amount: number, currency: CurrencyCode): string {
  const c = CURRENCIES.find(cc => cc.code === currency)!;
  if (currency === 'eur') return `${amount.toFixed(2)} €`;
  return `${c.symbol}${amount.toFixed(2)}`;
}

function getSavedCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem('vigilink-currency');
    if (saved && ['cad', 'usd', 'eur'].includes(saved)) return saved as CurrencyCode;
  } catch {}
  return 'cad';
}

function CurrencySelector({ currency, onChange }: { currency: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        <DollarSign size={13} className="text-muted-foreground" />
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('upgrade.chooseCurrency')}</span>
      </div>
      <div className="flex items-center gap-2">
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            type="button"
            onClick={() => {
              onChange(c.code);
              try { localStorage.setItem('vigilink-currency', c.code); } catch {}
            }}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all',
              currency === c.code
                ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground',
            ].join(' ')}
          >
            <span>{c.flag}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {currency === 'cad' && (
        <span className="text-sm text-muted-foreground text-center">
          {t('upgrade.taxNotice')}
        </span>
      )}
    </div>
  );
}

function BadgePaiement({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-lg border border-border bg-card text-sm font-bold text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
  );
}

function LigneFeature({ libelle, inclus, couleur }: {
  libelle: string;
  inclus: boolean;
  couleur: 'gray' | 'yellow' | 'purple';
}) {
  const couleurCheck = couleur === 'purple'
    ? 'text-purple-600'
    : couleur === 'yellow'
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className="flex items-start gap-1.5">
      {inclus
        ? <Check size={10} className={`${couleurCheck} shrink-0 mt-0.5`} />
        : <X     size={10} className="text-muted-foreground/50 shrink-0 mt-0.5" />
      }
      <span className={`text-sm leading-tight ${inclus ? 'text-foreground' : 'text-muted-foreground'}`}>
        {libelle}
      </span>
    </div>
  );
}

function IconeHorloge({ plan }: { plan: 'pro' | 'platinum' }) {
  const { t } = useTranslation();
  const isPlatinum = plan === 'platinum';
  return (
    <span
      className="inline-flex items-center gap-1"
      title={isPlatinum ? t('upgrade.securityClockGold') : t('upgrade.securityClockSilver')}
    >
      <Clock
        size={10}
        style={{
          color: isPlatinum ? '#FFD700' : '#C0C0C0',
          filter: isPlatinum
            ? 'drop-shadow(0 0 3px rgba(255,215,0,0.6))'
            : 'drop-shadow(0 0 2px rgba(192,192,192,0.5))',
        }}
      />
    </span>
  );
}

function BanniereRetourCheckout({
  status,
  onDismiss,
}: {
  status: 'success' | 'cancelled';
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 7000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const ok = status === 'success';
  return (
    <motion.div
      className={[
        'rounded-2xl border p-4 flex items-start gap-3',
        ok ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50',
      ].join(' ')}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {ok
        ? <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
        : <XCircle     size={16} className="text-orange-600 shrink-0 mt-0.5" />
      }
      <div className="flex flex-col gap-0.5">
        <span className={`text-xs font-bold ${ok ? 'text-green-700' : 'text-orange-700'}`}>
          {ok ? t('upgrade.paymentConfirmed') : t('upgrade.paymentCancelled')}
        </span>
        <span className="text-sm text-muted-foreground leading-relaxed">
          {ok ? t('upgrade.paymentConfirmedDesc') : t('upgrade.paymentCancelledDesc')}
        </span>
      </div>
    </motion.div>
  );
}

function ColonneGratuit({ onGratuit, estAdmin, currentPlan }: { onGratuit?: () => void; estAdmin?: boolean; currentPlan?: string }) {
  const { t } = useTranslation();
  const estActuel = currentPlan === 'free';

  const fonctionnalites = [
    { cle: 'sos',      libelle: t('upgrade.freePlan.sosManu'),      inclus: true  },
    { cle: 'contact1', libelle: t('upgrade.freePlan.oneContact'),   inclus: true  },
    { cle: 'gps',      libelle: t('upgrade.freePlan.basicGps'),     inclus: true  },
    { cle: 'urgences', libelle: t('home.planTable.emergencyNumbers'), inclus: true },
    { cle: 'cloudSync', libelle: t('home.planTable.cloudSync'),    inclus: true  },
    { cle: 'smstw',    libelle: t('home.planTable.smsTwilio'),     inclus: false },
    { cle: 'horloge',  libelle: t('upgrade.freePlan.securityClock'),inclus: false },
    { cle: 'medical',  libelle: t('home.planTable.medicalProfile'), inclus: false },
    { cle: 'fakecall', libelle: t('home.planTable.fakeCallCustom'), inclus: false },
    { cle: 'fakeRing', libelle: t('home.planTable.fakeCallRingtone'), inclus: false },
    { cle: 'alzSponsor', libelle: t('home.planTable.alzheimerSponsor'), inclus: false },
    { cle: 'famille',  libelle: t('upgrade.freePlan.familyPack'),   inclus: false },
  ];

  return (
    <motion.div
      className={`flex flex-col gap-3 rounded-2xl border ${estActuel && estAdmin ? 'border-green-300 bg-green-50' : 'border-border bg-card'} p-4 min-w-[140px] flex-1`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
    >
      {estActuel && estAdmin && (
        <span className="text-xs font-black text-green-600 uppercase tracking-wider text-center">{t('upgrade.currentPlan')}</span>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">
          {t('upgrade.freePlan.name')}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-foreground">{t('upgrade.freePlan.price')}</span>
        </div>
        <span className="text-sm text-muted-foreground mt-0.5">{t('upgrade.basicAccess')}</span>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2 flex-1">
        {fonctionnalites.map(({ cle, libelle, inclus }) => (
          <LigneFeature key={cle} libelle={libelle} inclus={inclus} couleur="gray" />
        ))}
      </div>

      <button
        className={`w-full mt-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${estActuel && estAdmin ? 'border-green-300 bg-green-50 text-green-600' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground'}`}
        onClick={() => { if (onGratuit) onGratuit(); }}
      >
        {estActuel && estAdmin ? t('upgrade.activePlan') : estAdmin ? t('upgrade.switchToFree') : t('upgrade.stayFree')}
      </button>
    </motion.div>
  );
}

function ColonnePro({
  chargementEssai,
  chargementAbonnement,
  onEssai,
  onAbonnement,
  estAdmin,
  currentPlan,
}: {
  chargementEssai: boolean;
  chargementAbonnement: boolean;
  onEssai: () => void;
  onAbonnement: () => void;
  estAdmin?: boolean;
  currentPlan?: string;
}) {
  const { t } = useTranslation();
  const enChargement = chargementEssai || chargementAbonnement;
  const estActuel = currentPlan === 'pro';

  const fonctionnalites = [
    { cle: 'sos',      libelle: t('upgrade.proPlan.sosManu'),              inclus: true  },
    { cle: 'contacts', libelle: t('upgrade.proPlan.fiveContacts'),         inclus: true  },
    { cle: 'gps',      libelle: t('upgrade.proPlan.gpsHigh'),             inclus: true  },
    { cle: 'horloge',  libelle: t('upgrade.proPlan.securityClockSilver'), inclus: true  },
    { cle: 'smstw',    libelle: t('home.planTable.smsTwilio'),             inclus: true  },
    { cle: 'medical',  libelle: t('home.planTable.medicalProfile'),       inclus: true  },
    { cle: 'qrcode',   libelle: t('home.planTable.qrCode'),              inclus: true  },
    { cle: 'meeting',  libelle: t('home.planTable.meetingMode'),          inclus: true  },
    { cle: 'travel',   libelle: t('home.planTable.travelMode'),           inclus: true  },
    { cle: 'journal',  libelle: t('home.planTable.journal'),              inclus: true  },
    { cle: 'earbuds',  libelle: t('home.planTable.earbudsSos'),           inclus: true  },
    { cle: 'volume',   libelle: t('home.planTable.volumeSos'),            inclus: true  },
    { cle: 'fakecall', libelle: t('home.planTable.fakeCallCustom'),      inclus: true  },
    { cle: 'fakeRing', libelle: t('home.planTable.fakeCallRingtone'),    inclus: true  },
    { cle: 'guardian', libelle: t('home.planTable.guardianAI'),           inclus: true  },
    { cle: 'assistant', libelle: t('home.planTable.googleAssistant'),     inclus: true  },
    { cle: 'cloudSync', libelle: t('home.planTable.cloudSync'),           inclus: true  },
    { cle: 'alzSponsor', libelle: t('home.planTable.alzheimerSponsor'), inclus: false },
    { cle: 'famille',  libelle: t('upgrade.proPlan.familyPack'),          inclus: false },
  ];

  return (
    <motion.div
      className={`flex flex-col gap-3 rounded-2xl border ${estActuel && estAdmin ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'} p-4 min-w-[140px] flex-1 relative`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="px-2.5 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-xs font-black text-yellow-700 uppercase tracking-wider whitespace-nowrap">
          {t('upgrade.trial24h')}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 mt-1">
        <span className="text-sm font-black text-yellow-600 uppercase tracking-widest">
          {t('upgrade.proPlan.name')}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-foreground">{t('upgrade.proPlan.price')}</span>
          <span className="text-sm text-muted-foreground">{t('upgrade.proPlan.period')}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <IconeHorloge plan="pro" />
          <span className="text-xs font-bold" style={{ color: '#C0C0C0' }}>
            {t('upgrade.securityClockIncluded')}
          </span>
        </div>
      </div>

      <div className="h-px bg-yellow-200" />

      <div className="flex flex-col gap-2 flex-1">
        {fonctionnalites.map(({ cle, libelle, inclus }) => (
          <LigneFeature key={cle} libelle={libelle} inclus={inclus} couleur="yellow" />
        ))}
      </div>

      {estAdmin ? (
        <motion.button
          onClick={onEssai}
          className={`w-full mt-2 py-2.5 px-3 rounded-xl font-black text-sm transition-all ${estActuel ? 'bg-green-50 border border-green-300 text-green-600' : 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg shadow-yellow-200/40 hover:brightness-110'}`}
          whileTap={{ scale: 0.97 }}
        >
          {estActuel ? t('upgrade.activePlan') : t('upgrade.activatePro')}
        </motion.button>
      ) : (
        <>
          <motion.button
            onClick={onEssai}
            disabled={enChargement}
            className={[
              'relative w-full flex items-center justify-center gap-1.5 mt-2',
              'py-2.5 px-3 rounded-xl font-black text-sm overflow-hidden select-none',
              chargementEssai
                ? 'bg-sky-200 text-sky-600 cursor-wait'
                : 'bg-gradient-to-r from-sky-600 via-indigo-500 to-sky-600 text-white shadow-lg shadow-sky-200/40 hover:brightness-110 transition-all',
            ].join(' ')}
            whileTap={enChargement ? {} : { scale: 0.97 }}
          >
            {chargementEssai && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                animate={{ x: ['-100%', '220%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              />
            )}
            {chargementEssai
              ? <><Loader2 size={11} className="animate-spin shrink-0" /><span>Stripe…</span></>
              : <><Sparkles size={11} className="shrink-0" /><span>{t('upgrade.tryPro')}</span></>
            }
          </motion.button>

          <motion.button
            onClick={onAbonnement}
            disabled={enChargement}
            className={[
              'w-full flex items-center justify-center gap-1.5',
              'py-2 px-3 rounded-xl font-bold text-sm border transition-all',
              chargementAbonnement
                ? 'border-yellow-300 text-yellow-600 cursor-wait'
                : 'border-yellow-400 text-yellow-600 hover:border-yellow-500 hover:bg-yellow-50',
            ].join(' ')}
            whileTap={enChargement ? {} : { scale: 0.98 }}
          >
            {chargementAbonnement
              ? <><Loader2 size={10} className="animate-spin shrink-0" /><span>Stripe…</span></>
              : <><Crown size={10} className="shrink-0" /><span>{t('upgrade.subscribePro')}</span></>
            }
          </motion.button>
        </>
      )}
    </motion.div>
  );
}

function ColonnePlatinum({ onPlatinum, estAdmin, currentPlan }: { onPlatinum: () => void; estAdmin?: boolean; currentPlan?: string }) {
  const { t } = useTranslation();
  const estActuel = currentPlan === 'platinum';

  const fonctionnalites = [
    { cle: 'sos',      libelle: t('upgrade.platinumPlan.sosManu'),           inclus: true },
    { cle: 'contacts', libelle: t('upgrade.platinumPlan.tenContacts'),       inclus: true },
    { cle: 'enfants',  libelle: t('upgrade.platinumPlan.childCodes'),        inclus: true },
    { cle: 'horloge',  libelle: t('upgrade.platinumPlan.securityClockGold'), inclus: true },
    { cle: 'smstw',    libelle: t('home.planTable.smsTwilio'),               inclus: true },
    { cle: 'gps',      libelle: t('upgrade.platinumPlan.gpsHigh'),           inclus: true },
    { cle: 'medical',  libelle: t('home.planTable.medicalProfile'),          inclus: true },
    { cle: 'qrcode',   libelle: t('home.planTable.qrCode'),                 inclus: true },
    { cle: 'meeting',  libelle: t('home.planTable.meetingMode'),             inclus: true },
    { cle: 'travel',   libelle: t('home.planTable.travelMode'),              inclus: true },
    { cle: 'journal',  libelle: t('home.planTable.journal'),                 inclus: true },
    { cle: 'earbuds',  libelle: t('home.planTable.earbudsSos'),              inclus: true },
    { cle: 'volume',   libelle: t('home.planTable.volumeSos'),               inclus: true },
    { cle: 'fakecall', libelle: t('home.planTable.fakeCallCustom'),          inclus: true },
    { cle: 'fakeRing', libelle: t('home.planTable.fakeCallRingtone'),        inclus: true },
    { cle: 'chute',    libelle: t('settings.platinum.fallDetection'),        inclus: true },
    { cle: 'secousse', libelle: t('settings.platinum.shaker'),               inclus: true },
    { cle: 'discret',  libelle: t('settings.platinum.discreetMode'),         inclus: true },
    { cle: 'guardian', libelle: t('home.planTable.guardianAI'),              inclus: true },
    { cle: 'assistant', libelle: t('home.planTable.googleAssistant'),        inclus: true },
    { cle: 'cloudSync', libelle: t('home.planTable.cloudSync'),              inclus: true },
    { cle: 'alzSponsor', libelle: t('home.planTable.alzheimerSponsor'),    inclus: true },
  ];

  return (
    <motion.div
      className={`flex flex-col gap-3 rounded-2xl border ${estActuel && estAdmin ? 'border-green-300 bg-green-50' : 'border-purple-300 bg-purple-50'} p-4 min-w-[140px] flex-1 relative`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="px-2.5 py-1 rounded-full bg-purple-100 border border-purple-300 text-xs font-black text-purple-600 uppercase tracking-wider whitespace-nowrap">
          {t('upgrade.platinumPlan.name')}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 mt-1">
        <span className="text-sm font-black text-purple-600 uppercase tracking-widest">
          {t('upgrade.platinumPlan.name')}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-foreground">{t('upgrade.platinumPlan.price')}</span>
          <span className="text-sm text-muted-foreground">{t('upgrade.platinumPlan.period')}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <IconeHorloge plan="platinum" />
          <span className="text-xs font-bold" style={{ color: '#FFD700' }}>
            {t('upgrade.securityClockIncluded')}
          </span>
        </div>
      </div>

      <div className="h-px bg-purple-200" />

      <div className="flex flex-col gap-2 flex-1">
        {fonctionnalites.map(({ cle, libelle, inclus }) => (
          <LigneFeature key={cle} libelle={libelle} inclus={inclus} couleur="purple" />
        ))}
      </div>

      <motion.button
        onClick={onPlatinum}
        className={`relative w-full flex items-center justify-center gap-1.5 mt-1 py-2.5 px-3 rounded-xl font-black text-sm overflow-hidden select-none transition-all ${estActuel && estAdmin ? 'bg-green-50 border border-green-300 text-green-600' : 'bg-gradient-to-r from-purple-700 via-violet-600 to-purple-700 text-white shadow-lg shadow-purple-200/40 hover:brightness-110'}`}
        whileTap={{ scale: 0.97 }}
      >
        <Star size={11} className="shrink-0" />
        <span>{estActuel && estAdmin ? t('upgrade.activePlan') : estAdmin ? t('upgrade.activatePlatinum') : t('upgrade.goFamilyPack')}</span>
      </motion.button>
    </motion.div>
  );
}

function ScrollableComparison({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      const isOverflowing = el.scrollHeight > el.clientHeight + 40;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      setShowScroll(isOverflowing && !isNearBottom);
    };
    check();
    el.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    const timer = setTimeout(check, 500);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); clearTimeout(timer); };
  }, []);

  const handleScroll = () => {
    containerRef.current?.scrollBy({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div ref={containerRef} style={{ maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>
        {children}
      </div>
      <AnimatePresence>
        {showScroll && (
          <motion.button
            onClick={handleScroll}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600/90 text-white text-xs font-bold shadow-lg shadow-purple-900/50 backdrop-blur-sm border border-purple-400/30 hover:bg-purple-500/90 transition-all z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronDown size={14} /> {t('common.next') || 'Suivant'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function isAdmin(): boolean {
  return useAppStore.getState().adminSession;
}

export const UpgradeView: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAppStore();
  const { changerPlan }   = useAuthStore();
  const isPro      = user.subscription === 'pro';
  const isPlatinum = user.subscription === 'platinum';
  const estActif   = isPro || isPlatinum;
  const estAdmin   = isAdmin();

  const [chargementEssai,      setChargementEssai]      = useState(false);
  const [chargementAbonnement, setChargementAbonnement] = useState(false);
  const [messageErreur,        setMessageErreur]        = useState<string | null>(null);
  const [statutRetour,         setStatutRetour]         = useState<'success' | 'cancelled' | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(getSavedCurrency);

  useEffect(() => {
    const cr = useAppStore.getState()._checkoutReturn;
    if (cr) {
      setStatutRetour(cr);
      useAppStore.setState({ _checkoutReturn: null });
      return;
    }
    const result = parseCheckoutResult();
    if (result.status === 'success') {
      setStatutRetour('success');
      const plan = (result.plan === 'platinum' ? 'platinum' : 'pro') as 'pro' | 'platinum';
      setUser({ subscription: plan });
      changerPlan(plan);
      clearCheckoutParams();
    } else if (result.status === 'cancelled') {
      setStatutRetour('cancelled');
      clearCheckoutParams();
    }
  }, [setUser, changerPlan]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform() || cancelled) return;
        const { Browser } = await import('@capacitor/browser');
        const handler = await Browser.addListener('browserFinished', async () => {
          if (!hasPendingCheckout()) return;
          const result = await verifyPendingCheckout();
          if (result.status === 'success') {
            setStatutRetour('success');
            const plan = (result.plan === 'platinum' ? 'platinum' : 'pro') as 'pro' | 'platinum';
            setUser({ subscription: plan });
            changerPlan(plan);
            setChargementEssai(false);
            setChargementAbonnement(false);
          } else if (result.status === 'cancelled') {
            setStatutRetour('cancelled');
            setChargementEssai(false);
            setChargementAbonnement(false);
          }
        });
        cleanup = () => handler.remove();
      } catch {}
    })();

    return () => { cancelled = true; cleanup?.(); };
  }, [setUser, changerPlan]);

  const gererErreurStripe = (err: unknown) => {
    const e = err as { message?: string };
    const horsLigne = !navigator.onLine || e?.message?.includes('Failed to fetch');
    setMessageErreur(
      horsLigne
        ? t('upgrade.noConnection')
        : e?.message || t('upgrade.unexpectedError')
    );
  };

  const adminSwitchPlan = useCallback((plan: 'free' | 'pro' | 'platinum') => {
    setUser({ subscription: plan });
    changerPlan(plan);
    setStatutRetour('success');
  }, [setUser, changerPlan]);

  const handleEssai = useCallback(async () => {
    if (estAdmin) { adminSwitchPlan('pro'); return; }
    if (chargementEssai || chargementAbonnement || isPro) return;
    setChargementEssai(true);
    setMessageErreur(null);
    try {
      await createTrialCheckoutSession({ userId: user.id, userEmail: user.phone || undefined }, undefined, currency);
    } catch (err) {
      setChargementEssai(false);
      gererErreurStripe(err);
    }
  }, [estAdmin, adminSwitchPlan, chargementEssai, chargementAbonnement, isPro, user.id, user.phone, currency]);

  const handleAbonnement = useCallback(async () => {
    if (estAdmin) { adminSwitchPlan('pro'); return; }
    if (chargementEssai || chargementAbonnement || isPro) return;
    setChargementAbonnement(true);
    setMessageErreur(null);
    try {
      await createCheckoutSession({ userId: user.id, userEmail: user.phone || undefined }, undefined, 'pro', currency);
    } catch (err) {
      setChargementAbonnement(false);
      gererErreurStripe(err);
    }
  }, [estAdmin, adminSwitchPlan, chargementEssai, chargementAbonnement, isPro, user.id, user.phone, currency]);

  const handlePlatinum = useCallback(async () => {
    if (estAdmin) { adminSwitchPlan('platinum'); return; }
    if (chargementEssai || chargementAbonnement || isPlatinum) return;
    setChargementAbonnement(true);
    setMessageErreur(null);
    try {
      await createCheckoutSession({ userId: user.id, userEmail: user.phone || undefined }, undefined, 'platinum', currency);
    } catch (err) {
      setChargementAbonnement(false);
      gererErreurStripe(err);
    }
  }, [estAdmin, adminSwitchPlan, chargementEssai, chargementAbonnement, isPlatinum, user.id, user.phone, currency]);

  const handleGratuit = useCallback(() => {
    if (estAdmin) { adminSwitchPlan('free'); }
  }, [estAdmin, adminSwitchPlan]);

  const [restoring, setRestoring] = useState(false);
  const handleRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    setMessageErreur(null);
    try {
      const { apiUrl } = await import('../../lib/apiBase');
      const resp = await fetch(apiUrl('/api/checkout/restore'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await resp.json();
      if (data.ok && data.found) {
        const plan = (data.plan === 'platinum' ? 'platinum' : 'pro') as 'pro' | 'platinum';
        setUser({ subscription: plan });
        changerPlan(plan);
        setStatutRetour('success');
      } else {
        setMessageErreur(t('upgrade.restoreNotFound'));
      }
    } catch {
      setMessageErreur(t('upgrade.noConnection'));
    }
    setRestoring(false);
  }, [restoring, user.id, setUser, changerPlan, t]);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [manageMessage, setManageMessage] = useState<string | null>(null);

  const handleCancel = useCallback(() => {
    setUser({ subscription: 'free' });
    changerPlan('free');
    setShowCancelConfirm(false);
    setManageMessage(t('upgrade.cancelSuccess'));
    setTimeout(() => setManageMessage(null), 5000);
  }, [setUser, changerPlan, t]);

  const handleDowngrade = useCallback(() => {
    setUser({ subscription: 'pro' });
    changerPlan('pro');
    setShowDowngradeConfirm(false);
    setManageMessage(t('upgrade.downgradeSuccess'));
    setTimeout(() => setManageMessage(null), 5000);
  }, [setUser, changerPlan, t]);

  const handleRetry = useCallback(() => {
    setMessageErreur(null);
    handleEssai();
  }, [handleEssai]);

  return (
    <>
      <CheckoutErrorBanner
        message={messageErreur}
        onDismiss={() => setMessageErreur(null)}
        onRetry={handleRetry}
      />

      <div className="flex flex-col gap-5 py-2">

        <motion.div
          className="flex flex-col items-center gap-2 pt-3 pb-1"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-yellow-500" />
            <h2 className="text-xl font-black text-foreground tracking-tight">{t('upgrade.chooseProtection')}</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[300px]">
            {t('upgrade.chooseProtectionDesc')}
          </p>
        </motion.div>

        <AnimatePresence>
          {statutRetour && (
            <BanniereRetourCheckout
              status={statutRetour}
              onDismiss={() => setStatutRetour(null)}
            />
          )}
        </AnimatePresence>

        {IS_DEV && (
          <motion.div
            className="flex items-center gap-2.5 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FlaskConical size={13} className="text-yellow-600 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-black text-yellow-700 uppercase tracking-wider">
                {t('upgrade.testMode')}
              </span>
              <span className="text-sm text-yellow-600 leading-relaxed">
                {t('upgrade.testModeDesc')}
                {' '}<span className="font-mono text-yellow-700">4242 4242 4242 4242</span>
              </span>
            </div>
          </motion.div>
        )}

        {estAdmin && (
          <motion.div
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-300 bg-red-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Crown size={14} className="text-red-600" />
            <span className="text-sm font-black text-red-600 uppercase tracking-wider">
              {t('upgrade.adminMode')}
            </span>
          </motion.div>
        )}

        {estActif && !estAdmin && (
          <motion.div className="flex flex-col gap-4"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={[
              'flex items-center justify-center gap-2.5 py-4 rounded-2xl border font-black text-sm',
              isPlatinum
                ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                : 'border-green-300 bg-green-50 text-green-600',
            ].join(' ')}>
              <Crown size={16} />
              {isPlatinum ? t('upgrade.platinumActive') : t('upgrade.proActive')}
            </div>

            <AnimatePresence>
              {manageMessage && (
                <motion.div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-green-300 bg-green-50"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-bold">{manageMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">{t('upgrade.manageSubscription')}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('upgrade.manageSubscriptionDesc')}</p>

              <div className="flex flex-col gap-2">
                {isPlatinum && (
                  <motion.button whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDowngradeConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-bold text-xs hover:bg-yellow-100 transition-all">
                    <ArrowDownCircle size={14} /> {t('upgrade.downgradeToProTitle')}
                  </motion.button>
                )}

                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all">
                  <XOctagon size={14} /> {t('upgrade.cancelSubscription')}
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showDowngradeConfirm && (
                <motion.div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 flex flex-col gap-3"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
                    <span className="text-xs font-bold text-yellow-700">{t('upgrade.downgradeToProTitle')}</span>
                  </div>
                  <p className="text-xs text-yellow-600 leading-relaxed">{t('upgrade.downgradeToProDesc')}</p>
                  <div className="flex gap-2">
                    <button onClick={handleDowngrade}
                      className="flex-1 py-2.5 rounded-xl bg-yellow-600 text-white text-xs font-bold hover:bg-yellow-500 transition-colors">
                      {t('common.confirm')}
                    </button>
                    <button onClick={() => setShowDowngradeConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-colors">
                      {t('common.cancel')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCancelConfirm && (
                <motion.div className="rounded-2xl border border-red-300 bg-red-50 p-4 flex flex-col gap-3"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-600 shrink-0" />
                    <span className="text-xs font-bold text-red-700">{t('upgrade.cancelSubscription')}</span>
                  </div>
                  <p className="text-xs text-red-600 leading-relaxed">{t('upgrade.cancelConfirm')}</p>
                  <div className="flex gap-2">
                    <button onClick={handleCancel}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors">
                      {t('common.confirm')}
                    </button>
                    <button onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-colors">
                      {t('common.cancel')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {!estActif && !estAdmin && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRestore}
            disabled={restoring}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-300 bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            {restoring ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {t('upgrade.restorePurchase')}
          </motion.button>
        )}

        {(!isPlatinum || estAdmin) && (
          <CurrencySelector currency={currency} onChange={setCurrency} />
        )}

        {(!isPlatinum || estAdmin) && (
          <ScrollableComparison>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              <ColonneGratuit onGratuit={estAdmin ? handleGratuit : undefined} estAdmin={estAdmin} currentPlan={user.subscription} />
              <ColonnePro
                chargementEssai={chargementEssai}
                chargementAbonnement={chargementAbonnement}
                onEssai={handleEssai}
                onAbonnement={handleAbonnement}
                estAdmin={estAdmin}
                currentPlan={user.subscription}
              />
              <ColonnePlatinum onPlatinum={handlePlatinum} estAdmin={estAdmin} currentPlan={user.subscription} />
            </div>
          </ScrollableComparison>
        )}

        {(!isPlatinum || estAdmin) && currency === 'cad' && (
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3 flex flex-col gap-2">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{t('upgrade.taxSummary')}</span>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-foreground">PRO</span>
              <span className="text-foreground text-right">{formatPrice(9.99, 'cad')}</span>
              <span className="text-muted-foreground pl-2">+ TPS (5%)</span>
              <span className="text-muted-foreground text-right">{formatPrice(9.99 * TPS_RATE, 'cad')}</span>
              <span className="text-muted-foreground pl-2">+ TVQ (9.975%)</span>
              <span className="text-muted-foreground text-right">{formatPrice(9.99 * TVQ_RATE, 'cad')}</span>
              <span className="text-blue-700 font-bold">{t('upgrade.totalPro')}</span>
              <span className="text-blue-700 font-bold text-right">{formatPrice(9.99 * (1 + TPS_RATE + TVQ_RATE), 'cad')}{t('upgrade.perMonth')}</span>

              <div className="col-span-2 h-px bg-blue-200 my-1" />

              <span className="text-foreground">PLATINUM</span>
              <span className="text-foreground text-right">{formatPrice(19.99, 'cad')}</span>
              <span className="text-muted-foreground pl-2">+ TPS (5%)</span>
              <span className="text-muted-foreground text-right">{formatPrice(19.99 * TPS_RATE, 'cad')}</span>
              <span className="text-muted-foreground pl-2">+ TVQ (9.975%)</span>
              <span className="text-muted-foreground text-right">{formatPrice(19.99 * TVQ_RATE, 'cad')}</span>
              <span className="text-purple-700 font-bold">{t('upgrade.totalPlatinum')}</span>
              <span className="text-purple-700 font-bold text-right">{formatPrice(19.99 * (1 + TPS_RATE + TVQ_RATE), 'cad')}{t('upgrade.perMonth')}</span>
            </div>
          </div>
        )}

        {!estActif && !estAdmin && (
          <p className="text-sm text-muted-foreground text-center leading-relaxed px-2">
            {t('upgrade.proTrialInfo')}
          </p>
        )}

        {!estActif && !estAdmin && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {MOYENS_PAIEMENT.map((m) => (
              <BadgePaiement key={m} label={m} />
            ))}
          </div>
        )}

        {!estActif && !estAdmin && (
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icone: <Lock size={13} />,      texte: t('upgrade.ssl') },
                { icone: <Globe size={13} />,     texte: t('upgrade.stripeIntl') },
                { icone: <RefreshCw size={13} />, texte: t('upgrade.noCommitment') },
              ].map(({ icone, texte }) => (
                <div key={texte} className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-muted-foreground">{icone}</span>
                  <span className="text-sm text-muted-foreground leading-tight whitespace-pre-line">{texte}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed pt-2 border-t border-border">
              {t('upgrade.stripeDisclaimer')}
            </p>
          </div>
        )}

        {!estActif && import.meta.env?.DEV && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-3 flex flex-col gap-1">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
              {t('upgrade.testCard')}
            </span>
            <span className="text-sm text-blue-700 font-mono">4242 4242 4242 4242</span>
            <span className="text-sm text-muted-foreground">
              {t('upgrade.testCardDate')}
            </span>
          </div>
        )}

      </div>
    </>
  );
};
