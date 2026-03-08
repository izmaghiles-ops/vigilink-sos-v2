// src/types.ts

// ── Subscription Plans ────────────────────────────────────────────────────────
export type SubscriptionPlan = 'free' | 'pro' | 'platinum' | 'trial';

// ── App Views ─────────────────────────────────────────────────────────────────
export type AppView =
  | 'home'
  | 'contacts'
  | 'history'
  | 'settings'
  | 'upgrade'
  | 'legal'
  | 'checklist'
  | 'sponsor'
  | 'admin'
  | 'support'
  | 'qrcode'
  | 'emergency-numbers'
  | 'medical'
  | 'meeting'
  | 'journal'
  | 'travel'
  | 'alzheimer-sponsor';

// ── Timer ─────────────────────────────────────────────────────────────────────
export type TimerDuration = 15 | 30 | 60 | 120 | 300;

// ── Contact Priority ──────────────────────────────────────────────────────────
export type ContactPriority = 'primary' | 'secondary' | 'tertiary';

// ── Sponsor Role ──────────────────────────────────────────────────────────────
export type SponsorRole = 'none' | 'sponsor' | 'guest';

// ── GPS Position ──────────────────────────────────────────────────────────────
export interface GPSPosition {
  latitude:  number;
  longitude: number;
  accuracy:  number;
  mapsLink:  string;
  approximate?: boolean;
}

// ── Platinum Config ───────────────────────────────────────────────────────────
export interface PlatinumConfig {
  chuteActif:            boolean;
  secoussesActif:        boolean;
  modeDiscret:           boolean;
}

export const PLATINUM_CONFIG_DEFAUT: PlatinumConfig = {
  chuteActif:            false,
  secoussesActif:        false,
  modeDiscret:           false,
};

// ── Platinum Sound Profile ────────────────────────────────────────────────────
export type PlatinumSoundEvent = 'sos' | 'dms' | 'alert' | 'confirmation';

export interface PlatinumSoundProfile {
  volume:          number;
  vibration:       boolean;
  soundEnabled:    boolean;
  enabledEvents:   PlatinumSoundEvent[];
}

// ── Sponsor Link ──────────────────────────────────────────────────────────────
export interface SponsorLink {
  sponsorPhone: string;
  sponsorName:  string;
  linkedAt:     string;
}

// ── Sponsor Code ──────────────────────────────────────────────────────────────
export interface SponsorCode {
  code:         string;
  sponsorPhone: string;
  sponsorName:  string;
  createdAt:    string;
  expiresAt:    string;
  used:         boolean;
  guestPhone?:  string;
}

// ── OTP Invitation ────────────────────────────────────────────────────────────
export interface OtpInvitation {
  id:           string;
  guestPhone:   string;
  sponsorPhone: string;
  sponsorName:  string;
  code:         string;
  createdAt:    string;
  expiresAt:    string;
  used:         boolean;
  giftPlan?:    SubscriptionPlan;
}

// ── Emergency Contact ─────────────────────────────────────────────────────────
export interface EmergencyContact {
  id:            string;
  name:          string;
  phone:         string;
  priority:      ContactPriority;
  taskadeNodeId?: string;
  createdAt?:    string;
  relationship?: string;
}

// ── Family Member ─────────────────────────────────────────────────────────────
export interface FamilyMember {
  id:           string;
  name:         string;
  phone:        string;
  subscription: SubscriptionPlan;
  linkedAt:     string;
  status?:      string;
  protected?:   boolean;
}

// ── Invitation Code ───────────────────────────────────────────────────────────
export interface InvitationCode {
  code:      string;
  memberId:  string;
  createdAt: string;
  expiresAt: string;
  used:      boolean;
}

// ── User Profile ──────────────────────────────────────────────────────────────
export interface UserProfile {
  id?:            string;
  name:           string;
  phone:          string;
  subscription:   SubscriptionPlan;
  platinumConfig: PlatinumConfig;
  normalCode:     string;
  duressCode:     string;
  proPhone1:      string;
  proPhone2:      string;
  sponsorRole:    SponsorRole;
  sponsorLink:    SponsorLink | null;
  termsAccepted?:   boolean;
  termsAcceptedAt?: string;
  alerteAutoConsentement?: boolean;
  email?: string;
  defaultTimer?: number;
  status?:       string;
  profileId?:    string;
}

// ── Auth Account ──────────────────────────────────────────────────────────────
export interface AuthAccount {
  phone:          string;
  password:       string;
  subscription:   SubscriptionPlan;
  trialExpiresAt: string | null;
  profileName:    string;
  contacts:       EmergencyContact[];
  platinumConfig: PlatinumConfig | null;
  normalCode:     string;
  duressCode:     string;
  proPhone1?:     string;
  proPhone2?:     string;
  sponsorRole?:   SponsorRole;
  sponsorLink?:   SponsorLink | null;
  sponsorCodes?:  SponsorCode[];
  isOtpGuest?:    boolean;
  createdAt:      string;
  lastLoginAt:    string | null;
}

