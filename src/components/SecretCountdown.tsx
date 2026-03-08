/**
 * SecretCountdown — Vigilink-SOS (refonte Gilles)
 *
 * Horloge de securite CENTRALE et VOYANTE.
 *
 * ARCHITECTURE :
 *   1. Horloge centree sous le bouton SOS — grande, lumineuse, impossible a rater
 *   2. PRO      → horloge Argent brillant avec glow argent
 *   3. PLATINUM → horloge Or brillant avec glow or scintillant
 *   4. Saisie libre du nombre de minutes (ex : 12 min)
 *   5. Persistance arriere-plan via Web Locks + horodatage absolu
 *   6. Alerte batterie critique : SOS immediat si niveau <= 1%
 *   7. Desactivation par code PIN
 *
 * PLANS :
 *   GRATUIT  → composant invisible
 *   PRO      → theme argent metalique, glow argent
 *   PLATINUM → theme or scintillant, glow or
 *
 * Admin : Gilles
 */

import React, {
  useState, useRef, useCallback, useId, useEffect,
} from 'react';
import {
  X, ShieldAlert, CheckCircle2,
  Crown, Star, Clock, EyeOff, Lock,
} from 'lucide-react';
import { useSecretCountdown } from '../hooks/useSecretCountdown';
import { useAppStore }        from '../store/useAppStore';
import { getGPSPosition, logAlert, normalisePhone, AlertResult } from '../lib/api';
import { useHaptics }         from '../hooks/useHaptics';
import { getBackgroundTimer, requestNotificationPermission } from '../lib/backgroundTimer';
import type { TimerEmergencyData } from '../lib/backgroundTimer';
import type { UserProfile, EmergencyContact, GPSPosition, AlertLog, QueuedAlert } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────

type Ecran = 'ferme' | 'saisie' | 'actif' | 'code';

// ── Formatage temps ───────────────────────────────────────────────────────────

