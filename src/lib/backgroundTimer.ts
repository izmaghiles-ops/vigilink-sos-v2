const STORAGE_PREFIX = 'vigilink-bg-timer-';
const TRIGGERED_PREFIX = 'vigilink-bg-triggered-';

export interface TimerEmergencyData {
  userName: string;
  userPhone: string;
  contactPhones: string[];
  gps: { latitude: number; longitude: number; accuracy?: number; mapsLink?: string } | null;
  triggerType: string;
  isPlatinum: boolean;
  modeDiscret: boolean;
  lang?: string;
}

export interface StoredTimer {
  endTimestamp: number;
  duration: number;
  startedAt: number;
  emergencyData?: TimerEmergencyData;
}

export type TimerType = 'countdown' | 'fakecall';

export function saveBackgroundTimer(type: TimerType, timer: StoredTimer): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + type, JSON.stringify(timer));
    localStorage.removeItem(TRIGGERED_PREFIX + type);
  } catch {}
  notifyServiceWorker('START_TIMER', { timerType: type, ...timer });
}

export function getBackgroundTimer(type: TimerType): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + type);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTimer;
  } catch {
    return null;
  }
}

export function clearBackgroundTimer(type: TimerType): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + type);
  } catch {}
  notifyServiceWorker('CANCEL_TIMER', { timerType: type });
}

export function getTimeRemaining(type: TimerType): number {
  const timer = getBackgroundTimer(type);
  if (!timer) return 0;
  return Math.max(0, Math.ceil((timer.endTimestamp - Date.now()) / 1000));
}

export function isTimerExpired(type: TimerType): boolean {
  const timer = getBackgroundTimer(type);
  if (!timer) return false;
  return Date.now() >= timer.endTimestamp;
}

export function markTriggered(type: TimerType): void {
  try {
    localStorage.setItem(TRIGGERED_PREFIX + type, String(Date.now()));
  } catch {}
}

export function wasAlreadyTriggered(type: TimerType): boolean {
  try {
    const ts = localStorage.getItem(TRIGGERED_PREFIX + type);
    if (!ts) return false;
    return Date.now() - Number(ts) < 120_000;
  } catch {
    return false;
  }
}

async function notifyServiceWorker(action: string, data: Record<string, unknown>): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: action, ...data });
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({ type: action, ...data });
    }
  } catch {}
}

export function syncAllTimersToSW(): void {
  const types: TimerType[] = ['countdown', 'fakecall'];
  for (const type of types) {
    const timer = getBackgroundTimer(type);
    if (timer && timer.endTimestamp > Date.now()) {
      notifyServiceWorker('START_TIMER', { timerType: type, ...timer });
    }
  }
}

export function listenForTimerExpiry(callback: (timerType: TimerType) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'TIMER_EXPIRED') {
      callback(event.data.timerType as TimerType);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handler);
  return () => navigator.serviceWorker?.removeEventListener('message', handler);
}

export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}
