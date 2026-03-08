import { Capacitor } from '@capacitor/core';
import { apiUrl } from './apiBase';

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export type CheckoutResult =
  | { status: 'success'; sessionId: string; plan?: string }
  | { status: 'cancelled' }
  | { status: 'none' };

const PENDING_KEY = 'vigilink-pending-checkout';

interface PendingCheckout {
  sessionId: string;
  plan: string;
  userId: string;
  createdAt: number;
}

function savePending(data: PendingCheckout): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(data)); } catch {}
}

function loadPending(): PendingCheckout | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingCheckout;
    if (Date.now() - data.createdAt > 30 * 60 * 1000) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearPending(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

async function openInAppBrowser(url: string): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

export async function createCheckoutSession(
  opts: string | { userId: string; userEmail?: string },
  _phone?: string,
  plan: string = 'pro',
  currency: string = 'cad',
): Promise<CheckoutSession> {
  const userId = typeof opts === 'string' ? opts : opts.userId;
  const isNative = Capacitor.isNativePlatform();

  const response = await fetch(apiUrl('/api/checkout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, userId, currency, native: isNative }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || 'Erreur lors de la création de la session de paiement');
  }

  const data = await response.json();

  if (data.url) {
    if (isNative) {
      savePending({ sessionId: data.sessionId, plan, userId, createdAt: Date.now() });
      await openInAppBrowser(data.url);
    } else {
      window.location.href = data.url;
    }
  }

  return { url: data.url, sessionId: data.sessionId };
}

export async function createTrialCheckoutSession(
  opts: string | { userId: string; userEmail?: string },
  _phone?: string,
  currency: string = 'cad',
): Promise<CheckoutSession> {
  const userId = typeof opts === 'string' ? opts : opts.userId;
  const isNative = Capacitor.isNativePlatform();

  const response = await fetch(apiUrl('/api/checkout/trial'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, currency, native: isNative }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || "Erreur lors de la création de la session d'essai");
  }

  const data = await response.json();

  if (data.url) {
    if (isNative) {
      savePending({ sessionId: data.sessionId, plan: 'pro', userId, createdAt: Date.now() });
      await openInAppBrowser(data.url);
    } else {
      window.location.href = data.url;
    }
  }

  return { url: data.url, sessionId: data.sessionId };
}

export function parseCheckoutResult(): CheckoutResult {
  const params = new URLSearchParams(window.location.search);
  const success = params.get('checkout');
  const sessionId = params.get('session_id');
  const plan = params.get('plan') ?? undefined;

  if (success === 'success' && sessionId) {
    return { status: 'success', sessionId, plan };
  }
  if (success === 'cancel') {
    return { status: 'cancelled' };
  }
  return { status: 'none' };
}

export async function verifyPendingCheckout(): Promise<CheckoutResult> {
  const pending = loadPending();
  if (!pending) return { status: 'none' };

  try {
    const response = await fetch(apiUrl('/api/checkout/verify-session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: pending.sessionId, userId: pending.userId }),
    });

    if (!response.ok) {
      clearPending();
      return { status: 'none' };
    }

    const data = await response.json();
    clearPending();

    if (data.paid) {
      return { status: 'success', sessionId: pending.sessionId, plan: data.plan || pending.plan };
    }
    return { status: 'cancelled' };
  } catch {
    return { status: 'none' };
  }
}

export function hasPendingCheckout(): boolean {
  return loadPending() !== null;
}

export function clearCheckoutParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('checkout');
  url.searchParams.delete('session_id');
  url.searchParams.delete('plan');
  window.history.replaceState({}, '', url.toString());
}
