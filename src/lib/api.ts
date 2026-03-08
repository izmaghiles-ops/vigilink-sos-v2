/**
 * api.ts — Vigilink-SOS utility functions
 * Provides: normalisePhone, logAlert, fetchAlertHistory, fetchContacts,
 *           addContact, deleteContact, getGPSPosition, AlertResult
 */

import type { EmergencyContact, AlertLog, GPSPosition, QueuedAlert } from '../types';
import { Capacitor } from '@capacitor/core';
import NativeSMS from '../plugins/NativeSMS';
import { apiUrl } from './apiBase';

export function normalisePhone(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? '+' + digits : raw;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return raw;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

const GPS_OPTIONS_HIGH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 8_000,
};

const GPS_OPTIONS_LOW: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 120_000,
  timeout: 10_000,
};

function posFromCoords(pos: GeolocationPosition, approximate: boolean): GPSPosition {
  return {
    latitude:  pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy:  pos.coords.accuracy,
    mapsLink:  `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
    approximate,
  };
}

let cachedPosition: GPSPosition | null = null;
let watchId: number | null = null;

export function startGPSWatch(): void {
  if (watchId !== null || !('geolocation' in navigator)) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => { cachedPosition = posFromCoords(pos, false); },
    () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { cachedPosition = posFromCoords(pos, true); },
        () => {},
        GPS_OPTIONS_LOW,
      );
    },
    GPS_OPTIONS_HIGH,
  );
}

export function getCachedGPS(): GPSPosition | null {
  return cachedPosition;
}

export function getGPSPosition(): Promise<GPSPosition> {
  if (cachedPosition) {
    return Promise.resolve(cachedPosition);
  }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GPS non disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedPosition = posFromCoords(pos, false);
        resolve(cachedPosition);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            cachedPosition = posFromCoords(pos, true);
            resolve(cachedPosition);
          },
          reject,
          GPS_OPTIONS_LOW,
        );
      },
      GPS_OPTIONS_HIGH,
    );
  });
}

export type AlertResult =
  | { ok: true }
  | { ok: false; reason: 'queued' | 'no_contacts' | 'server' | 'network' | string };

const CLIENT_SMS: Record<string, {
  alert: string; user: string; unknown: string; callBack: string;
  time: string; position: string; positionApprox: string; positionUnknown: string;
}> = {
  fr: {
    alert: '🆘 ALERTE SOS — Vigilink-SOS',
    user: 'Utilisateur', unknown: 'Inconnu',
    callBack: '📞 Rappeler au', time: 'Heure',
    position: '📍 Position', positionApprox: '📍 Position approximative (GPS désactivé)', positionUnknown: '📍 Position : inconnue',
  },
  en: {
    alert: '🆘 SOS ALERT — Vigilink-SOS',
    user: 'User', unknown: 'Unknown',
    callBack: '📞 Call back at', time: 'Time',
    position: '📍 Location', positionApprox: '📍 Approximate location (GPS off)', positionUnknown: '📍 Location: unknown',
  },
  es: {
    alert: '🆘 ALERTA SOS — Vigilink-SOS',
    user: 'Usuario', unknown: 'Desconocido',
    callBack: '📞 Devolver llamada al', time: 'Hora',
    position: '📍 Ubicación', positionApprox: '📍 Ubicación aproximada (GPS desactivado)', positionUnknown: '📍 Ubicación: desconocida',
  },
  ar: {
    alert: '🆘 تنبيه SOS — Vigilink-SOS',
    user: 'المستخدم', unknown: 'غير معروف',
    callBack: '📞 إعادة الاتصال على', time: 'الوقت',
    position: '📍 الموقع', positionApprox: '📍 موقع تقريبي (GPS معطل)', positionUnknown: '📍 الموقع: غير معروف',
  },
  de: {
    alert: '🆘 SOS ALARM — Vigilink-SOS',
    user: 'Benutzer', unknown: 'Unbekannt',
    callBack: '📞 Rückruf an', time: 'Zeit',
    position: '📍 Standort', positionApprox: '📍 Ungefährer Standort (GPS aus)', positionUnknown: '📍 Standort: unbekannt',
  },
  pt: {
    alert: '🆘 ALERTA SOS — Vigilink-SOS',
    user: 'Usuário', unknown: 'Desconhecido',
    callBack: '📞 Ligar de volta para', time: 'Hora',
    position: '📍 Localização', positionApprox: '📍 Localização aproximada (GPS desativado)', positionUnknown: '📍 Localização: desconhecida',
  },
};

function getClientSmsStrings(lang?: string) {
  if (!lang) return CLIENT_SMS.fr;
  const base = lang.toLowerCase().split('-')[0];
  return CLIENT_SMS[base] || CLIENT_SMS.en;
}

function buildEmergencyMessage(params: {
  userName?: string;
  userPhone?: string;
  gps?: GPSPosition | null;
  lang?: string;
  meetingMode?: Record<string, unknown>;
}): string {
  const s = getClientSmsStrings(params.lang);
  const link = params.gps
    ? params.gps.mapsLink || `https://www.google.com/maps?q=${params.gps.latitude},${params.gps.longitude}`
    : null;
  const posLine = params.gps
    ? params.gps.approximate
      ? `${s.positionApprox} : ${link} (±${Math.round(params.gps.accuracy ?? 0)} m)`
      : `${s.position} : ${link} (±${Math.round(params.gps.accuracy ?? 0)} m)`
    : s.positionUnknown;
  const lines = [
    s.alert,
    `${s.user} : ${params.userName ?? s.unknown}`,
    params.userPhone ? `${s.callBack} : ${params.userPhone}` : '',
    `${s.time} : ${new Date().toLocaleTimeString(params.lang || 'fr', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`,
    posLine,
  ];

  const meet = params.meetingMode;
  if (meet && meet.active) {
    const meetParts: string[] = [];
    if (meet.person) meetParts.push(`👤 ${meet.person}`);
    if (meet.phone) meetParts.push(`📞 ${meet.phone}`);
    if (meet.location) meetParts.push(`📍 ${meet.location}`);
    if (meet.time) meetParts.push(`🕐 ${meet.time}`);
    if (meet.notes) meetParts.push(`📝 ${meet.notes}`);
    if (meetParts.length) lines.push('📋 ---', ...meetParts);
  }

  return lines.filter(Boolean).join('\n');
}

export function openNativeSMS(phones: string[], message: string): boolean {
  if (phones.length === 0) return false;

  try {
    const recipients = phones.join(',');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${recipients}${separator}body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    return true;
  } catch {
    return false;
  }
}

export async function logAlert(
  params: {
    userId?:       string;
    userName?:     string;
    userPhone?:    string;
    gps?:          GPSPosition | null;
    lang?:         string;
    contactPhones?: string[];
    id?:           string;
    source?:       string;
    position?:     GPSPosition | null;
    recipients?:   string[];
    triggerType?:  string;
    meetingMode?:    Record<string, unknown>;
    emergencyContacts?: string[];
    subscription?: string;
    journalEntries?: { title: string; description: string; date: string; photo?: string }[];
  },
  onQueue?: (alert: QueuedAlert) => void,
): Promise<AlertResult> {
  const phones = params.contactPhones ?? params.recipients ?? [];

  if (phones.length === 0) {
    return { ok: false, reason: 'no_contacts' };
  }

  const currentLang = params.lang || localStorage.getItem('vigilink-language') || 'fr';
  const message = buildEmergencyMessage({
    userName: params.userName,
    userPhone: params.userPhone,
    gps: params.gps ?? params.position,
    lang: currentLang,
    meetingMode: params.meetingMode,
  });

  const isFree = !params.subscription || params.subscription === 'free';

  console.log(`[logAlert] sub=${params.subscription}, isFree=${isFree}, online=${navigator.onLine}, phones=${phones.length}`);

  let twilioAttempted = false;
  let twilioError = '';

  if (navigator.onLine) {
    twilioAttempted = true;
    try {
      const apiEndpoint = apiUrl('/api/emergency');
      console.log(`[logAlert] PRO/Platinum — Sending via Twilio to ${apiEndpoint}`);
      const clientTime = new Date().toLocaleTimeString(currentLang || 'fr');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const gpsData = params.gps ?? params.position;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: params.userName,
          userPhone: params.userPhone,
          contactPhones: phones,
          gps: gpsData,
          triggerType: params.triggerType ?? params.source ?? 'sos',
          lang: currentLang,
          clientTime,
          timezone,
          meetingMode: params.meetingMode,
          emergencyContacts: params.emergencyContacts,
          journalEntries: params.journalEntries,
        }),
      });

      console.log(`[logAlert] Twilio response status: ${response.status}`);
      const data = await response.json();
      if (data.ok) {
        console.log(`[logAlert] SMS sent via Twilio to ${phones.length} contacts (${data.sent} delivered, ${data.failed} failed)`);
        return { ok: true };
      }
      twilioError = `Server error: ${data.reason || data.error || 'unknown'}`;
      console.error('[logAlert] Twilio returned error:', twilioError);
    } catch (err: any) {
      twilioError = err.message || 'Network error';
      console.error('[logAlert] Twilio request FAILED:', twilioError);
    }
  } else {
    twilioError = 'offline';
    console.warn('[logAlert] OFFLINE — Twilio unavailable');
  }

  if (twilioAttempted && twilioError) {
    console.warn(`[logAlert] PRO/Platinum Twilio failed (${twilioError}), using native SMS fallback for first contact only`);
  }

  if (!navigator.onLine || twilioError) {
    const fallbackPhone = [phones[0]];
    if (Capacitor.isNativePlatform()) {
      try {
        const { success } = await NativeSMS.sendSMS({ phones: fallbackPhone, message });
        if (success) return { ok: true };
      } catch (err: any) {
        console.error('[logAlert] Native SMS fallback failed:', err.message);
      }
    }

    const smsOpened = openNativeSMS(fallbackPhone, message);
    if (smsOpened) {
      return { ok: true };
    }

    if (onQueue) {
      const id = params.id ?? crypto.randomUUID();
      const gpsData = params.gps ?? params.position;
      for (const phone of phones) {
        onQueue({
          id,
          phone,
          message,
          timestamp: Date.now(),
          payload: {
            userName: params.userName,
            userPhone: params.userPhone,
            triggerType: params.triggerType ?? params.source ?? 'sos',
            latitude: gpsData?.latitude,
            longitude: gpsData?.longitude,
            mapsLink: gpsData?.mapsLink,
          },
        });
      }
      return { ok: false, reason: 'queued' };
    }
    return { ok: false, reason: 'network' };
  }

  return { ok: false, reason: 'twilio_error' };
}

