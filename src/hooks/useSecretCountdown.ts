import { useState, useRef, useCallback, useEffect } from 'react';
import {
  saveBackgroundTimer,
  getBackgroundTimer,
  clearBackgroundTimer,
  syncAllTimersToSW,
  markTriggered,
  wasAlreadyTriggered,
  type TimerEmergencyData,
} from '../lib/backgroundTimer';

export type CountdownStatus =
  | 'idle'
  | 'running'
  | 'triggered'
  | 'triggered_battery'
  | 'cancelled';

export interface UseSecretCountdownReturn {
  status:            CountdownStatus;
  secondesRestantes: number;
  dureeInitiale:     number;
  start:             (secondes: number, emergencyData?: TimerEmergencyData) => void;
  cancel:            () => void;
}

interface UseSecretCountdownOptions {
  onTrigger: () => void | Promise<void>;
}

async function checkBattery(): Promise<boolean> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return battery.level < 0.15 && !battery.charging;
    }
  } catch {}
  return false;
}

export function useSecretCountdown(
  { onTrigger }: UseSecretCountdownOptions,
): UseSecretCountdownReturn {
  const [status, setStatus]                       = useState<CountdownStatus>('idle');
  const [secondesRestantes, setSecondesRestantes] = useState(0);
  const [dureeInitiale, setDureeInitiale]         = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTriggerRef = useRef(onTrigger);
  const hasTriggeredRef = useRef(false);

  useEffect(() => { onTriggerRef.current = onTrigger; }, [onTrigger]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const doTrigger = useCallback(() => {
    if (hasTriggeredRef.current) return;
    if (wasAlreadyTriggered('countdown')) {
      clearTimer();
      clearBackgroundTimer('countdown');
      setSecondesRestantes(0);
      setStatus('triggered');
      hasTriggeredRef.current = true;
      return;
    }
    hasTriggeredRef.current = true;
    markTriggered('countdown');
    clearTimer();
    setSecondesRestantes(0);
    setStatus('triggered');
    clearBackgroundTimer('countdown');
    checkBattery().then((low) => {
      if (low) setStatus('triggered_battery');
    });
    onTriggerRef.current();
  }, [clearTimer]);

  const startTick = useCallback((endTs: number, dur: number) => {
    clearTimer();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTs - Date.now()) / 1000));
      setSecondesRestantes(remaining);
      if (remaining <= 0) {
        doTrigger();
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    setDureeInitiale(dur);
    setStatus('running');
    hasTriggeredRef.current = false;
  }, [clearTimer, doTrigger]);

  const start = useCallback((secondes: number, emergencyData?: TimerEmergencyData) => {
    const endTimestamp = Date.now() + secondes * 1000;
    saveBackgroundTimer('countdown', {
      endTimestamp,
      duration: secondes,
      startedAt: Date.now(),
      emergencyData,
    });
    startTick(endTimestamp, secondes);
  }, [startTick]);

  const cancel = useCallback(() => {
    clearTimer();
    clearBackgroundTimer('countdown');
    setStatus('cancelled');
    setSecondesRestantes(0);
    hasTriggeredRef.current = false;
  }, [clearTimer]);

  useEffect(() => {
    const stored = getBackgroundTimer('countdown');
    if (stored && stored.endTimestamp > Date.now()) {
      syncAllTimersToSW();
      startTick(stored.endTimestamp, stored.duration);
    } else if (stored && stored.endTimestamp <= Date.now()) {
      doTrigger();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      syncAllTimersToSW();
      const stored = getBackgroundTimer('countdown');
      if (!stored) return;
      if (stored.endTimestamp <= Date.now()) {
        doTrigger();
      } else {
        const remaining = Math.max(0, Math.ceil((stored.endTimestamp - Date.now()) / 1000));
        setSecondesRestantes(remaining);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doTrigger]);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIMER_EXPIRED' && event.data.timerType === 'countdown') {
        if (event.data.smsSentBySW) {
          markTriggered('countdown');
        }
        doTrigger();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, [doTrigger]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { status, secondesRestantes, dureeInitiale, start, cancel };
}
