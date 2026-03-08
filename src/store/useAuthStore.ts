/**
 * useAuthStore — Authentification Vigilink-SOS
 *
 * Systeme de connexion par numero de telephone + mot de passe.
 * Les comptes sont persistes dans localStorage (Zustand persist).
 *
 * Fonctionnalites :
 *   - Inscription : cree un nouveau compte lie au numero de telephone.
 *   - Connexion   : verifie le couple telephone/mot de passe, restaure le profil.
 *   - Deconnexion : efface la session active, le profil reste en memoire.
 *   - Reconnexion : le meme numero retrouve son abonnement et ses contacts.
 *   - Essai 24h   : cree une session trial avec expiration automatique.
 *   - Plan Switcher (DEV) : bascule instantanement entre FREE, PRO, PLATINUM.
 *
 * Note securite MVP : mot de passe stocke en clair localement.
 * En production → bcrypt cote serveur + JWT.
 *
 * Admin : Gilles
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthAccount, SubscriptionPlan, EmergencyContact, PlatinumConfig, SponsorRole, SponsorLink, SponsorCode, OtpInvitation } from '../types';
import { PLATINUM_CONFIG_DEFAUT } from '../types';
import { saveProfileToServer } from '../lib/profileSync';

// ── Numero de telephone de Gilles — compte Admin toujours present ─────────────
const PHONE_ADMIN = '+14383678183';

// ── Duree de l'essai gratuit : 24 heures en millisecondes ────────────────────
const DUREE_ESSAI_MS = 24 * 60 * 60 * 1000;

// ── OTP en memoire (non persiste — expire a chaque session) ──────────────────
const otpEnCours: Map<string, { code: string; expiresAt: number }> = new Map();

// ── Types de retour explicites ────────────────────────────────────────────────
type LoginResult       = 'ok' | 'wrong_password' | 'not_found';
type RegisterResult    = 'ok' | 'already_exists';
type OtpResult         = 'ok' | 'not_found';
type ValidateResult    = 'ok' | 'wrong_code' | 'expired' | 'not_found';
type PasswordResult    = 'ok' | 'wrong_current' | 'same_password' | 'not_found';
type ResetResult       = 'ok' | 'not_found';
type CreateOtpResult   = { status: 'ok'; invitation: OtpInvitation } | { status: 'error'; reason: string };
type ValidateOtpResult = 'ok' | 'wrong_code' | 'expired' | 'not_found' | 'already_used';

// ── Interface du store ────────────────────────────────────────────────────────

interface AuthStore {
  /** Liste de tous les comptes enregistres, indexes par numero de telephone. */
  comptes: Record<string, AuthAccount>;

  /** Numero de telephone du compte actuellement connecte. Null si deconnecte. */
  sessionPhone: string | null;

  /** Compte actuellement connecte (derive de sessionPhone + comptes). */
  compteActif: AuthAccount | null;

  /** true si une session est active. */
  estConnecte: boolean;

  /**
   * Numero de telephone memorise par "Rester connecte".
   * Permet de pre-remplir le champ telephone a la prochaine ouverture.
   */
  rememberMePhone: string | null;

  /** Tente de se connecter avec le couple telephone/mot de passe. */
  login: (phone: string, password: string) => LoginResult;

  /** Cree un nouveau compte et connecte l'utilisateur. */
  register: (phone: string, password: string, name: string) => RegisterResult;

  /** Deconnecte l'utilisateur. La session est effacee, le compte reste. */
  logout: () => void;

  /** Active l'essai gratuit 24h pour le compte connecte. */
  activerEssai: () => void;

  /** Bascule le plan du compte connecte (DEV uniquement). */
  changerPlan: (plan: SubscriptionPlan) => void;

  /** Synchronise les contacts du compte actif. */
  syncContacts: (contacts: EmergencyContact[]) => void;

  /** Synchronise le nom du profil du compte actif. */
  syncNom: (name: string) => void;

  /** Synchronise la configuration Platinum du compte actif. */
  syncPlatinumConfig: (config: PlatinumConfig) => void;

  /**
   * Synchronise les réglages de sécurité du compte actif
   * (codes PIN, numéros PRO). Appelé depuis SettingsView au moment de Sauvegarder.
   */
  syncSettings: (settings: {
    normalCode?: string;
    duressCode?: string;
    proPhone1?:  string;
    proPhone2?:  string;
  }) => void;

  // ── Parrainage ─────────────────────────────────────────────────────────────
  /** Synchronise le rôle de parrainage du compte actif. */
  syncSponsorRole: (role: SponsorRole) => void;

  /** Synchronise le lien parrain du compte actif (invité uniquement). */
  syncSponsorLink: (link: SponsorLink | null) => void;

  /** Synchronise les codes de parrainage générés par ce parrain. */
  syncSponsorCodes: (codes: SponsorCode[]) => void;

  /**
   * Marque un code de parrainage comme utilisé dans tous les comptes.
   * Appelé après qu'un invité a activé le code.
   */
  markSponsorCodeUsed: (code: string) => void;

  /**
   * Retourne tous les codes de parrainage de tous les comptes (parrain).
   * Permet à un invité de valider un code généré par n'importe quel parrain.
   */
  getAllSponsorCodes: () => SponsorCode[];

  // ── Invitations OTP ────────────────────────────────────────────────────────

  /**
   * Toutes les invitations OTP en cours (persistées).
   * Clé : numéro de téléphone de l'invité (normalisé E.164).
   */
  otpInvitations: Record<string, OtpInvitation>;

  /**
   * Crée une invitation OTP pour un invité donné.
   * Le parrain fournit son propre numéro/nom et le numéro du téléphone invité.
   * Génère un code à 6 chiffres valide 15 minutes, persisté dans le store.
   */
  creerInvitationOTP: (
    guestPhone:   string,
    sponsorPhone: string,
    sponsorName:  string,
    giftPlan?:    import('../types').SubscriptionPlan,
  ) => CreateOtpResult;

  /**
   * Valide un code OTP saisi par l'invité.
   * Si valide, crée son compte 'Invité Platinum' avec le parrain en contact #1,
   * puis ouvre sa session automatiquement.
   * Retourne 'ok' si tout s'est bien passé.
   */
  validerInvitationOTP: (
    guestPhone: string,
    code:       string,
    guestName:  string,
  ) => ValidateOtpResult;

  supprimerInvitation: (invId: string) => void;

  /** Retourne true si l'essai est expire. */
  essaiExpire: () => boolean;

  /** Sauvegarde ou efface le numero "Rester connecte". */
  setRememberMe: (phone: string | null) => void;

  /** Genere un OTP a 6 chiffres pour le numero de telephone donne. */
  demanderResetOTP: (rawPhone: string) => OtpResult;

  /** Verifie le code OTP saisi par l'utilisateur. */
  validerResetOTP: (rawPhone: string, code: string) => ValidateResult;

  /** Change le mot de passe du compte connecte. */
  changerMotDePasse: (
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ) => PasswordResult;

  /** Reinitialise le mot de passe apres validation OTP reussie. */
  reinitialiserMotDePasse: (rawPhone: string, nouveauMotDePasse: string) => ResetResult;

  /**
   * Connecte un compte existant SANS mot de passe.
   * Réservé au flux de récupération — appelé après validerResetOTP réussi.
   * Restaure tous les contacts, abonnement et données sauvegardées.
   */
  loginSansMotDePasse: (rawPhone: string) => LoginResult;
}

