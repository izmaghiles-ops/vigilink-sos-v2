/**

 * useAppStore — État global Vigilink-SOS (Zustand)

 *

 * Langue : française fixe. Plus de logique lang/setLang dans le store.

 * Textes en UTF-8 direct, aucun code Unicode parasite.

 *

 * Admin : Gilles

 */



import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { useAuthStore } from './useAuthStore';

import type {

  AppView,

  EmergencyContact,

  GPSPosition,

  TimerDuration,

  UserProfile,

  AlertLog,

  QueuedAlert,

  ChecklistItem,

  FamilyMember,

  InvitationCode,

  PlatinumSoundProfile,

  PlatinumSoundEvent,

  MedicalProfile,

  MeetingMode,

  JournalEntry,

  TravelMode,

  AlzheimerMode,

  FakeCallConfig,

  PlatinumConfig,

  SponsorCode,

  SponsorLink,

  AlzheimerWard,

} from '../types';

import { PLATINUM_CONFIG_DEFAUT, ALZHEIMER_MODE_DEFAULT, FAKE_CALL_DEFAULT } from '../types';



type AlertTriggerKind = 'sos' | 'dms' | 'duress';



interface AppStore {

  // Navigation

  currentView: AppView;

  setView: (view: AppView) => void;



  // Onboarding

  onboardingComplete: boolean;

  setOnboardingComplete: (v: boolean) => void;



  // Utilisateur

  user: UserProfile;

  setUser: (user: Partial<UserProfile>) => void;



  // Contacts

  contacts: EmergencyContact[];

  setContacts: (contacts: EmergencyContact[]) => void;

  addContact: (contact: EmergencyContact) => void;

  removeContact: (id: string) => void;



  // Alerte

  isAlertActive: boolean;

  alertTriggerType: AlertTriggerKind | null;

  setAlertActive: (active: boolean, type?: AlertTriggerKind) => void;



  // Dead Man Switch

  timerDuration: TimerDuration;

  timerSeconds: number;

  timerActive: boolean;

  setTimerDuration: (duration: TimerDuration) => void;

  setTimerSeconds: (seconds: number) => void;

  setTimerActive: (active: boolean) => void;

  resetTimer: () => void;



  // GPS

  gpsPosition: GPSPosition | null;

  setGPSPosition: (pos: GPSPosition | null) => void;



  // Historique

  alertHistory: AlertLog[];

  setAlertHistory: (logs: AlertLog[]) => void;

  prependAlert: (log: AlertLog) => void;



  // File hors-ligne

  alertQueue: QueuedAlert[];

  enqueueAlert: (alert: QueuedAlert) => void;

  dequeueAlert: (id: string) => void;

  clearQueue: () => void;



  // Checklist de fiabilité

  checklist: ChecklistItem[];

  toggleChecklistItem: (id: string) => void;



  // Réseau

  isOnline: boolean;

  setIsOnline: (v: boolean) => void;



  // ── Pack Familial Platinum ────────────────────────────────────────────────

  familyMembers:        FamilyMember[];

  invitationCodes:      InvitationCode[];

  platinumSoundProfile: PlatinumSoundProfile;



  addFamilyMember:    (member: FamilyMember) => void;

  removeFamilyMember: (id: string) => void;

  updateFamilyMember: (id: string, changes: Partial<FamilyMember>) => void;



  /** Génère un code à 6 chiffres unique et le stocke dans invitationCodes. */

  generateInvitationCode: (memberId: string) => InvitationCode;



  /**

   * Tente d'utiliser un code d'invitation.

   * Retourne le FamilyMember lié ou null si invalide/expiré.

   */

  redeemInvitationCode: (code: string) => FamilyMember | null;



  setPlatinumSoundProfile: (profile: Partial<PlatinumSoundProfile>) => void;



  /** Met à jour un ou plusieurs champs de la configuration Platinum. */

  setPlatinumConfig: (config: Partial<PlatinumConfig>) => void;



  // ── Medical Profile ─────────────────────────────────────────────────────
  medicalProfile: MedicalProfile;
  setMedicalProfile: (p: Partial<MedicalProfile>) => void;

