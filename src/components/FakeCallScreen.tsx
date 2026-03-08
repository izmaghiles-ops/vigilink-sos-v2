import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, PhoneOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FakeCallScreenProps {
  visible:      boolean;
  callerName:   string;
  callerPhone?: string;
  onDecline:    () => void;
}

function createRingtoneContext(): { ctx: AudioContext; stop: () => void } | null {
  try {
    const ctx = new AudioContext();
    let stopped = false;

    const playTone = (freq1: number, freq2: number, startTime: number, duration: number) => {
      if (stopped) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = freq1;
      osc2.type = 'sine';
      osc2.frequency.value = freq2;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.setValueAtTime(0.15, startTime + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration);
    };

    const scheduleRing = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      playTone(440, 480, now, 0.8);
      playTone(440, 480, now + 1.0, 0.8);
      setTimeout(() => scheduleRing(), 3000);
    };

    scheduleRing();

    return {
      ctx,
      stop: () => {
        stopped = true;
        try { ctx.close(); } catch {}
      },
    };
  } catch {
    return null;
  }
}

export const FakeCallScreen: React.FC<FakeCallScreenProps> = ({
  visible,
  callerName,
  callerPhone,
  onDecline,
}) => {
  const { t } = useTranslation();
  const vibInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  useEffect(() => {
    if (visible) {
      const pulse = () => {
        if ('vibrate' in navigator) navigator.vibrate([500, 300]);
      };
      pulse();
      vibInterval.current = setInterval(pulse, 900);

      audioRef.current = createRingtoneContext();
    } else {
      if (vibInterval.current) {
        clearInterval(vibInterval.current);
        vibInterval.current = null;
      }
      if ('vibrate' in navigator) navigator.vibrate(0);

      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current = null;
      }
    }
    return () => {
      if (vibInterval.current) clearInterval(vibInterval.current);
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current = null;
      }
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-gradient-to-b from-gray-950 via-gray-900 to-black py-16 px-8"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-36 h-36 rounded-full border border-white/10"
                animate={{ scale: [1, 1.35], opacity: [0.4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute w-28 h-28 rounded-full border border-white/15"
                animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
                <span className="text-4xl font-black text-white/80">
                  {callerName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-sm text-gray-500 tracking-widest uppercase">
                {t('fakeCall.incomingCall')}
              </p>
              <h2 className="text-3xl font-black text-white tracking-tight">{callerName}</h2>
              {callerPhone && (
                <p className="text-base text-gray-400 font-medium tracking-wide">
                  {callerPhone}
                </p>
              )}
              <motion.p
                className="text-sm text-gray-600 mt-1"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                {t('fakeCall.mobile')}
              </motion.p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-20 pb-4">
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-900/40 transition-colors"
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
              >
                <PhoneOff size={26} className="text-white" />
              </motion.button>
              <span className="text-xs text-gray-500">{t('fakeCall.decline')}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center shadow-xl shadow-green-900/40 transition-colors"
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              >
                <PhoneCall size={26} className="text-white" />
              </motion.button>
              <span className="text-xs text-gray-500">{t('fakeCall.accept')}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
