import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '../hooks/useHaptics';
import { useTranslation } from 'react-i18next';

interface SOSButtonProps {
  onTrigger: () => void;
  isAlertActive: boolean;
  disabled?: boolean;
}

const DUREE_MAINTIEN_MS = 1000;

interface Onde  { id: number; x: number; y: number; }
interface Ripple { id: number; x: number; y: number; }

export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger, isAlertActive, disabled }) => {
  const haptics = useHaptics();
  const { t } = useTranslation();

  const [progression,    setProgression]   = useState(0);
  const [enMaintien,     setEnMaintien]    = useState(false);
  const [ripplesTouch,   setRipplesTouch]  = useState<Ripple[]>([]);
  const [ondes,          setOndes]         = useState<Onde[]>([]);

  const intervalMaintien = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalOndes    = useRef<ReturnType<typeof setInterval> | null>(null);
  const debutMaintien    = useRef<number>(0);
  const declenche        = useRef(false);

  const demarrerOndes = useCallback((x: number, y: number) => {
    const emettre = () => {
      const id = Date.now() + Math.random();
      setOndes((p) => [...p, { id, x, y }]);
      setTimeout(() => setOndes((p) => p.filter((o) => o.id !== id)), 1200);
    };
    emettre();
    intervalOndes.current = setInterval(emettre, 600);
  }, []);

  const arreterOndes = useCallback(() => {
    if (intervalOndes.current) {
      clearInterval(intervalOndes.current);
      intervalOndes.current = null;
    }
    setOndes([]);
  }, []);

  const demarrerMaintien = useCallback((e: React.PointerEvent) => {
    if (disabled || isAlertActive) return;
    e.preventDefault();
    declenche.current  = false;
    debutMaintien.current = Date.now();
    setEnMaintien(true);
    setProgression(0);
    haptics.tap();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    demarrerOndes(e.clientX - rect.left, e.clientY - rect.top);

    intervalMaintien.current = setInterval(() => {
      const ecoule    = Date.now() - debutMaintien.current;
      const prog      = Math.min((ecoule / DUREE_MAINTIEN_MS) * 100, 100);
      setProgression(prog);

      if (prog >= 100 && !declenche.current) {
        declenche.current = true;
        clearInterval(intervalMaintien.current!);
        arreterOndes();
        setEnMaintien(false);
        setProgression(0);
        haptics.success();
        onTrigger();
      }
    }, 16);
  }, [disabled, isAlertActive, onTrigger, haptics, demarrerOndes, arreterOndes]);

  const terminerMaintien = useCallback(() => {
    if (intervalMaintien.current) {
      clearInterval(intervalMaintien.current);
      intervalMaintien.current = null;
    }
    arreterOndes();
    setEnMaintien(false);
    setProgression(0);
  }, [arreterOndes]);

  const ajouterRipple = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id   = Date.now();
    setRipplesTouch((p) => [...p, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipplesTouch((p) => p.filter((r) => r.id !== id)), 600);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    ajouterRipple(e);
    demarrerMaintien(e);
  }, [ajouterRipple, demarrerMaintien]);

  const circonference   = 2 * Math.PI * 72;
  const tiretDecalage   = circonference - (progression / 100) * circonference;

  const texteSous = isAlertActive
    ? t('sos.active', 'ALERTE ACTIVE')
    : enMaintien
    ? t('sos.holdInstruction', 'Gardez appuyé…')
    : t('sos.holdHint', 'Maintenir 1s');

  return (
    <div className="relative flex items-center justify-center select-none" style={{ perspective: '800px' }}>

      {!isAlertActive && !enMaintien && (
        <>
          <div className="absolute w-72 h-72 rounded-full border-2 border-red-900/25 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-64 h-64 rounded-full border border-red-800/15 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        </>
      )}

      {ondes.map((o) => (
        <motion.span
          key={o.id}
          className="absolute rounded-full border-2 border-red-500/60 pointer-events-none"
          style={{ left: o.x, top: o.y, translateX: '-50%', translateY: '-50%' }}
          initial={{ width: 50,  height: 50,  opacity: 0.8 }}
          animate={{ width: 280, height: 280, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      ))}

      {isAlertActive && (
        <>
          <motion.div
            className="absolute w-72 h-72 rounded-full bg-red-600/15"
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-60 h-60 rounded-full border-2 border-red-500/40"
            animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {enMaintien && (
        <svg className="absolute w-48 h-48 -rotate-90 pointer-events-none" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(220,38,38,0.12)" strokeWidth="6" />
          <circle
            cx="80" cy="80" r="72" fill="none"
            stroke="rgb(239,68,68)" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circonference}
            strokeDashoffset={tiretDecalage}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
      )}

      <motion.button
        className={[
          'relative w-44 h-44 rounded-full overflow-hidden',
          'flex flex-col items-center justify-center gap-2',
          'font-black text-white cursor-pointer select-none',
          'transition-all duration-200',
          disabled ? 'opacity-40 cursor-not-allowed' : '',
        ].join(' ')}
        style={{
          background: isAlertActive
            ? 'linear-gradient(160deg, #dc2626 0%, #7f1d1d 100%)'
            : enMaintien
            ? 'linear-gradient(160deg, #f87171 0%, #b91c1c 100%)'
            : 'linear-gradient(160deg, #ef4444 0%, #991b1b 100%)',
          boxShadow: isAlertActive
            ? '0 0 40px rgba(239,68,68,0.5), 0 8px 0 #450a0a, inset 0 2px 0 rgba(255,255,255,0.15)'
            : enMaintien
            ? '0 4px 0 #7f1d1d, 0 6px 20px rgba(220,38,38,0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
            : '0 8px 0 #7f1d1d, 0 12px 30px rgba(220,38,38,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
          transform: enMaintien
            ? 'perspective(800px) translateZ(-6px) rotateX(3deg)'
            : 'perspective(800px) translateZ(0) rotateX(0deg)',
        }}
        animate={
          isAlertActive
            ? { boxShadow: ['0 0 20px rgba(239,68,68,0.3), 0 8px 0 #450a0a', '0 0 50px rgba(239,68,68,0.7), 0 8px 0 #450a0a', '0 0 20px rgba(239,68,68,0.3), 0 8px 0 #450a0a'] }
            : {}
        }
        transition={
          isAlertActive
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
        onPointerDown={handlePointerDown}
        onPointerUp={terminerMaintien}
        onPointerLeave={terminerMaintien}
        onPointerCancel={terminerMaintien}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        aria-label="Bouton SOS — Maintenir pour déclencher une alerte immédiate"
        role="button"
        disabled={disabled}
      >
        {ripplesTouch.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none"
            style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40 }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}

        <motion.span
          className="text-5xl font-black tracking-widest z-10 drop-shadow-lg"
          animate={isAlertActive ? { opacity: [1, 0.6, 1] } : {}}
          transition={isAlertActive ? { duration: 1.8, repeat: Infinity } : {}}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          SOS
        </motion.span>

        <span className="text-sm font-bold tracking-widest uppercase opacity-90 z-10" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          {texteSous}
        </span>

        <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-full" />
      </motion.button>

      <AnimatePresence>
        {enMaintien && (
          <motion.div
            className="absolute -bottom-12 text-base text-red-400 font-bold tracking-widest uppercase"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {t('sos.dontRelease', 'Ne relâchez pas…')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