// ── Normalisation du numero de telephone ─────────────────────────────────────
function normaliserTelephone(raw: string): string {
  const chiffres = raw.replace(/\D/g, '');
  if (chiffres.length === 10) return '+1' + chiffres;
  if (chiffres.length === 11 && chiffres.startsWith('1')) return '+' + chiffres;
  return '+' + chiffres;
}

// ── Compte Gilles par defaut (DEV) ───────────────────────────────────────────
const COMPTE_GILLES: AuthAccount = {
  phone:          PHONE_ADMIN,
  password:       '123456789',
  subscription:   'free',
  trialExpiresAt: null,
  profileName:    'Gilles',
  contacts:       [],
  platinumConfig: PLATINUM_CONFIG_DEFAUT,
  normalCode:     '1234',
  duressCode:     '9999',
  createdAt:      new Date().toISOString(),
  lastLoginAt:    null,
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      comptes:         { [PHONE_ADMIN]: COMPTE_GILLES },
      sessionPhone:    null,
      compteActif:     null,
      estConnecte:     false,
      rememberMePhone: null,

      // ── login ─────────────────────────────────────────────────────────────
      login: (rawPhone, password): LoginResult => {
        const phone   = normaliserTelephone(rawPhone);
        const comptes = get().comptes;
        const compte  = comptes[phone];

        if (!compte) return 'not_found';
        if (compte.password !== password) return 'wrong_password';

        const compteMAJ: AuthAccount = {
          ...compte,
          lastLoginAt: new Date().toISOString(),
        };

        set({
          comptes:      { ...comptes, [phone]: compteMAJ },
          sessionPhone: phone,
          compteActif:  compteMAJ,
          estConnecte:  true,
        });

        return 'ok';
      },

      // ── register ──────────────────────────────────────────────────────────
      register: (rawPhone, password, name): RegisterResult => {
        const phone   = normaliserTelephone(rawPhone);
        const comptes = get().comptes;

        if (comptes[phone]) return 'already_exists';

        const nouveauCompte: AuthAccount = {
          phone,
          password,
          subscription:   'free',
          trialExpiresAt: null,
          profileName:    name,
          contacts:       [],
          platinumConfig: null,
          normalCode:     '1234',
          duressCode:     '9999',
          createdAt:      new Date().toISOString(),
          lastLoginAt:    new Date().toISOString(),
        };

        set({
          comptes:      { ...comptes, [phone]: nouveauCompte },
          sessionPhone: phone,
          compteActif:  nouveauCompte,
          estConnecte:  true,
        });

        return 'ok';
      },

      // ── logout ────────────────────────────────────────────────────────────
      logout: () => {
        const { sessionPhone, comptes } = get();
        if (sessionPhone) {
          const compte = comptes[sessionPhone];
          if (compte?.isOtpGuest) {
            const { [sessionPhone]: _, ...reste } = comptes;
            set({ comptes: reste, sessionPhone: null, compteActif: null, estConnecte: false });
            return;
          }
        }
        set({ sessionPhone: null, compteActif: null, estConnecte: false });
      },

      // ── activerEssai ──────────────────────────────────────────────────────
      activerEssai: () => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = {
          ...compte,
          subscription:   'trial',
          trialExpiresAt: new Date(Date.now() + DUREE_ESSAI_MS).toISOString(),
        };

        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── changerPlan (DEV) ─────────────────────────────────────────────────
      changerPlan: (plan) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = {
          ...compte,
          subscription:   plan,
          trialExpiresAt: plan === 'trial'
            ? new Date(Date.now() + DUREE_ESSAI_MS).toISOString()
            : null,
        };

        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── syncContacts ──────────────────────────────────────────────────────
      syncContacts: (contacts) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = { ...compte, contacts };
        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── syncNom ───────────────────────────────────────────────────────────
      syncNom: (name) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = { ...compte, profileName: name };
        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── syncPlatinumConfig ────────────────────────────────────────────────
      syncPlatinumConfig: (config) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = { ...compte, platinumConfig: config };
        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── syncSettings ──────────────────────────────────────────────────────
      syncSettings: (settings) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;

        const compteMAJ: AuthAccount = { ...compte, ...settings };
        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
      },

      // ── Parrainage ────────────────────────────────────────────────────────

      syncSponsorRole: (role) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;
        const compteMAJ: AuthAccount = { ...compte, sponsorRole: role };
        set({ comptes: { ...comptes, [sessionPhone]: compteMAJ }, compteActif: compteMAJ });
      },

      syncSponsorLink: (link) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;
        const compteMAJ: AuthAccount = { ...compte, sponsorLink: link };
        set({ comptes: { ...comptes, [sessionPhone]: compteMAJ }, compteActif: compteMAJ });
      },

      syncSponsorCodes: (codes) => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return;
        const compte = comptes[sessionPhone];
        if (!compte) return;
        const compteMAJ: AuthAccount = { ...compte, sponsorCodes: codes };
        set({ comptes: { ...comptes, [sessionPhone]: compteMAJ }, compteActif: compteMAJ });
      },

      markSponsorCodeUsed: (code) => {
        const { comptes } = get();
        const comptesMAJ = Object.fromEntries(
          Object.entries(comptes).map(([phone, compte]) => {
            const codes = compte.sponsorCodes ?? [];
            const updated = codes.map((c) => c.code === code ? { ...c, used: true } : c);
            return [phone, { ...compte, sponsorCodes: updated }];
          }),
        );
        const { sessionPhone, compteActif } = get();
        set({
          comptes: comptesMAJ,
          compteActif: sessionPhone ? (comptesMAJ[sessionPhone] ?? compteActif) : compteActif,
        });
      },

      getAllSponsorCodes: () => {
        const { comptes } = get();
        return Object.values(comptes).flatMap((c) => c.sponsorCodes ?? []);
      },

      // ── Invitations OTP ───────────────────────────────────────────────────

      otpInvitations: {},

      creerInvitationOTP: (guestPhone, sponsorPhone, sponsorName, giftPlan): CreateOtpResult => {
        const phoneNorm = normaliserTelephone(guestPhone);
        if (phoneNorm.length < 10) {
          return { status: 'error', reason: 'Numéro de téléphone invalide.' };
        }

        const isAdminSponsor = sponsorPhone === PHONE_ADMIN;
        const { otpInvitations } = get();
        const invitationsDuParrain = Object.values(otpInvitations).filter(
          (inv) => inv.sponsorPhone === sponsorPhone,
        );
        if (!isAdminSponsor && invitationsDuParrain.length >= 10) {
          return { status: 'error', reason: 'Limite de 10 invitations atteinte.' };
        }

        const arr  = new Uint32Array(1);
        crypto.getRandomValues(arr);
        const code = String(arr[0] % 1_000_000).padStart(6, '0');

        const now     = new Date();
        const expires = new Date(now.getTime() + 15 * 60 * 1000);
        const id      = `${sponsorPhone}_${phoneNorm}_${now.getTime()}`;

        const invitation: OtpInvitation = {
          id,
          guestPhone:   phoneNorm,
          code,
          sponsorPhone,
          sponsorName,
          createdAt: now.toISOString(),
          expiresAt: expires.toISOString(),
          used:      false,
          ...(giftPlan ? { giftPlan } : {}),
        };

        set((s) => ({
          otpInvitations: {
            ...s.otpInvitations,
            [id]: invitation,
          },
        }));

        console.info(
          `[Vigilink-SOS OTP Invitation] Code pour ${phoneNorm} : ${code} ` +
          `(parrain: ${sponsorName} ${sponsorPhone}, valable 15 min)`,
        );

        return { status: 'ok', invitation };
      },

      validerInvitationOTP: (rawGuestPhone, code, guestName): ValidateOtpResult => {
        const phoneNorm = normaliserTelephone(rawGuestPhone);
        const { otpInvitations, comptes } = get();

        const invEntry = Object.entries(otpInvitations).find(
          ([, inv]) => inv.guestPhone === phoneNorm && inv.code === code.trim(),
        );
        if (!invEntry)                                        return 'not_found';
        const [invId, inv] = invEntry;
        if (inv.used)                                         return 'already_used';
        if (new Date(inv.expiresAt) <= new Date())            return 'expired';

        const contactParrain: EmergencyContact = {
          id:        'sponsor-contact',
          name:      inv.sponsorName,
          phone:     inv.sponsorPhone,
          priority:  'primary',
          createdAt: new Date().toISOString(),
        };

        const planInvité = inv.giftPlan || 'pro';
        const compteInvite: AuthAccount = {
          phone:          phoneNorm,
          password:       '',
          subscription:   planInvité,
          trialExpiresAt: null,
          profileName:    guestName.trim() || (planInvité === 'platinum' ? 'Invité PLATINUM' : planInvité === 'pro' ? 'Invité PRO' : 'Invité'),
          contacts:       [contactParrain],
          platinumConfig: null,
          normalCode:     '1234',
          duressCode:     '9999',
          createdAt:      new Date().toISOString(),
          lastLoginAt:    new Date().toISOString(),
          isOtpGuest:     true,
          sponsorRole:    'guest',
          sponsorLink:    {
            sponsorPhone: inv.sponsorPhone,
            sponsorName:  inv.sponsorName,
            linkedAt:     new Date().toISOString(),
          },
        };

        const invitationsMAJ: Record<string, OtpInvitation> = {
          ...otpInvitations,
          [invId]: { ...inv, used: true },
        };

        const comptesMAJ = { ...comptes, [phoneNorm]: compteInvite };

        set({
          comptes:        comptesMAJ,
          sessionPhone:   phoneNorm,
          compteActif:    compteInvite,
          estConnecte:    true,
          otpInvitations: invitationsMAJ,
        });

        return 'ok';
      },

      // ── supprimerInvitation ───────────────────────────────────────────────
      supprimerInvitation: (invId: string) => {
        const { otpInvitations, comptes } = get();
        const inv = otpInvitations[invId];
        if (!inv) return;

        const { [invId]: _, ...resteInvitations } = otpInvitations;

        const guestPhone = inv.guestPhone;
        const guestAccount = comptes[guestPhone];
        let comptesMAJ = comptes;
        if (guestAccount?.isOtpGuest) {
          const { [guestPhone]: __, ...resteComptes } = comptes;
          comptesMAJ = resteComptes;
        }

        set({ otpInvitations: resteInvitations, comptes: comptesMAJ });
      },

      // ── essaiExpire ───────────────────────────────────────────────────────
      essaiExpire: (): boolean => {
        const compte = get().compteActif;
        if (!compte || compte.subscription !== 'trial') return false;
        if (!compte.trialExpiresAt) return false;
        return new Date(compte.trialExpiresAt) <= new Date();
      },

      // ── setRememberMe ─────────────────────────────────────────────────────
      setRememberMe: (phone) => {
        set({ rememberMePhone: phone });
      },

      // ── demanderResetOTP ──────────────────────────────────────────────────
      demanderResetOTP: (rawPhone): OtpResult => {
        const phone  = normaliserTelephone(rawPhone);
        const compte = get().comptes[phone];
        if (!compte) return 'not_found';

        const code      = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpEnCours.set(phone, { code, expiresAt });

        console.info(
          `[Vigilink-SOS OTP] Code de reinitialisation pour ${phone} : ${code} (valable 5 min)`,
        );

        return 'ok';
      },

      // ── validerResetOTP ───────────────────────────────────────────────────
      validerResetOTP: (rawPhone, code): ValidateResult => {
        const phone = normaliserTelephone(rawPhone);
        if (!get().comptes[phone]) return 'not_found';

        const otp = otpEnCours.get(phone);
        if (!otp) return 'wrong_code';
        if (Date.now() > otp.expiresAt) {
          otpEnCours.delete(phone);
          return 'expired';
        }
        if (otp.code !== code.trim()) return 'wrong_code';

        return 'ok';
      },

      // ── changerMotDePasse ─────────────────────────────────────────────────
      changerMotDePasse: (motDePasseActuel, nouveauMotDePasse): PasswordResult => {
        const { sessionPhone, comptes } = get();
        if (!sessionPhone) return 'not_found';

        const compte = comptes[sessionPhone];
        if (!compte) return 'not_found';

        if (compte.password !== motDePasseActuel) return 'wrong_current';
        if (compte.password === nouveauMotDePasse) return 'same_password';

        const compteMAJ: AuthAccount = { ...compte, password: nouveauMotDePasse };
        set({
          comptes:     { ...comptes, [sessionPhone]: compteMAJ },
          compteActif: compteMAJ,
        });
        return 'ok';
      },

      // ── loginSansMotDePasse ───────────────────────────────────────────────
      loginSansMotDePasse: (rawPhone): LoginResult => {
        const phone  = normaliserTelephone(rawPhone);
        const { comptes } = get();
        const compte = comptes[phone];
        if (!compte) return 'not_found';

        otpEnCours.delete(phone);

        const compteMAJ: AuthAccount = {
          ...compte,
          lastLoginAt: new Date().toISOString(),
        };

        set({
          comptes:      { ...comptes, [phone]: compteMAJ },
          sessionPhone: phone,
          compteActif:  compteMAJ,
          estConnecte:  true,
        });

        return 'ok';
      },

      // ── reinitialiserMotDePasse ───────────────────────────────────────────
      reinitialiserMotDePasse: (rawPhone, nouveauMotDePasse): ResetResult => {
        const phone  = normaliserTelephone(rawPhone);
        const { comptes, sessionPhone, compteActif } = get();
        const compte = comptes[phone];
        if (!compte) return 'not_found';

        otpEnCours.delete(phone);
        const compteMAJ: AuthAccount = { ...compte, password: nouveauMotDePasse };
        const comptesMAJ = { ...comptes, [phone]: compteMAJ };

        set({
          comptes:     comptesMAJ,
          compteActif: sessionPhone === phone ? compteMAJ : compteActif,
        });
        return 'ok';
      },
    }),
    {
      name: 'vigilinksos-auth',
      partialize: (s) => ({
        comptes:         s.comptes,
        sessionPhone:    s.sessionPhone,
        compteActif:     s.compteActif,
        estConnecte:     s.estConnecte,
        rememberMePhone: s.rememberMePhone,
        otpInvitations:  s.otpInvitations,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const patchedComptes: typeof state.comptes = {};
        for (const [phone, compte] of Object.entries(state.comptes)) {
          patchedComptes[phone] = {
            ...compte,
            normalCode:  compte.normalCode  || '1234',
            duressCode:  compte.duressCode  || '9999',
            profileName: compte.profileName || 'Utilisateur',
          };
        }
        if (!patchedComptes[PHONE_ADMIN]) {
          patchedComptes[PHONE_ADMIN] = COMPTE_GILLES;
        } else {
          patchedComptes[PHONE_ADMIN] = {
            ...COMPTE_GILLES,
            ...patchedComptes[PHONE_ADMIN],
            password: COMPTE_GILLES.password,
          };
        }
        if (state.compteActif && state.compteActif.phone === PHONE_ADMIN) {
          state.compteActif = {
            ...state.compteActif,
            ...patchedComptes[PHONE_ADMIN],
            subscription: state.compteActif.subscription || patchedComptes[PHONE_ADMIN].subscription,
          };
        }
        state.comptes = patchedComptes;
        if (state.compteActif) {
          state.compteActif = {
            ...state.compteActif,
            normalCode:  state.compteActif.normalCode  || '1234',
            duressCode:  state.compteActif.duressCode  || '9999',
            profileName: state.compteActif.profileName || 'Utilisateur',
          };
        }
        if (!state.otpInvitations || typeof state.otpInvitations !== 'object') {
          state.otpInvitations = {};
        }
        const now = Date.now();
        state.otpInvitations = Object.fromEntries(
          Object.entries(state.otpInvitations).filter(
            ([, inv]) => !inv.used && new Date(inv.expiresAt).getTime() > now,
          ),
        );
      },
    },
  ),
);

let syncDebounce: ReturnType<typeof setTimeout> | null = null;
useAuthStore.subscribe((state, prevState) => {
  const phone = state.sessionPhone;
  if (!phone) return;
  const account = state.comptes[phone];
  const prevAccount = prevState.comptes[phone];
  if (!account || account === prevAccount) return;
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => {
    saveProfileToServer(phone, account);
  }, 2000);
});
