import { getApiBase } from './apiBase';
import type { AuthAccount } from '../types';

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_vigilink_sync');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildProfileData(account: AuthAccount) {
  return {
    profileName:    account.profileName,
    subscription:   account.subscription,
    trialExpiresAt: account.trialExpiresAt,
    contacts:       account.contacts,
    platinumConfig: account.platinumConfig,
    normalCode:     account.normalCode,
    duressCode:     account.duressCode,
    proPhone1:      account.proPhone1 || '',
    proPhone2:      account.proPhone2 || '',
    sponsorRole:    account.sponsorRole || 'none',
    sponsorLink:    account.sponsorLink || null,
    sponsorCodes:   account.sponsorCodes || [],
  };
}

export async function saveProfileToServer(phone: string, account: AuthAccount): Promise<boolean> {
  try {
    const token = await hashToken(account.password);
    const base = getApiBase();
    const res = await fetch(`${base}/api/sync/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, profileData: buildProfileData(account), token }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function loadProfileFromServer(phone: string, password: string): Promise<ReturnType<typeof buildProfileData> | null> {
  try {
    const token = await hashToken(password);
    const base = getApiBase();
    const res = await fetch(`${base}/api/sync/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token }),
    });
    const data = await res.json();
    if (data.ok && data.found) return data.profileData;
    return null;
  } catch {
    return null;
  }
}