// ── Alert Types ───────────────────────────────────────────────────────────────
export type AlertTriggerType = 'sos' | 'dms' | 'duress' | 'chute' | 'secousse' | 'bouton' | 'widget_sos';
export type AlertStatus      = 'sent' | 'queued' | 'failed' | 'pending';

// ── Alert Log ─────────────────────────────────────────────────────────────────
export interface AlertLog {
  id:           string;
  type?:        AlertTriggerType;
  triggerType?: AlertTriggerType;
  source?:      string;
  timestamp?:   number;
  triggeredAt?: number;
  position?:    GPSPosition;
  latitude?:    number;
  longitude?:   number;
  mapsLink?:    string;
  recipients?:  string[];
  status?:      AlertStatus;
  userId?:      string;
}

// ── Queued Alert ──────────────────────────────────────────────────────────────
export interface QueuedAlert {
  id:        string;
  phone:     string;
  message:   string;
  timestamp: number;
  payload?:  {
    latitude?:  number;
    longitude?: number;
    [key: string]: unknown;
  };
}

// ── Checklist Item ────────────────────────────────────────────────────────────
export interface ChecklistItem {
  id:          string;
  label:       string;
  description: string;
  checked:     boolean;
}

// ── Platinum Config (for ChecklistView) ──────────────────────────────────────
export type { PlatinumConfig as default };

// Legacy Contact/User types (keep backwards compat)
export interface User {
  id:           string;
  name:         string;
  phone:        string;
  subscription: SubscriptionPlan;
  platinumConfig: PlatinumConfig;
  normalCode:   string;
  duressCode:   string;
  proPhone1:    string;
  proPhone2:    string;
  sponsorRole:  SponsorRole;
  sponsorLink:  SponsorLink | null;
  termsAccepted?: boolean;
  alerteAutoConsentement?: boolean;
  email?: string;
}

export interface Contact {
  id:       string;
  name:     string;
  phone:    string;
  priority: ContactPriority;
}

// ── Medical Profile ──────────────────────────────────────────────────────────
export interface MedicalProfile {
  bloodType:       string;
  allergies:       string[];
  medications:     string[];
  conditions:      string[];
  emergencyNotes:  string;
}

export const MEDICAL_PROFILE_DEFAULT: MedicalProfile = {
  bloodType:      '',
  allergies:      [],
  medications:    [],
  conditions:     [],
  emergencyNotes: '',
};

// ── Meeting Mode ─────────────────────────────────────────────────────────────
export interface MeetingMode {
  active:      boolean;
  personName:  string;
  personPhone: string;
  location:    string;
  dateTime:    string;
  notes:       string;
}

export const MEETING_MODE_DEFAULT: MeetingMode = {
  active:      false,
  personName:  '',
  personPhone: '',
  location:    '',
  dateTime:    '',
  notes:       '',
};

// ── Journal Entry ────────────────────────────────────────────────────────────
export interface JournalEntry {
  id:          string;
  date:        string;
  title:       string;
  description: string;
  photo?:      string;
  createdAt:   number;
}

// ── Fake Call Config ─────────────────────────────────────────────────────────
export interface FakeCallConfig {
  callerName:     string;
  callerPhone:    string;
  delaySeconds:   number;
}

export const FAKE_CALL_DEFAULT: FakeCallConfig = {
  callerName:     '',
  callerPhone:    '',
  delaySeconds:   20,
};

// ── Alzheimer Mode ──────────────────────────────────────────────────────────
export interface AlzheimerMode {
  enabled:          boolean;
  caregiverName:    string;
  caregiverPhone:   string;
  hideAddress:      boolean;
  displayName:      string;
}

export const ALZHEIMER_MODE_DEFAULT: AlzheimerMode = {
  enabled:          false,
  caregiverName:    '',
  caregiverPhone:   '',
  hideAddress:      true,
  displayName:      '',
};

// ── Alzheimer Ward (person under Alzheimer care) ─────────────────────────────
export interface AlzheimerWard {
  id:               string;
  name:             string;
  phone:            string;
  profileId:        string;
  displayName:      string;
  caregiverName:    string;
  caregiverPhone:   string;
  hideAddress:      boolean;
  instructions:     string;
  bloodType:        string;
  allergies:        string;
  medications:      string;
  conditions:       string;
  emergencyNotes:   string;
  createdAt:        string;
}

// ── Travel Mode ──────────────────────────────────────────────────────────────
export interface TravelMode {
  active:         boolean;
  destination:    string;
  checkInMorning: string;
  checkInEvening: string;
  lastCheckIn:    number | null;
  missedCheckIns: number;
}

export const TRAVEL_MODE_DEFAULT: TravelMode = {
  active:         false,
  destination:    '',
  checkInMorning: '08:00',
  checkInEvening: '20:00',
  lastCheckIn:    null,
  missedCheckIns: 0,
};