function formaterTemps(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = secondes % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Horloge SVG animee ────────────────────────────────────────────────────────

interface HorlogeSVGProps {
  progression: number;
  isPlatinum:  boolean;
  taille?:     number;
  urgence?:    boolean;
}

const HorlogeSVG: React.FC<HorlogeSVGProps> = ({
  progression, isPlatinum, taille = 120, urgence = false,
}) => {
  const cx = 60;
  const cy = 60;
  const r  = 50;

  const angle = (1 - progression) * 360;
  const angleRad = ((angle - 90) * Math.PI) / 180;
  const aiguX = cx + 32 * Math.cos(angleRad);
  const aiguY = cy + 32 * Math.sin(angleRad);

  const circonf   = 2 * Math.PI * r;
  const dashArr   = circonf;
  const dashOff   = circonf * (1 - Math.max(0, Math.min(1, progression)));

  const couleurPrimaire = urgence
    ? '#f87171'
    : isPlatinum ? '#FFD700' : '#9CA3AF';

  const couleurArc = urgence
    ? '#ef4444'
    : isPlatinum ? '#D4AF37' : '#6B7280';

  const couleurFond = isPlatinum
    ? 'rgba(212,175,55,0.08)'
    : 'rgba(156,163,175,0.08)';

  const graduations = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = cx + 43 * Math.cos(a);
    const y1 = cy + 43 * Math.sin(a);
    const x2 = cx + (i % 3 === 0 ? 36 : 39) * Math.cos(a);
    const y2 = cy + (i % 3 === 0 ? 36 : 39) * Math.sin(a);
    return { x1, y1, x2, y2, gros: i % 3 === 0 };
  });

  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <filter id="lueurHorloge" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="flou" />
          <feMerge>
            <feMergeNode in="flou" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="fondHorloge" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={isPlatinum ? 'rgba(255,215,0,0.06)' : 'rgba(200,200,200,0.05)'} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r} fill="url(#fondHorloge)" stroke={couleurFond} strokeWidth="1.5" />

      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={couleurArc}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dashArr}`}
        strokeDashoffset={`${dashOff}`}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        filter="url(#lueurHorloge)"
        opacity="0.7"
      />

      {graduations.map((g, i) => (
        <line
          key={i}
          x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
          stroke={couleurPrimaire}
          strokeWidth={g.gros ? 2 : 1}
          opacity={g.gros ? 0.6 : 0.25}
        />
      ))}

      <line
        x1={cx} y1={cy}
        x2={aiguX} y2={aiguY}
        stroke={couleurPrimaire}
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#lueurHorloge)"
        style={{ transition: 'x2 0.5s ease, y2 0.5s ease' }}
      />

      <circle cx={cx} cy={cy} r="4" fill={couleurPrimaire} opacity="0.9" />
      <circle cx={cx} cy={cy} r="2" fill="#0f0f0f" />
    </svg>
  );
};

// ── Cadran central ────────────────────────────────────────────────────────────

interface CadranCentralProps {
  isPlatinum:        boolean;
  enCours:           boolean;
  secondesRestantes: number;
  urgence:           boolean;
  onClick:           () => void;
}

const CadranCentral: React.FC<CadranCentralProps> = ({
  isPlatinum, enCours, secondesRestantes, urgence, onClick,
}) => {
  const glowColor   = urgence
    ? 'rgba(239,68,68,0.55)'
    : isPlatinum
      ? 'rgba(255,215,0,0.45)'
      : 'rgba(192,192,192,0.35)';

  const borderColor = urgence
    ? 'border-red-500/60'
    : isPlatinum
      ? 'border-yellow-400/50'
      : 'border-gray-400/35';

  const bgColor = urgence
    ? 'bg-red-950/20'
    : isPlatinum
      ? 'bg-yellow-950/15'
      : 'bg-gray-950/10';

  const iconColor = urgence
    ? 'text-red-400'
    : isPlatinum
      ? 'text-yellow-300'
      : 'text-gray-300';

  const labelColor = urgence
    ? 'text-red-400'
    : isPlatinum
      ? 'text-yellow-300'
      : 'text-gray-300';

  const badgeLabel = isPlatinum ? 'PLATINUM' : 'PRO';
  const badgeCls   = isPlatinum
    ? 'border-yellow-400/40 bg-yellow-500/10 text-yellow-300'
    : 'border-gray-400/30 bg-gray-500/10 text-gray-300';

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={[
        'flex flex-col items-center justify-center gap-2',
        'w-full py-4 px-4 rounded-2xl border transition-all cursor-pointer',
        'active:scale-[0.97]',
        borderColor, bgColor,
        'relative overflow-hidden',
      ].join(' ')}
      style={{
        boxShadow: enCours || !urgence
          ? `0 0 24px 4px ${glowColor}, 0 0 8px 2px ${glowColor}`
          : `0 0 32px 8px ${glowColor}, 0 0 12px 4px ${glowColor}`,
      }}
      title="Compte a rebours de securite"
    >
      {isPlatinum && !urgence && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, transparent 50%, rgba(255,215,0,0.05) 100%)',
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <Clock size={28} className={iconColor} />
        <span className={`text-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>

      {enCours ? (
        <span className={`text-2xl font-black font-mono tabular-nums leading-none ${labelColor}`}>
          {formaterTemps(secondesRestantes)}
        </span>
      ) : (
        <span className={`text-xs font-bold ${labelColor} opacity-70`}>
          Compte à rebours de sécurité
        </span>
      )}

      <span className={`text-sm opacity-50 ${labelColor}`}>
        {enCours
          ? urgence ? 'Alerte imminente — entrez votre code !' : 'Appuyez pour désactiver'
          : 'Appuyez pour configurer'}
      </span>
    </button>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export const SecretCountdown: React.FC = () => {
  const {
    user, contacts, gpsPosition,
    setGPSPosition, setAlertActive, prependAlert, enqueueAlert,
  } = useAppStore();

  const isPro      = user.subscription === 'pro' || user.subscription === 'trial';
  const isPlatinum = user.subscription === 'platinum';
  const isEnabled  = isPro || isPlatinum;

  if (!isEnabled) return null;

  return (
    <SecretCountdownInterne
      isPlatinum={isPlatinum}
      user={user}
      contacts={contacts}
      gpsPosition={gpsPosition}
      setGPSPosition={setGPSPosition}
      setAlertActive={setAlertActive}
      prependAlert={prependAlert}
      enqueueAlert={enqueueAlert}
    />
  );
};

// ── Implementation interne ────────────────────────────────────────────────────