  // ── Meeting Mode ──────────────────────────────────────────────────────
  meetingMode: MeetingMode;
  setMeetingMode: (m: Partial<MeetingMode>) => void;

  // ── Journal ───────────────────────────────────────────────────────────
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  removeJournalEntry: (id: string) => void;
  updateJournalEntry: (id: string, changes: Partial<JournalEntry>) => void;

  // ── Fake Call Config ────────────────────────────────────────────────
  fakeCallConfig: FakeCallConfig;
  setFakeCallConfig: (c: Partial<FakeCallConfig>) => void;
  isFakeCallActive: boolean;
  setFakeCallActive: (v: boolean) => void;
  adminSession: boolean;
  setAdminSession: (v: boolean) => void;
  _checkoutReturn: 'success' | 'cancelled' | null;

  // ── Alzheimer Mode ──────────────────────────────────────────────────
  alzheimerMode: AlzheimerMode;
  setAlzheimerMode: (a: Partial<AlzheimerMode>) => void;

  // ── Alzheimer Wards (persons under care) ─────────────────────────────
  alzheimerWards: AlzheimerWard[];
  addAlzheimerWard: (ward: AlzheimerWard) => void;
  updateAlzheimerWard: (id: string, changes: Partial<AlzheimerWard>) => void;
  removeAlzheimerWard: (id: string) => void;

  // ── Travel Mode ───────────────────────────────────────────────────────
  travelMode: TravelMode;
  setTravelMode: (t: Partial<TravelMode>) => void;

  // ── Système de Parrainage Platinum ────────────────────────────────────────

  /** Codes de parrainage générés par ce compte (parrain uniquement) */

  sponsorCodes: SponsorCode[];



  /**

   * Génère un code de parrainage à 6 chiffres valide 72h.

   * Remplace tout code précédent non utilisé.

   * Disponible uniquement pour les utilisateurs Platinum (role='sponsor').

   */

  generateSponsorCode: (sponsorPhone: string, sponsorName: string) => SponsorCode;



  /**

   * Tente d'activer un code de parrainage.

   * Si valide, lie l'invité à son parrain et passe le compte en 'platinum_guest'.

   * Retourne le SponsorLink si réussi, null sinon.

   */

  redeemSponsorCode: (

    code: string,

    allSponsorCodes: SponsorCode[],

  ) => SponsorLink | null;

}



// ── Checklist — textes UTF-8 directs, aucun code Unicode ─────────────────────

const CHECKLIST_DEFAUT: ChecklistItem[] = [

  {

    id: 'gps',

    label: 'Test GPS',

    description: 'Précision inférieure à 20 mètres en extérieur à Montréal',

    checked: false,

  },

  {

    id: 'battery',

    label: 'Test Batterie',

    description: 'Consommation inférieure à 5% par heure en mode veille (GPS adaptatif)',

    checked: false,

  },

  {

    id: 'audio',

    label: 'Test Audio',

    description: 'Le micro enregistre avec le téléphone verrouillé',

    checked: false,

  },

  {

    id: 'legal',

    label: 'Test Légal',

    description: "Case à cocher des conditions affichée à l'inscription",

    checked: false,

  },

  {

    id: 'offline',

    label: 'Test Hors-Ligne',

    description: "La file d'attente d'alerte fonctionne sans réseau",

    checked: false,

  },

  {

    id: 'duress',

    label: 'Test Code Contrainte',

    description: 'Le code B affiche "Désactivé" mais envoie une alerte silencieuse',

    checked: false,

  },

  {

    id: 'audio-chunks',

    label: 'Test Enregistrement Audio',

    description: "Segments de 30 secondes uploadés automatiquement pendant l'alerte",

    checked: false,

  },

  {

    id: 'push-notif',

    label: 'Test Notifications Push',

    description: 'Vibration et alerte à T-5min et T-1min avant expiration DMS',

    checked: false,

  },

  {

    id: 'ssl',

    label: 'SSL et HTTPS',

    description: 'Indispensable pour GPS et Micro — Vercel le fait par défaut',

    checked: false,

  },

  {

    id: 'favicon',

    label: 'Favicon et Icône',

    description: 'Icône 512x512 générée pour installation mobile',

    checked: false,

  },

  {

    id: 'dead-zone',

    label: 'Test Zone Morte',

    description: 'Tester dans un garage ou sous-sol à Montréal — vérifier la gestion des erreurs réseau',

    checked: false,

  },

  {

    id: 'stripe-live',

    label: 'Stripe Live',

    description: 'Passer le compte Stripe de "Test" à "Live" pour les paiements réels',

    checked: false,

  },

  {

    id: 'vibration-android',

    label: 'Test Vibration Android',

    description: 'Vérifier le retour haptique SOS sur Android (tap 80ms puis succès [500,150,500,150,500])',

    checked: false,

  },

  {

    id: 'vibration-ios',

    label: 'Test Vibration iOS',

    description: "La vibration PWA sur iOS nécessite l'ajout à l'écran d'accueil via Safari",

    checked: false,

  },

  {

    id: 'payment-speed',

    label: 'Test Paiement Direct (moins de 2s)',

    description: 'Cliquer Pro doit ouvrir la page Stripe en moins de 2 secondes',

    checked: false,

  },

  {

    id: 'pro-confirmation',

    label: 'Test Confirmation Pro',

    description: 'Après retour Stripe, l\'écran doit afficher "PROTECTION ACTIVE" avec le badge Pro jaune',

    checked: false,

  },

];



