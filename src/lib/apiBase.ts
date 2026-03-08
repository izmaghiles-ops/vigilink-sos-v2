import { Capacitor } from '@capacitor/core';

const PRODUCTION_API_URL = import.meta.env.VITE_API_URL as string || '';

export function getApiBase(): string {
  if (PRODUCTION_API_URL) return PRODUCTION_API_URL;
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_URL as string || 'https://vigilink-sos.replit.app';
  }
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}