export async function sendFollowupSMS(params: {
  userName?: string;
  userPhone?: string;
  contactPhones: string[];
  gps?: GPSPosition | null;
  alertId: string;
  triggerType?: string;
  audioBlob?: Blob | null;
}): Promise<AlertResult> {
  if (params.contactPhones.length === 0) {
    return { ok: false, reason: 'no_contacts' };
  }

  try {
    const formData = new FormData();
    formData.append('userName', params.userName ?? '');
    formData.append('userPhone', params.userPhone ?? '');
    formData.append('contactPhones', JSON.stringify(params.contactPhones));
    formData.append('alertId', params.alertId);
    formData.append('triggerType', params.triggerType ?? 'SOS');
    const lang = localStorage.getItem('vigilink-language') || 'fr';
    formData.append('lang', lang);
    formData.append('clientTime', new Date().toLocaleTimeString(lang));
    if (params.gps) formData.append('gps', JSON.stringify(params.gps));
    if (params.audioBlob) formData.append('audio', params.audioBlob, 'evidence.webm');

    const response = await fetch(apiUrl('/api/emergency-followup'), {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.ok) return { ok: true };
    return { ok: false, reason: 'server' };
  } catch (err: any) {
    console.error('[sendFollowupSMS] Error:', err.message);
    return { ok: false, reason: 'network' };
  }
}

export async function fetchAlertHistory(): Promise<AlertLog[]> {
  return [];
}

export async function fetchContacts(): Promise<EmergencyContact[]> {
  return [];
}

export async function addContact(
  contact: Omit<EmergencyContact, 'id'> & { id?: string }
): Promise<void> {
}

export async function deleteContact(id: string): Promise<void> {
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
): Promise<string> {
  const response = await fetch(apiUrl('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    throw new Error('Erreur du serveur');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Pas de réponse');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.content) {
          fullResponse += event.content;
          onChunk(event.content);
        }
        if (event.done) break;
      } catch {}
    }
  }

  return fullResponse;
}