// ── Profil utilisateur par defaut ─────────────────────────────────────────────

const utilisateurParDefaut: UserProfile = {

  id:                   'usr-local',

  name:                 'Utilisateur',

  phone:                '',

  subscription:         'free',

  normalCode:           '1234',

  duressCode:           '9999',

  defaultTimer:         60,

  status:               'active',

  termsAccepted:        false,

  termsAcceptedAt:      null,


  alerteAutoConsentement: true,

  // PRO — numeros dedies aux alertes multi-destinataires

  proPhone1:            '',

  proPhone2:            '',

  // Platinum — configuration avancee (valeurs par defaut securitaires)

  platinumConfig:       PLATINUM_CONFIG_DEFAUT,

  // Parrainage — valeurs par défaut sûres

  sponsorRole:          'none',

  sponsorLink:          null,

  profileId:            crypto.randomUUID().replace(/-/g, '').slice(0, 12),

};



/**

 * Fusionne un profil hydraté depuis localStorage avec les valeurs par défaut.

 * Garantit qu'aucun champ obligatoire n'est undefined après rehydratation.

 */

function sanitiseUserProfile(u: Partial<UserProfile>): UserProfile {

  return {

    ...utilisateurParDefaut,

    ...u,

    // Champs string jamais undefined

    id:          u.id          || utilisateurParDefaut.id,

    name:        u.name        || utilisateurParDefaut.name,

    phone:       u.phone       ?? '',

    normalCode:  u.normalCode  ?? utilisateurParDefaut.normalCode,

    duressCode:  u.duressCode  ?? utilisateurParDefaut.duressCode,

    proPhone1:   u.proPhone1   ?? '',

    proPhone2:   u.proPhone2   ?? '',

    // Parrainage

    sponsorRole: u.sponsorRole ?? 'none',

    sponsorLink: u.sponsorLink ?? null,

    // Platinum

    platinumConfig: { ...PLATINUM_CONFIG_DEFAUT, ...(u.platinumConfig ?? {}) },

  };

}