interface InterneProps {
  isPlatinum:     boolean;
  user:           UserProfile;
  contacts:       EmergencyContact[];
  gpsPosition:    GPSPosition | null;
  setGPSPosition: (pos: GPSPosition | null) => void;
  setAlertActive: (active: boolean) => void;
  prependAlert:   (alert: AlertLog) => void;
  enqueueAlert:   (alert: QueuedAlert) => void;
}

const SecretCountdownInterne: React.FC<InterneProps> = ({
  isPlatinum, user, contacts, gpsPosition,
  setGPSPosition, setAlertActive, prependAlert, enqueueAlert,
}) => {
  const { setPlatinumConfig } = useAppStore();
  const haptics = useHaptics();

  const isPro          = user.subscription === 'pro' || user.subscription === 'trial';
  const isProrPlatinum = isPro || isPlatinum;
  const modeDiscret    = isProrPlatinum && (user.platinumConfig?.modeDiscret ?? false);

  const toggleModeDiscret = () => {
    if (!isProrPlatinum) return;
    setPlatinumConfig({ modeDiscret: !modeDiscret });
  };

  const [ecran,      setEcran]      = useState<Ecran>('ferme');
  const [minutesStr, setMinutesStr] = useState('');
  const [codeInput,  setCodeInput]  = useState('');
  const [codeErr,    setCodeErr]    = useState(false);
  const [sosSent,    setSosSent]    = useState(false);
  const [raisonSOS,  setRaisonSOS]  = useState<'delai' | 'batterie'>('delai');

  const inputMinRef  = useRef<HTMLInputElement>(null);
  const inputCodeRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const declencherSOS = useCallback(async (raison: 'delai' | 'batterie') => {
    setRaisonSOS(raison);
    setSosSent(false);

    if (!modeDiscret) {
      try { navigator.vibrate?.([500, 150, 500, 150, 500]); } catch {}
    }

    setAlertActive(true);

    let gps = gpsPosition;
    try {
      gps = await getGPSPosition();
      setGPSPosition(gps);
    } catch {}

    const nums = contacts
      .map((c) => c.phone)
      .filter(Boolean)
      .map(normalisePhone);

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
          lang:          localStorage.getItem('vigilink-language') || 'fr',
          contactPhones: nums,
        },
        (file) => enqueueAlert(file)
      );
      if (modeDiscret && resultat.ok) {
        haptics.micro();
      }
    } catch {
      resultat = { ok: false, reason: 'network' };
    }

    setSosSent(resultat.ok);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatinum, modeDiscret, user, contacts, gpsPosition, setGPSPosition, setAlertActive, prependAlert, enqueueAlert, haptics]);

  // ── Hook de decompte ───────────────────────────────────────────────────────
  const countdown = useSecretCountdown({ onTrigger: () => declencherSOS('delai') });

  useEffect(() => {
    const stored = getBackgroundTimer('countdown');
    if (stored && stored.endTimestamp > Date.now()) {
      setEcran('actif');
    }
  }, []);

  // ── Focus automatique selon l'ecran ───────────────────────────────────────
  useEffect(() => {
    if (ecran === 'saisie') setTimeout(() => inputMinRef.current?.focus(), 120);
    if (ecran === 'code')   setTimeout(() => inputCodeRef.current?.focus(), 120);
  }, [ecran]);

  // ── Lancement du decompte ─────────────────────────────────────────────────
  const lancerDecompte = useCallback(() => {
    const mins = parseInt(minutesStr, 10);
    if (!mins || mins < 1 || mins > 1440) return;

    requestNotificationPermission();

    const nums = contacts
      .map((c) => c.phone)
      .filter(Boolean)
      .map(normalisePhone);

    const currentLang = localStorage.getItem('vigilink-language') || 'fr';
    const emergencyData: TimerEmergencyData = {
      userName: user.name + (isPlatinum ? ' | PLATINUM' : ' | PRO') + ' | Compte a rebours ecoule' + (modeDiscret ? ' | DISCRET' : ''),
      userPhone: user.phone,
      contactPhones: nums,
      gps: gpsPosition,
      triggerType: 'countdown',
      isPlatinum,
      modeDiscret,
      lang: currentLang,
    };

    countdown.start(mins * 60, emergencyData);
    setEcran('actif');
  }, [minutesStr, countdown, contacts, user, isPlatinum, modeDiscret, gpsPosition]);

  // ── Validation du code PIN ─────────────────────────────────────────────────
  const validerCode = useCallback(() => {
    const valide = codeInput === user.normalCode || codeInput === user.duressCode;
    if (valide) {
      countdown.cancel();
      setCodeInput('');
      setCodeErr(false);
      setEcran('ferme');
    } else {
      setCodeErr(true);
      setCodeInput('');
      setTimeout(() => setCodeErr(false), 2500);
    }
  }, [codeInput, user.normalCode, user.duressCode, countdown]);

  // ── Etats derives ─────────────────────────────────────────────────────────
  const enCours   = countdown.status === 'running';
  const urgence   = enCours && countdown.secondesRestantes > 0 && countdown.secondesRestantes <= 60;
  const estActif  = countdown.status === 'running';
  const declenche = countdown.status === 'triggered' || countdown.status === 'triggered_battery';
  const annule    = countdown.status === 'cancelled';

  const progression = countdown.dureeInitiale > 0
    ? countdown.secondesRestantes / countdown.dureeInitiale
    : 1;

  // ── Theme PRO (argent) / PLATINUM (or) ────────────────────────────────────
  const T = isPlatinum ? {
    border:    'border-yellow-500/25',
    bg:        'bg-yellow-950/15',
    bgPanel:   'bg-gradient-to-b from-yellow-950/70 via-zinc-950/95 to-zinc-950',
    text:      'text-yellow-300',
    textMuted: 'text-yellow-600/70',
    accent:    'text-yellow-400',
    btnPrim:   'bg-gradient-to-br from-yellow-500 to-amber-600 text-white',
    badge:     'border-yellow-400/30 bg-yellow-500/10 text-yellow-300',
    urgBorder: 'border-red-500/40 bg-red-950/25',
    icon:      <Star size={11} className="text-yellow-400" />,
    label:     'PLATINUM',
  } : {
    border:    'border-gray-500/20',
    bg:        'bg-gray-900/20',
    bgPanel:   'bg-gradient-to-b from-gray-900/80 via-zinc-950/95 to-zinc-950',
    text:      'text-gray-300',
    textMuted: 'text-gray-600',
    accent:    'text-gray-300',
    btnPrim:   'bg-gradient-to-br from-gray-500 to-gray-700 text-white',
    badge:     'border-gray-500/20 bg-gray-500/8 text-gray-400',
    urgBorder: 'border-red-500/40 bg-red-950/25',
    icon:      <Crown size={11} className="text-gray-400" />,
    label:     'PRO',
  };

  // ── Panneau actif unique ──────────────────────────────────────────────────
  const panneauActif: string | null = (() => {
    if (declenche) return 'declenche';
    if (annule)    return 'annule';
    if (ecran === 'saisie') return 'saisie';
    if (ecran === 'code')   return 'code';
    if (ecran === 'actif' && enCours) return 'actif';
    if (ecran === 'ferme' && enCours) return 'actif';
    return null;
  })();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panneauActif && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }, [panneauActif]);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full flex flex-col gap-3">

      <CadranCentral
        isPlatinum={isPlatinum}
        enCours={enCours}
        secondesRestantes={countdown.secondesRestantes}
        urgence={urgence}
        onClick={() => {
          if (declenche || annule) return;
          if (ecran === 'ferme') setEcran(enCours ? 'code' : 'saisie');
          else if (ecran === 'actif') setEcran('code');
          else setEcran('ferme');
        }}
      />

      <div ref={panelRef} className="w-full">

        {panneauActif === 'saisie' && (
          <div className={`w-full rounded-2xl border ${T.border} ${T.bg} p-5 flex flex-col gap-4 animate-fadeIn`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {T.icon}
                <span className={`text-xs font-black uppercase tracking-widest ${T.accent}`}>
                  {T.label}
                </span>
              </div>
              <button onClick={() => setEcran('ferme')} className="text-gray-600 hover:text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={uid + '-min'} className={`text-sm uppercase tracking-widest font-semibold ${T.textMuted}`}>
                Duree (minutes)
              </label>
              <input
                ref={inputMinRef}
                id={uid + '-min'}
                type="number"
                min={1}
                max={1440}
                value={minutesStr}
                onChange={(e) => setMinutesStr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lancerDecompte()}
                placeholder="Ex : 30"
                className="w-full rounded-xl bg-black/40 border border-white/10 text-white text-lg font-bold text-center py-3 px-4 placeholder:text-gray-700 focus:outline-none focus:border-red-500/50"
              />
            </div>

            {isProrPlatinum && (
              <button
                onClick={toggleModeDiscret}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-semibold ${
                  modeDiscret
                    ? 'border-slate-500/40 bg-slate-900/40 text-slate-300'
                    : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20'
                }`}
              >
                <EyeOff size={12} />
                Mode discret {modeDiscret ? 'actif' : 'inactif'}
              </button>
            )}

            <button
              onClick={lancerDecompte}
              disabled={!minutesStr || parseInt(minutesStr, 10) < 1}
              className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${T.btnPrim} disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Demarrer le compte a rebours
            </button>
          </div>
        )}

        {panneauActif === 'actif' && (
          <div className={`w-full rounded-2xl border ${urgence ? T.urgBorder : T.border} ${T.bg} p-5 flex flex-col items-center gap-4 animate-fadeIn`}>
            <div className="flex items-center gap-2">
              {T.icon}
              <span className={`text-sm font-black uppercase tracking-widest ${T.accent}`}>
                {T.label} — Compte a rebours actif
              </span>
            </div>

            <HorlogeSVG
              progression={progression}
              isPlatinum={isPlatinum}
              taille={120}
              urgence={urgence}
            />

            <span className={`text-3xl font-black font-mono tabular-nums ${urgence ? 'text-red-400' : T.text}`}>
              {formaterTemps(countdown.secondesRestantes)}
            </span>

            {modeDiscret && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-600/30 bg-slate-900/40">
                <EyeOff size={10} className="text-slate-400" />
                <span className="text-sm text-slate-400 font-semibold">DISCRET</span>
              </div>
            )}

            <button
              onClick={() => setEcran('code')}
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Lock size={12} className="inline mr-1.5 -mt-0.5" />
              Desactiver
            </button>
          </div>
        )}

        {panneauActif === 'code' && (
          <div className={`w-full rounded-2xl border ${T.border} ${T.bg} p-5 flex flex-col gap-4 animate-fadeIn`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={14} className={T.accent} />
                <span className={`text-xs font-black uppercase tracking-widest ${T.accent}`}>
                  Code de securite
                </span>
              </div>
              <button onClick={() => setEcran(enCours ? 'actif' : 'ferme')} className="text-gray-600 hover:text-gray-400">
                <X size={16} />
              </button>
            </div>

            <p className={`text-sm leading-relaxed ${T.textMuted}`}>
              Entrez votre code PIN pour desactiver le compte a rebours.
            </p>

            <input
              ref={inputCodeRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && validerCode()}
              placeholder="Code PIN"
              className={`w-full rounded-xl bg-black/40 border text-white text-xl font-bold text-center py-3 px-4 placeholder:text-gray-700 focus:outline-none transition-colors ${
                codeErr ? 'border-red-500/60 shake' : 'border-white/10 focus:border-red-500/50'
              }`}
            />

            {codeErr && (
              <p className="text-sm text-red-400 font-semibold text-center">
                Code incorrect — Reessayez
              </p>
            )}

            <button
              onClick={validerCode}
              disabled={codeInput.length < 4}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        )}

        {panneauActif === 'declenche' && (
          <div className="w-full rounded-2xl border border-red-500/40 bg-red-950/25 p-5 flex flex-col items-center gap-3 animate-fadeIn">
            <ShieldAlert size={32} className="text-red-400" />
            <span className="text-sm font-black text-red-400 uppercase tracking-wider">
              SOS Declenche
            </span>
            <p className="text-sm text-red-300/70 text-center leading-relaxed">
              {raisonSOS === 'batterie'
                ? 'Batterie critique — Alerte envoyee automatiquement.'
                : 'Compte a rebours ecoule — Alerte envoyee a vos contacts.'}
            </p>
            {sosSent && (
              <div className="flex items-center gap-1.5 text-green-400">
                <CheckCircle2 size={14} />
                <span className="text-sm font-bold">SMS envoyes avec succes</span>
              </div>
            )}
          </div>
        )}

        {panneauActif === 'annule' && (
          <div className={`w-full rounded-2xl border ${T.border} ${T.bg} p-4 flex items-center justify-center gap-2 animate-fadeIn`}>
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-xs font-bold text-green-400">Compte a rebours desactive</span>
          </div>
        )}

      </div>
    </div>
  );
};