// ── Store Zustand ─────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(

  persist(

    (set) => ({

      // Navigation

      currentView: 'home',

      setView: (view) => set({ currentView: view }),



      // Onboarding

      onboardingComplete: false,

      setOnboardingComplete: (v) => set({ onboardingComplete: v }),



      // Utilisateur

      user: utilisateurParDefaut,

      setUser: (partial) =>

        set((s) => ({ user: sanitiseUserProfile({ ...s.user, ...partial }) })),



      // Contacts

      contacts: [],

      setContacts: (contacts) => {
        set({ contacts });
        try { useAuthStore.getState().syncContacts(contacts); } catch (e) { console.warn('[setContacts] sync failed:', e); }
      },

      addContact: (contact) => {
        set((s) => {
          const updated = [...s.contacts, contact];
          try { useAuthStore.getState().syncContacts(updated); } catch (e) { console.warn('[addContact] sync failed:', e); }
          return { contacts: updated };
        });
      },

      removeContact: (id) => {
        set((s) => {
          const updated = s.contacts.filter((c) => c.id !== id);
          try { useAuthStore.getState().syncContacts(updated); } catch (e) { console.warn('[removeContact] sync failed:', e); }
          return { contacts: updated };
        });
      },



      // Alerte

      isAlertActive:    false,

      alertTriggerType: null,

      setAlertActive: (active, type = 'sos') =>

        set({ isAlertActive: active, alertTriggerType: active ? type : null }),



      // Timer DMS

      timerDuration: 60,

      timerSeconds:  60 * 60,

      timerActive:   false,

      setTimerDuration: (duration) =>

        set({ timerDuration: duration, timerSeconds: duration * 60 }),

      setTimerSeconds: (seconds) => set({ timerSeconds: seconds }),

      setTimerActive:  (active)  => set({ timerActive: active }),

      resetTimer: () =>

        set((s) => ({ timerSeconds: s.timerDuration * 60, timerActive: true })),



      // GPS

      gpsPosition:    null,

      setGPSPosition: (pos) => set({ gpsPosition: pos }),



      // Historique

      alertHistory:    [],

      setAlertHistory: (logs) => set({ alertHistory: logs }),

      prependAlert:    (log)  =>

        set((s) => ({ alertHistory: [log, ...s.alertHistory].slice(0, 50) })),






      // File hors-ligne

      alertQueue:    [],

      enqueueAlert:  (alert) =>

        set((s) => ({ alertQueue: [...s.alertQueue, alert] })),

      dequeueAlert:  (id)    =>

        set((s) => ({ alertQueue: s.alertQueue.filter((a) => a.id !== id) })),

      clearQueue:    ()      => set({ alertQueue: [] }),



      // Checklist

      checklist: CHECKLIST_DEFAUT,

      toggleChecklistItem: (id) =>

        set((s) => ({

          checklist: s.checklist.map((item) =>

            item.id === id ? { ...item, checked: !item.checked } : item

          ),

        })),



      // Réseau

      isOnline:    navigator.onLine,

      setIsOnline: (v) => set({ isOnline: v }),



      // ── Pack Familial Platinum ──────────────────────────────────────────

      familyMembers:   [],

      invitationCodes: [],

      platinumSoundProfile: {
        volume:         1,
        vibration:      true,
        soundEnabled:   true,
        enabledEvents:  ['sos', 'dms', 'alert', 'confirmation'] satisfies PlatinumSoundEvent[],
      } satisfies PlatinumSoundProfile,



      addFamilyMember: (member) =>

        set((s) => ({ familyMembers: [...s.familyMembers, member] })),



      removeFamilyMember: (id) =>

        set((s) => ({

          familyMembers: s.familyMembers.filter((m) => m.id !== id),

        })),



      updateFamilyMember: (id, changes) =>

        set((s) => ({

          familyMembers: s.familyMembers.map((m) =>

            m.id === id ? { ...m, ...changes } : m

          ),

        })),



      generateInvitationCode: (memberId) => {

        // Code à 6 chiffres cryptographiquement sûr

        const arr  = new Uint32Array(1);

        crypto.getRandomValues(arr);

        const code = String(arr[0] % 1_000_000).padStart(6, '0');



        const now     = new Date();

        const expires = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72h



        const invitation: InvitationCode = {

          code,

          memberId:  memberId,

          createdAt: now.toISOString(),

          expiresAt: expires.toISOString(),

          used:      false,

        };



        set((s) => ({

          invitationCodes: [

            // Remplace tout code précédent pour ce membre

            ...s.invitationCodes.filter((c) => c.memberId !== memberId),

            invitation,

          ],

        }));



        return invitation;

      },



      redeemInvitationCode: (code) => {

        let trouvé: FamilyMember | null = null;



        set((s) => {

          const inv = s.invitationCodes.find(

            (c) => c.code === code && !c.used && new Date(c.expiresAt) > new Date(),

          );

          if (!inv) return s;



          const member = s.familyMembers.find((m) => m.id === inv.memberId);

          if (!member) return s;



          const membreActif: FamilyMember = {

            ...member,

            status:    'active',

            linkedAt:  new Date().toISOString(),

            protected: true,

          };

          trouvé = membreActif;



          return {

            ...s,

            invitationCodes: s.invitationCodes.map((c) =>

              c.code === code ? { ...c, used: true } : c,

            ),

            familyMembers: s.familyMembers.map((m) =>

              m.id === inv.memberId ? membreActif : m,

            ),

          };

        });



        return trouvé;

      },



      setPlatinumSoundProfile: (profile) =>

        set((s) => ({

          platinumSoundProfile: { ...s.platinumSoundProfile, ...profile },

        })),



      setPlatinumConfig: (config) =>

        set((s) => ({

          user: {

            ...s.user,

            platinumConfig: {

              ...(s.user.platinumConfig ?? PLATINUM_CONFIG_DEFAUT),

              ...config,

            },

          },

        })),



      // ── Medical Profile ───────────────────────────────────────────────
      medicalProfile: { bloodType: '', allergies: [], medications: [], conditions: [], emergencyNotes: '' } as MedicalProfile,
      setMedicalProfile: (p) => set((s) => ({ medicalProfile: { ...s.medicalProfile, ...p } })),

      // ── Meeting Mode ────────────────────────────────────────────────
      meetingMode: { active: false, personName: '', personPhone: '', location: '', dateTime: '', notes: '' } as MeetingMode,
      setMeetingMode: (m) => set((s) => ({ meetingMode: { ...s.meetingMode, ...m } })),

      // ── Journal ─────────────────────────────────────────────────────
      journalEntries: [] as JournalEntry[],
      addJournalEntry: (entry) => set((s) => ({ journalEntries: [entry, ...s.journalEntries] })),
      removeJournalEntry: (id) => set((s) => ({ journalEntries: s.journalEntries.filter((e) => e.id !== id) })),
      updateJournalEntry: (id, changes) => set((s) => ({
        journalEntries: s.journalEntries.map((e) => e.id === id ? { ...e, ...changes } : e),
      })),

      // ── Fake Call Config ────────────────────────────────────────────
      fakeCallConfig: { ...FAKE_CALL_DEFAULT } as FakeCallConfig,
      setFakeCallConfig: (c) => set((s) => ({ fakeCallConfig: { ...s.fakeCallConfig, ...c } })),
      isFakeCallActive: false,
      setFakeCallActive: (v) => set({ isFakeCallActive: v }),
      adminSession: false,
      setAdminSession: (v) => set({ adminSession: v }),
      _checkoutReturn: null,

      // ── Alzheimer Mode ──────────────────────────────────────────────
      alzheimerMode: { ...ALZHEIMER_MODE_DEFAULT } as AlzheimerMode,
      setAlzheimerMode: (a) => set((s) => ({ alzheimerMode: { ...s.alzheimerMode, ...a } })),

      // ── Alzheimer Wards ──────────────────────────────────────────────
      alzheimerWards: [] as AlzheimerWard[],
      addAlzheimerWard: (ward) => set((s) => ({
        alzheimerWards: (s.adminSession || s.alzheimerWards.length < 2) ? [...s.alzheimerWards, ward] : s.alzheimerWards,
      })),
      updateAlzheimerWard: (id, changes) => set((s) => ({
        alzheimerWards: s.alzheimerWards.map((w) => w.id === id ? { ...w, ...changes } : w),
      })),
      removeAlzheimerWard: (id) => set((s) => ({
        alzheimerWards: s.alzheimerWards.filter((w) => w.id !== id),
      })),

      // ── Travel Mode ─────────────────────────────────────────────────
      travelMode: { active: false, destination: '', checkInMorning: '08:00', checkInEvening: '20:00', lastCheckIn: null, missedCheckIns: 0 } as TravelMode,
      setTravelMode: (t) => set((s) => ({ travelMode: { ...s.travelMode, ...t } })),

      // ── Système de Parrainage Platinum ──────────────────────────────────

      // Défense : toujours un tableau, jamais undefined après rehydratation

      sponsorCodes: [] as SponsorCode[],



      generateSponsorCode: (sponsorPhone, sponsorName) => {

        const arr  = new Uint32Array(1);

        crypto.getRandomValues(arr);

        const code = String(arr[0] % 1_000_000).padStart(6, '0');



        const now     = new Date();

        const expires = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72h



        const sponsorCode: SponsorCode = {

          code,

          sponsorPhone,

          sponsorName,

          createdAt: now.toISOString(),

          expiresAt: expires.toISOString(),

          used:      false,

        };



        set((s) => ({

          // Remplace tout code précédent non utilisé de ce parrain

          sponsorCodes: [

            ...s.sponsorCodes.filter(

              (c) => c.sponsorPhone !== sponsorPhone || c.used,

            ),

            sponsorCode,

          ],

          // Marque l'utilisateur courant comme parrain

          user: {

            ...s.user,

            sponsorRole: 'sponsor' as const,

          },

        }));



        return sponsorCode;

      },



      redeemSponsorCode: (code, allSponsorCodes) => {

        // Cherche dans les codes fournis (tous les codes du store du parrain)

        const found = allSponsorCodes.find(

          (c) =>

            c.code === code &&

            !c.used &&

            new Date(c.expiresAt) > new Date(),

        );



        if (!found) return null;



        const link: SponsorLink = {

          sponsorPhone: found.sponsorPhone,

          sponsorName:  found.sponsorName,

          linkedAt:     new Date().toISOString(),

        };



        // Passe l'invité en Platinum avec le lien parrain

        set((s) => ({

          user: {

            ...s.user,

            subscription:   'platinum' as const,

            sponsorRole:    'guest'    as const,

            sponsorLink:    link,

            platinumConfig: s.user.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,

          },

          // Contact parrain obligatoire injecté automatiquement

          contacts: [

            {

              id:           'sponsor-contact',

              name:         found.sponsorName,

              phone:        found.sponsorPhone,

              priority:     'primary' as const,

              relationship: 'Parrain Vigilink-SOS',

              createdAt:    new Date().toISOString(),

            },

            // Garde les contacts existants sauf l'éventuel ancien contact parrain

            ...s.contacts.filter((c) => c.id !== 'sponsor-contact'),

          ].slice(0, 2), // Max 2 contacts pour l'invité

        }));



        return link;

      },

    }),

    {

      name: 'vigilinksos-storage',

      partialize: (s) => ({

        user:                 s.user,

        contacts:             s.contacts,

        timerDuration:        s.timerDuration,

        onboardingComplete:   s.onboardingComplete,

        alertQueue:           s.alertQueue,

        checklist:            s.checklist,

        alertHistory:         s.alertHistory,

        familyMembers:        s.familyMembers,

        invitationCodes:      s.invitationCodes,

        platinumSoundProfile: s.platinumSoundProfile,

        sponsorCodes:         s.sponsorCodes,

        medicalProfile:       s.medicalProfile,

        meetingMode:          s.meetingMode,

        journalEntries:       s.journalEntries,

        travelMode:           s.travelMode,

        alzheimerMode:        s.alzheimerMode,

        fakeCallConfig:       s.fakeCallConfig,

      }),

      // Sanitise le profil utilisateur immédiatement après chargement

      // depuis localStorage — évite tout champ undefined dans l'UI

      onRehydrateStorage: () => (state) => {

        if (state?.user) {

          state.user        = sanitiseUserProfile(state.user);

          if (!state.user.profileId) {
            state.user.profileId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
          }

          if (!state.alzheimerMode) {
            state.alzheimerMode = { ...ALZHEIMER_MODE_DEFAULT };
          }

          state.sponsorCodes = Array.isArray(state.sponsorCodes)

            ? state.sponsorCodes.filter(

                (c) => c && typeof c.code === 'string' && c.code.length === 6,

              )

            : [];

        }

      },

    }

  )

);

