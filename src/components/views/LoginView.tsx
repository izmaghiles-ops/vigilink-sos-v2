/**
 * LoginView — Connexion, Inscription et Récupération Vigilink-SOS
 *
 * FIX CURSEUR : Champ est défini au niveau MODULE (hors du composant LoginView).
 * Si Champ est défini à l'intérieur de LoginView, React recrée le composant
 * à chaque frappe → démontage/remontage de l'<input> → perte de focus du curseur.
 * En le sortant au niveau module, React réutilise la même instance → focus stable.
 *
 * Modes :
 *   - login    : telephone + mot de passe existants.
 *   - register : nouveau compte avec nom, telephone, mot de passe.
 *   - otp      : invitation Platinum via code parrain.
 *   - recovery : récupération sans mot de passe via OTP SMS (3 étapes).
 *
 * Compte test Giles :
 *   Telephone : +1 514 000 0000  (ou 5140000000)
 *   Mot de passe : 1111
 *   Plan : Platinum (pour tester tous les modes)
 *
 * Admin : Giles
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, User, Eye, EyeOff,
  AlertCircle, CheckCircle, Crown, Key,
  ArrowLeft, MessageSquare, Unlock, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore }  from '../../store/useAppStore';
import { PLATINUM_CONFIG_DEFAUT } from '../../types';
import { PhoneField } from '../PhoneField';
import { apiUrl } from '../../lib/apiBase';
import { loadProfileFromServer, saveProfileToServer } from '../../lib/profileSync';
import { Capacitor } from '@capacitor/core';
import type { AuthAccount } from '../../types';

type Mode = 'login' | 'register' | 'otp' | 'recovery';

// Étapes du flux de récupération (mode hors-onglet)
type RecoveryStep = 'phone' | 'code' | 'reset' | 'done';

// ── Champ — composant MODULE-LEVEL (jamais redéfini à chaque render) ──────────
// CRITIQUE : ce composant DOIT être défini ici, hors de LoginView,
// pour éviter que React ne démonte/remonte l'<input> à chaque frappe.
interface ChampProps {
  id:          string;
  icone:       React.ReactNode;
  label:       string;
  type:        string;
  valeur:      string;
  onChange:    (v: string) => void;
  onKeyDown?:  (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  suffixe?:    React.ReactNode;
  autoFocus?:  boolean;
  autoComplete?: string;
  inputMode?:  React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

const Champ: React.FC<ChampProps> = ({
  id, icone, label, type, valeur, onChange, onKeyDown,
  placeholder, suffixe, autoFocus, autoComplete, inputMode,
}) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm text-gray-400 uppercase tracking-wider font-bold">
      {label}
    </label>
    <div className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-xl px-4 py-4 focus-within:border-red-500/40 transition-colors">
      <span className="text-gray-500 shrink-0">{icone}</span>
      <input
        id={id}
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete ?? 'off'}
        inputMode={inputMode}
        className="flex-1 bg-transparent text-base text-foreground placeholder-gray-500 focus:outline-none"
      />
      {suffixe}
    </div>
  </div>
);

// ── Note : PhoneField est importé depuis ../PhoneField (composant unifié) ────
// Le composant unifié gère : sélecteur de pays, drapeaux SVG, recherche filtrable
// (startsWith prioritaire), format E.164, détection automatique du pays.

// ─────────────────────────────────────────────────────────────────────────────

export const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const { login, register, validerInvitationOTP, reinitialiserMotDePasse } = useAuthStore();
  const { setUser, setContacts, setView } = useAppStore();

  const [mode,           setMode]           = useState<Mode>('login');
  // telephone : valeur E.164 directe — PhoneField unifié expose directement +indicatif+numéro
  const [telephone,      setTelephone]      = useState('');
  const [motDePasse,     setMotDePasse]     = useState('');
  const [nom,            setNom]            = useState('');
  const [otpCode,        setOtpCode]        = useState('');
  const [visible,        setVisible]        = useState(false);
  const [erreur,         setErreur]         = useState<string | null>(null);
  const [succes,         setSucces]         = useState(false);
  const [chargement,     setChargement]     = useState(false);

  const [showAdmin,      setShowAdmin]      = useState(false);
  const [adminPhone,     setAdminPhone]     = useState('');
  const [adminEmail,     setAdminEmail]     = useState('');
  const [adminPwd,       setAdminPwd]       = useState('');
  const [adminErr,       setAdminErr]       = useState(false);
  const [adminErrMsg,    setAdminErrMsg]    = useState('');
  const [adminLoading,   setAdminLoading]   = useState(false);
  const [adminStep,      setAdminStep]      = useState<'creds' | 'code'>('creds');
  const [adminCode,      setAdminCode]      = useState('');
  const [adminCodeSent,  setAdminCodeSent]  = useState(false);
  // Vrai si les champs ont été pré-remplis depuis les params URL (?mode=invite)
  const [urlAutoRempli,  setUrlAutoRempli]  = useState(false);

  // ── Recovery state ────────────────────────────────────────────────────────
  const [recoveryStep,        setRecoveryStep]        = useState<RecoveryStep>('phone');
  // recoveryPhone : valeur E.164 directe — PhoneField unifié
  const [recoveryPhone,       setRecoveryPhone]       = useState('');
  const [recoveryOtp,    setRecoveryOtp]    = useState('');
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPassword,setConfirmPassword]= useState('');
  const [newPwVisible,   setNewPwVisible]   = useState(false);
  const [confirmPwVisible,setConfirmPwVisible] = useState(false);
  

  // ── Auto-remplissage via paramètres URL ───────────────────────────────────
  // Déclenché une seule fois au montage du composant.
  //
  // Paramètres supportés :
  //   ?mode=invite          → active l'onglet "Invité" (mode OTP)
  //   &phone=+15140000000   → pré-remplit le numéro (E.164 → PhoneField)
  //   &otp=123456           → pré-remplit le code OTP
  //
  // Flux complet :
  //   1. L'invité reçoit le SMS avec le lien intelligent
  //   2. Il clique → LoginView se monte avec les params dans l'URL
  //   3. Ce useEffect lit les params, bascule sur l'onglet Invité,
  //      pré-remplit numéro E.164 + OTP (PhoneField unifié décode le pays)
  //   4. L'invité saisit uniquement son nom et clique "Activer"
  //   5. Les params sont retirés de l'URL (replaceState) pour éviter
  //      un re-remplissage si l'utilisateur recharge la page
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const urlMode  = params.get('mode');
    const urlPhone = params.get('phone');
    const urlOtp   = params.get('otp');

    if (urlMode !== 'invite') return;

    setMode('otp');

    // PhoneField unifié accepte directement une valeur E.164 via la prop `value`
    // et détecte automatiquement le pays correspondant à l'indicatif
    if (urlPhone) {
      setTelephone(decodeURIComponent(urlPhone).trim());
    }

    if (urlOtp) {
      setOtpCode(decodeURIComponent(urlOtp).replace(/\D/g, '').slice(0, 6));
    }

    const urlPropre = window.location.pathname;
    window.history.replaceState({}, '', urlPropre);
    setUrlAutoRempli(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reinitialiser = useCallback(() => {
    setErreur(null);
    setSucces(false);
    setOtpCode('');
  }, []);

  const handleLogin = useCallback(async () => {
    reinitialiser();
    if (!telephone.trim() || !motDePasse.trim()) {
      setErreur(t('login.errors.phoneAndPasswordRequired'));
      return;
    }
    setChargement(true);
    await new Promise((r) => setTimeout(r, 600));
    const resultat = login(telephone.trim(), motDePasse.trim());

    if (resultat === 'ok') {
      const compte = useAuthStore.getState().compteActif;
      if (compte) {
        const serverProfile = await loadProfileFromServer(compte.phone, motDePasse.trim());
        if (serverProfile) {
          const merged: AuthAccount = {
            ...compte,
            profileName:    serverProfile.profileName || compte.profileName,
            subscription:   serverProfile.subscription || compte.subscription,
            trialExpiresAt: serverProfile.trialExpiresAt ?? compte.trialExpiresAt,
            contacts:       serverProfile.contacts?.length ? serverProfile.contacts : compte.contacts,
            platinumConfig: serverProfile.platinumConfig ?? compte.platinumConfig,
            normalCode:     serverProfile.normalCode || compte.normalCode,
            duressCode:     serverProfile.duressCode || compte.duressCode,
            proPhone1:      serverProfile.proPhone1 || compte.proPhone1,
            proPhone2:      serverProfile.proPhone2 || compte.proPhone2,
            sponsorRole:    serverProfile.sponsorRole ?? compte.sponsorRole,
            sponsorLink:    serverProfile.sponsorLink ?? compte.sponsorLink,
            sponsorCodes:   serverProfile.sponsorCodes ?? compte.sponsorCodes,
          };
          const authState = useAuthStore.getState();
          useAuthStore.setState({
            comptes: { ...authState.comptes, [compte.phone]: merged },
            compteActif: merged,
          });
          setUser({
            name:           merged.profileName,
            phone:          merged.phone,
            subscription:   merged.subscription,
            platinumConfig: merged.platinumConfig ?? undefined,
          });
          if (merged.contacts.length > 0) setContacts(merged.contacts);
        } else {
          setUser({
            name:           compte.profileName,
            phone:          compte.phone,
            subscription:   compte.subscription,
            platinumConfig: compte.platinumConfig ?? undefined,
          });
          if (compte.contacts.length > 0) setContacts(compte.contacts);
          saveProfileToServer(compte.phone, compte);
        }
      }
      useAppStore.getState().setAdminSession(false);
      setChargement(false);
      setSucces(true);
    } else if (resultat === 'not_found') {
      const digits = telephone.trim().replace(/\D/g, '');
      const normalizedPhone = digits.length === 10 ? '+1' + digits : (digits.length === 11 && digits.startsWith('1') ? '+' + digits : '+' + digits);
      const serverProfile = await loadProfileFromServer(normalizedPhone, motDePasse.trim());
      if (!serverProfile) {
        setChargement(false);
        setErreur(t('login.errors.noAccount'));
        return;
      }
      const registerResult = register(telephone.trim(), motDePasse.trim(), serverProfile.profileName || 'Utilisateur');
      if (registerResult === 'ok') {
        const compte = useAuthStore.getState().compteActif;
        if (compte && serverProfile) {
          const merged: AuthAccount = {
            ...compte,
            profileName:    serverProfile.profileName || compte.profileName,
            subscription:   serverProfile.subscription || compte.subscription,
            trialExpiresAt: serverProfile.trialExpiresAt ?? compte.trialExpiresAt,
            contacts:       serverProfile.contacts?.length ? serverProfile.contacts : compte.contacts,
            platinumConfig: serverProfile.platinumConfig ?? compte.platinumConfig,
            normalCode:     serverProfile.normalCode || compte.normalCode,
            duressCode:     serverProfile.duressCode || compte.duressCode,
            proPhone1:      serverProfile.proPhone1 || compte.proPhone1,
            proPhone2:      serverProfile.proPhone2 || compte.proPhone2,
            sponsorRole:    serverProfile.sponsorRole ?? compte.sponsorRole,
            sponsorLink:    serverProfile.sponsorLink ?? compte.sponsorLink,
            sponsorCodes:   serverProfile.sponsorCodes ?? compte.sponsorCodes,
          };
          const authState = useAuthStore.getState();
          useAuthStore.setState({
            comptes: { ...authState.comptes, [compte.phone]: merged },
            compteActif: merged,
          });
          setUser({
            name:           merged.profileName,
            phone:          merged.phone,
            subscription:   merged.subscription,
            platinumConfig: merged.platinumConfig ?? undefined,
          });
          if (merged.contacts.length > 0) setContacts(merged.contacts);
        }
        useAppStore.getState().setAdminSession(false);
        setChargement(false);
        setSucces(true);
      } else {
        setChargement(false);
        setErreur(t('login.errors.noAccount'));
      }
    } else {
      setChargement(false);
      setErreur(t('login.errors.wrongPassword'));
    }
  }, [telephone, motDePasse, login, register, setUser, setContacts, reinitialiser]);

  const handleRegister = useCallback(async () => {
    if (!nom.trim()) {
      setErreur(t('login.errors.nameRequiredFull'));
      return;
    }
    if (!telephone.trim()) {
      setErreur(t('login.errors.phoneRequiredFull'));
      return;
    }
    if (motDePasse.length < 4) {
      setErreur(t('login.errors.passwordMin4'));
      return;
    }
    setChargement(true);
    await new Promise((r) => setTimeout(r, 600));
    const resultat = register(telephone.trim(), motDePasse.trim(), nom.trim());

    if (resultat === 'ok') {
      const compte = useAuthStore.getState().compteActif;
      if (compte) {
        const serverProfile = await loadProfileFromServer(compte.phone, motDePasse.trim());
        if (serverProfile) {
          const merged: AuthAccount = {
            ...compte,
            profileName:    serverProfile.profileName || compte.profileName,
            subscription:   serverProfile.subscription || compte.subscription,
            trialExpiresAt: serverProfile.trialExpiresAt ?? compte.trialExpiresAt,
            contacts:       serverProfile.contacts?.length ? serverProfile.contacts : compte.contacts,
            platinumConfig: serverProfile.platinumConfig ?? compte.platinumConfig,
            normalCode:     serverProfile.normalCode || compte.normalCode,
            duressCode:     serverProfile.duressCode || compte.duressCode,
            proPhone1:      serverProfile.proPhone1 || compte.proPhone1,
            proPhone2:      serverProfile.proPhone2 || compte.proPhone2,
            sponsorRole:    serverProfile.sponsorRole ?? compte.sponsorRole,
            sponsorLink:    serverProfile.sponsorLink ?? compte.sponsorLink,
            sponsorCodes:   serverProfile.sponsorCodes ?? compte.sponsorCodes,
          };
          const authState = useAuthStore.getState();
          useAuthStore.setState({
            comptes: { ...authState.comptes, [compte.phone]: merged },
            compteActif: merged,
          });
          setUser({
            name:           merged.profileName,
            phone:          merged.phone,
            subscription:   merged.subscription,
            platinumConfig: merged.platinumConfig ?? undefined,
          });
          if (merged.contacts.length > 0) setContacts(merged.contacts);
        } else {
          setUser({ name: nom.trim(), phone: telephone.trim(), subscription: 'free' });
          saveProfileToServer(compte.phone, compte);
        }
      }
      setChargement(false);
      setSucces(true);
    } else {
      setChargement(false);
      setErreur(t('login.errors.accountExistsFull'));
    }
  }, [nom, telephone, motDePasse, register, setUser, setContacts, reinitialiser]);

  const handleOTP = useCallback(async () => {
    reinitialiser();
    if (!nom.trim()) {
      setErreur(t('login.errors.otpNameRequired'));
      return;
    }
    if (!telephone.trim()) {
      setErreur(t('login.errors.otpPhoneRequired'));
      return;
    }
    const code = otpCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setErreur(t('login.errors.otpInvalid'));
      return;
    }
    setChargement(true);

    let serverResult: { ok: boolean; reason?: string; sponsorPhone?: string; sponsorName?: string } | null = null;
    try {
      const response = await fetch(apiUrl('/api/otp/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestPhone: telephone.trim(), code }),
      });
      serverResult = await response.json();
    } catch {
      serverResult = null;
    }

    if (serverResult?.ok && serverResult.sponsorPhone) {
      const { register } = useAuthStore.getState();
      register(telephone.trim(), '', nom.trim());

      const comptes = useAuthStore.getState().comptes;
      const phoneNorm = telephone.trim().startsWith('+') ? telephone.trim() : `+${telephone.trim().replace(/\D/g, '')}`;
      const existingKeys = Object.keys(comptes);
      const matchKey = existingKeys.find(k => k === phoneNorm || k.replace(/\D/g, '') === phoneNorm.replace(/\D/g, ''));
      const compte = matchKey ? comptes[matchKey] : null;

      if (compte) {
        const contactParrain = {
          id: 'sponsor-contact',
          name: serverResult.sponsorName || 'Sponsor',
          phone: serverResult.sponsorPhone,
          priority: 'primary' as const,
          createdAt: new Date().toISOString(),
        };

        const compteMAJ = {
          ...compte,
          subscription: 'pro' as const,
          isOtpGuest: true,
          sponsorRole: 'guest' as const,
          sponsorLink: {
            sponsorPhone: serverResult.sponsorPhone,
            sponsorName: serverResult.sponsorName || 'Sponsor',
            linkedAt: new Date().toISOString(),
          },
          contacts: [contactParrain, ...compte.contacts.filter(c => c.id !== 'sponsor-contact')],
        };

        useAuthStore.setState((s) => ({
          comptes: { ...s.comptes, [matchKey!]: compteMAJ },
          compteActif: compteMAJ,
          sessionPhone: matchKey,
          estConnecte: true,
        }));

        setUser({
          name: compteMAJ.profileName,
          phone: compteMAJ.phone,
          subscription: 'pro',
          sponsorRole: 'guest',
          sponsorLink: compteMAJ.sponsorLink,
          platinumConfig: compteMAJ.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,
        });
        if (compteMAJ.contacts.length > 0) setContacts(compteMAJ.contacts);
      }

      setChargement(false);
      setSucces(true);
      return;
    }

    const localResult = validerInvitationOTP(telephone.trim(), code, nom.trim());
    setChargement(false);

    if (localResult === 'ok') {
      const compte = useAuthStore.getState().compteActif;
      if (compte) {
        setUser({
          name:           compte.profileName,
          phone:          compte.phone,
          subscription:   'pro',
          sponsorRole:    'guest',
          sponsorLink:    compte.sponsorLink ?? null,
          platinumConfig: compte.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,
        });
        if (compte.contacts.length > 0) setContacts(compte.contacts);
      }
      setSucces(true);
    } else if (serverResult && !serverResult.ok) {
      const reason = serverResult.reason;
      if (reason === 'expired') setErreur(t('login.errors.otpExpired'));
      else if (reason === 'already_used') setErreur(t('login.errors.otpAlreadyUsed'));
      else if (reason === 'not_found') setErreur(t('login.errors.otpNotFound'));
      else setErreur(t('login.errors.otpWrong'));
    } else if (localResult === 'expired') {
      setErreur(t('login.errors.otpExpired'));
    } else if (localResult === 'already_used') {
      setErreur(t('login.errors.otpAlreadyUsed'));
    } else if (localResult === 'not_found') {
      setErreur(t('login.errors.otpNotFound'));
    } else {
      setErreur(t('login.errors.otpWrong'));
    }
  }, [nom, telephone, otpCode, validerInvitationOTP, setUser, setContacts, reinitialiser]);

  // ── Recovery handlers ─────────────────────────────────────────────────────

  const handleRecoveryPhone = useCallback(async () => {
    setErreur(null);
    const phoneDigits = recoveryPhone.trim().replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 8) {
      setErreur(t('login.errors.recoveryPhoneRequired'));
      return;
    }
    setChargement(true);
    const comptes = useAuthStore.getState().comptes ?? {};
    const existe = Object.values(comptes).some((c: any) =>
      c.phone.replace(/\D/g, '') === phoneDigits
    );
    if (!existe) {
      setChargement(false);
      setErreur(t('login.errors.recoveryNoAccount'));
      return;
    }
    try {
      const lang = localStorage.getItem('vigilink-language') || 'fr';
      const resp = await fetch(apiUrl('/api/recovery/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recoveryPhone.trim(), lang }),
      });
      const data = await resp.json();
      setChargement(false);
      if (!data.ok) {
        if (resp.status === 429) {
          setErreur(t('login.errors.adminTooManyAttempts'));
        } else {
          setErreur(t('login.errors.recoveryError'));
        }
        return;
      }
      setRecoveryStep('code');
    } catch {
      setChargement(false);
      setErreur(t('login.errors.recoveryError'));
    }
  }, [recoveryPhone, t]);

  const handleRecoveryCode = useCallback(async () => {
    setErreur(null);
    const code = recoveryOtp.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setErreur(t('login.errors.recoveryCodeInvalid'));
      return;
    }
    setChargement(true);
    try {
      const resp = await fetch(apiUrl('/api/recovery/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recoveryPhone.trim(), code }),
      });
      const data = await resp.json();
      setChargement(false);
      if (!data.ok) {
        if (resp.status === 429) {
          setErreur(t('login.errors.adminTooManyAttempts'));
        } else if (data.error?.includes('expired')) {
          setErreur(t('login.errors.otpExpired'));
        } else {
          setErreur(t('login.errors.recoveryCodeWrong'));
        }
        return;
      }
      setRecoveryStep('reset');
    } catch {
      setChargement(false);
      setErreur(t('login.errors.recoveryCodeWrong'));
    }
  }, [recoveryOtp, recoveryPhone, t]);

  const handleRecoveryReset = useCallback(async () => {
    setErreur(null);
    if (newPassword.length < 4) {
      setErreur(t('login.errors.recoveryPasswordShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErreur(t('login.errors.recoveryPasswordMismatch'));
      return;
    }
    setChargement(true);
    await new Promise((r) => setTimeout(r, 700));
    // recoveryPhone est en E.164 via PhoneField — on utilise les chiffres
    // pour la correspondance avec le store (qui stocke parfois sans le +)
    const phoneDigits = recoveryPhone.trim().replace(/\D/g, '');
    reinitialiserMotDePasse(phoneDigits, newPassword);
    // Connecter directement l'utilisateur avec les chiffres du numéro
    const resultat = login(phoneDigits, newPassword);
    setChargement(false);
    if (resultat === 'ok') {
      const compte = useAuthStore.getState().compteActif;
      if (compte) {
        setUser({
          name:           compte.profileName,
          phone:          compte.phone,
          subscription:   compte.subscription,
          platinumConfig: compte.platinumConfig ?? undefined,
        });
        if (compte.contacts.length > 0) setContacts(compte.contacts);
      }
      setRecoveryStep('done');
    } else {
      setErreur(t('login.errors.recoveryError'));
    }
  }, [newPassword, confirmPassword, recoveryPhone, reinitialiserMotDePasse, login, setUser, setContacts]);

  const resetRecovery = useCallback(() => {
    setRecoveryStep('phone');
    setRecoveryPhone('');
    setRecoveryOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErreur(null);
  }, []);

  const handleSubmit = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleOTP;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (mode === 'login')    handleLogin();
      else if (mode === 'otp') handleOTP();
      else                     handleRegister();
    }
  }, [mode, handleLogin, handleRegister, handleOTP]);

  const toggleVisible = useCallback(() => setVisible((v) => !v), []);

  const ADMIN_PHONE = '4383678183';
  const ADMIN_EMAIL = 'izmaghiles@gmail.com';
  const ADMIN_PWD   = '123456789';

  const adminPhoneE164 = '+1' + ADMIN_PHONE;

  const handleAdminLogin = useCallback(async () => {
    setAdminErr(false);
    setAdminErrMsg('');

    if (adminStep === 'creds') {
      if (!adminPhone.trim() || !adminEmail.trim() || !adminPwd.trim()) {
        setAdminErr(true);
        setAdminErrMsg(t('login.errors.adminFillAll'));
        return;
      }
      setAdminLoading(true);

      const phoneDigits = adminPhone.replace(/[^0-9]/g, '');
      const emailLower = adminEmail.trim().toLowerCase();
      const last10 = phoneDigits.slice(-10);
      const ok = last10 === ADMIN_PHONE && emailLower === ADMIN_EMAIL && adminPwd === ADMIN_PWD;

      if (!ok) {
        setAdminErr(true);
        setAdminErrMsg(t('login.errors.adminWrongCredentials'));
        setAdminLoading(false);
        return;
      }

      const sms2faEnabled = Capacitor.isNativePlatform();

      if (sms2faEnabled) {
        try {
          const resp = await fetch(apiUrl('/api/admin/send-code'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: adminPhoneE164, email: ADMIN_EMAIL, password: ADMIN_PWD }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.ok) {
            throw new Error(data.error || t('login.errors.adminSmsError'));
          }
          setAdminStep('code');
          setAdminCodeSent(true);
          setAdminLoading(false);
        } catch (err: any) {
          setAdminErr(true);
          const msg = err.message || '';
          if (msg.includes('Identifiants') || msg.includes('Incorrect')) {
            setAdminErrMsg(t('login.errors.adminWrongCredentials'));
          } else if (msg.includes('Trop de tentatives') || msg.includes('Too many')) {
            setAdminErrMsg(t('login.errors.adminTooManyAttempts'));
          } else {
            setAdminErrMsg(t('login.errors.adminSmsError'));
          }
          setAdminLoading(false);
        }
        return;
      }
    }

    if (adminStep === 'code') {
      if (!adminCode.trim() || adminCode.trim().length < 6) {
        setAdminErr(true);
        setAdminErrMsg(t('login.errors.adminCodeRequired'));
        return;
      }
      setAdminLoading(true);

      try {
        const resp = await fetch(apiUrl('/api/admin/verify-code'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: adminPhoneE164, code: adminCode.trim() }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || t('login.errors.adminCodeWrong'));
        }
      } catch (err: any) {
        setAdminErr(true);
        setAdminErrMsg(err.message || t('login.errors.adminCodeWrong'));
        setAdminLoading(false);
        return;
      }
    }

    {
      const state = useAuthStore.getState();
      const existing = state.comptes[adminPhoneE164];
      const adminCompte = existing
        ? { ...existing, lastLoginAt: new Date().toISOString() }
        : {
            phone:          adminPhoneE164,
            password:       ADMIN_PWD,
            subscription:   'free' as const,
            trialExpiresAt: null,
            profileName:    'Gilles',
            contacts:       [] as any[],
            platinumConfig: PLATINUM_CONFIG_DEFAUT,
            normalCode:     '1234',
            duressCode:     '9999',
            createdAt:      new Date().toISOString(),
            lastLoginAt:    new Date().toISOString(),
          };

      const comptes = { ...state.comptes, [adminPhoneE164]: adminCompte };
      useAuthStore.setState({
        comptes,
        sessionPhone: adminPhoneE164,
        compteActif:  adminCompte,
        estConnecte:  true,
      });

      setUser({
        name:           adminCompte.profileName,
        phone:          adminCompte.phone,
        subscription:   'platinum',
        platinumConfig: adminCompte.platinumConfig ?? PLATINUM_CONFIG_DEFAUT,
      });
      useAppStore.getState().setOnboardingComplete(true);
      useAppStore.getState().setAdminSession(true);
      setView('admin');
      setAdminLoading(false);
    }
  }, [adminPhone, adminEmail, adminPwd, adminStep, adminCode, setUser, setContacts, setView]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 transition-colors duration-500"
         style={{ backgroundColor: 'var(--nav-bg, #0a0a0a)' }}>

      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo et titre */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="w-20 h-20 rounded-3xl border flex items-center justify-center shadow-xl"
            style={{ background: 'rgba(220,38,38,0.15)', borderColor: 'rgba(220,38,38,0.35)' }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Shield size={36} className="text-red-500" />
          </motion.div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-white">{t('app.name')}</h1>
            <p className="text-xs text-muted-foreground tracking-widest">
              {t('app.tagline')}
            </p>
          </div>
        </motion.div>

        {showAdmin ? (
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => {
                  if (adminStep === 'code') {
                    setAdminStep('creds');
                    setAdminCode('');
                    setAdminCodeSent(false);
                    setAdminErr(false);
                    setAdminErrMsg('');
                  } else {
                    setShowAdmin(false);
                    setAdminErr(false);
                    setAdminErrMsg('');
                    setAdminPhone('');
                    setAdminEmail('');
                    setAdminPwd('');
                    setAdminStep('creds');
                    setAdminCode('');
                    setAdminCodeSent(false);
                  }
                }}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                <ArrowLeft size={15} />
              </button>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {adminStep === 'creds' ? t('login.adminTitle') : t('login.adminSmsTitle')}
              </span>
            </div>

            {adminStep === 'creds' ? (
              <>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
                  <Shield size={14} className="text-gray-600 shrink-0" />
                  <input
                    type="tel"
                    placeholder={t('login.phoneLabel')}
                    value={adminPhone}
                    onChange={(e) => { setAdminPhone(e.target.value); setAdminErr(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
                  <AlertCircle size={14} className="text-gray-600 shrink-0" />
                  <input
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    value={adminEmail}
                    onChange={(e) => { setAdminEmail(e.target.value); setAdminErr(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
                  <Lock size={14} className="text-gray-600 shrink-0" />
                  <input
                    type="password"
                    placeholder={t('login.passwordLabel')}
                    value={adminPwd}
                    onChange={(e) => { setAdminPwd(e.target.value); setAdminErr(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-green-400">
                    {t('login.adminSmsVerification', { last4: ADMIN_PHONE.slice(-4) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{t('login.adminSmsExpiry')}</p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
                  <Key size={14} className="text-gray-600 shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t('login.adminCodePlaceholder')}
                    value={adminCode}
                    onChange={(e) => { setAdminCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setAdminErr(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full tracking-[0.3em] text-center font-mono text-lg"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setAdminStep('creds'); setAdminCode(''); setAdminErr(false); setAdminErrMsg(''); }}
                  className="text-sm text-gray-600 hover:text-gray-400 text-center transition-colors"
                >
                  {t('login.adminResend')}
                </button>
              </>
            )}

            {adminErr && adminErrMsg && (
              <p className="text-xs text-red-400 text-center">{adminErrMsg}</p>
            )}

            <motion.button
              onClick={handleAdminLogin}
              disabled={adminLoading}
              className="btn-3d btn-3d-red w-full py-5 rounded-2xl text-white text-lg font-black transition-all disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {adminLoading
                ? (adminStep === 'creds' ? t('login.adminSending') : t('login.adminVerifying'))
                : (adminStep === 'creds' ? t('login.adminSendCode') : t('login.adminConfirm'))
              }
            </motion.button>
          </motion.div>
        ) : (
          <>
            <button
              onClick={() => setShowAdmin(true)}
              className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-gray-600 hover:text-gray-400 hover:bg-white/8 text-sm font-bold uppercase tracking-wider transition-all"
            >
              <Shield size={10} />
              {t('login.adminLogin')}
            </button>

        {/* Onglets Login / Creer un compte / Invitation OTP */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/8">
          <button
            onClick={() => { setMode('login'); reinitialiser(); }}
            className={[
              'flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200',
              mode === 'login' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-400',
            ].join(' ')}
          >
            {t('login.title')}
          </button>
          <button
            onClick={() => { setMode('register'); reinitialiser(); }}
            className={[
              'flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200',
              mode === 'register' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-400',
            ].join(' ')}
          >
            {t('login.register')}
          </button>
          <button
            onClick={() => { setMode('otp'); reinitialiser(); }}
            className={[
              'flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1',
              mode === 'otp' ? 'bg-yellow-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-400',
            ].join(' ')}
          >
            <Crown size={10} />
            {t('login.guest')}
          </button>
        </div>

        {/* Formulaire */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── Mode Récupération d'accès ─────────────────────────────── */}
            {mode === 'recovery' && (
              <>
                {/* En-tête recovery */}
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => { resetRecovery(); setMode('login'); }}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                    aria-label={t('common.back')}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('login.recovery.title')}
                  </span>
                </div>

                {/* Indicateur d'étapes */}
                <div className="flex items-center gap-1.5 px-1">
                  {(['phone','code','reset','done'] as RecoveryStep[]).map((s, i) => {
                    const steps: RecoveryStep[] = ['phone','code','reset','done'];
                    const current = steps.indexOf(recoveryStep);
                    const stepIdx = steps.indexOf(s);
                    const isPast    = stepIdx < current;
                    const isActive  = stepIdx === current;
                    return (
                      <React.Fragment key={s}>
                        <div className={[
                          'w-6 h-6 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300',
                          isPast   ? 'bg-green-600 text-white'  :
                          isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 scale-110' :
                                     'bg-white/5 text-gray-700 border border-white/8',
                        ].join(' ')}>
                          {isPast ? <CheckCircle size={10} /> : i + 1}
                        </div>
                        {i < 3 && (
                          <div className={[
                            'flex-1 h-px transition-all duration-500',
                            isPast ? 'bg-green-600' : 'bg-white/8',
                          ].join(' ')} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* ── Étape 1 : Identification ─────────────────────────── */}
                <AnimatePresence mode="wait">
                  {recoveryStep === 'phone' && (
                    <motion.div key="r-phone" className="flex flex-col gap-4"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3.5 flex items-start gap-2.5">
                        <MessageSquare size={13} className="text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {t('login.recovery.phoneInfo')}
                        </p>
                      </div>
                      <PhoneField
                        id="recovery-phone"
                        label={t('login.phoneLabel')}
                        value={recoveryPhone}
                        onChange={setRecoveryPhone}
                        accentClass="focus-within:border-red-500/50"
                      />
                      <motion.button
                        onClick={handleRecoveryPhone}
                        disabled={chargement}
                        className="btn-3d btn-3d-red w-full py-5 rounded-2xl disabled:opacity-50 text-white font-black text-lg transition-all flex items-center justify-center gap-3"
                        whileTap={{ scale: 0.98 }}
                      >
                        {chargement ? t('login.recovery.sending') : t('login.recovery.continue')}
                        {!chargement && <ChevronRight size={14} />}
                      </motion.button>
                    </motion.div>
                  )}

                  {recoveryStep === 'code' && (
                    <motion.div key="r-code" className="flex flex-col gap-4"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <div className="rounded-2xl border border-white/8 bg-white/3 p-3.5 flex items-start gap-2.5">
                        <Key size={13} className="text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {t('login.recovery.codeInfo')}
                        </p>
                      </div>
                      <Champ
                        id="recovery-otp"
                        icone={<Key size={14} />}
                        label={t('login.recovery.otpLabel')}
                        type="tel"
                        inputMode="numeric"
                        valeur={recoveryOtp}
                        onChange={(v) => setRecoveryOtp(v.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                      />
                      <motion.button
                        onClick={handleRecoveryCode}
                        disabled={chargement}
                        className="btn-3d btn-3d-red w-full py-5 rounded-2xl disabled:opacity-50 text-white font-black text-lg transition-all flex items-center justify-center gap-3"
                        whileTap={{ scale: 0.98 }}
                      >
                        {chargement ? t('login.recovery.verifying') : t('login.recovery.validateCode')}
                        {!chargement && <ChevronRight size={14} />}
                      </motion.button>
                    </motion.div>
                  )}

                  {recoveryStep === 'reset' && (
                    <motion.div key="r-reset" className="flex flex-col gap-4"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <Champ
                        id="new-password"
                        icone={<Lock size={14} />}
                        label={t('login.recovery.newPasswordLabel')}
                        type={newPwVisible ? 'text' : 'password'}
                        valeur={newPassword}
                        onChange={setNewPassword}
                        placeholder={t('login.recovery.newPasswordPlaceholder')}
                        suffixe={
                          <button type="button" onClick={() => setNewPwVisible(v => !v)} className="text-gray-600 hover:text-gray-400">
                            {newPwVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <Champ
                        id="confirm-password"
                        icone={<Lock size={14} />}
                        label={t('login.confirmPasswordLabel')}
                        type={confirmPwVisible ? 'text' : 'password'}
                        valeur={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder={t('login.recovery.confirmPasswordPlaceholder')}
                        suffixe={
                          <button type="button" onClick={() => setConfirmPwVisible(v => !v)} className="text-gray-600 hover:text-gray-400">
                            {confirmPwVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <motion.button
                        onClick={handleRecoveryReset}
                        disabled={chargement}
                        className="btn-3d btn-3d-red w-full py-5 rounded-2xl disabled:opacity-50 text-white font-black text-lg transition-all flex items-center justify-center gap-3"
                        whileTap={{ scale: 0.98 }}
                      >
                        {chargement ? t('login.recovery.saving') : t('login.recovery.resetButton')}
                        {!chargement && <Unlock size={14} />}
                      </motion.button>
                    </motion.div>
                  )}

                  {recoveryStep === 'done' && (
                    <motion.div key="r-done" className="flex flex-col gap-4 items-center py-4"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}>
                      <CheckCircle size={40} className="text-green-400" />
                      <p className="text-sm text-green-300 font-bold text-center">{t('login.recovery.success')}</p>
                      <p className="text-xs text-gray-500 text-center">{t('login.recovery.connected')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* ── Mode Login ─────────────────────────────────────────────── */}
            {mode === 'login' && (
              <div className="flex flex-col gap-4">
                <PhoneField
                  id="login-phone"
                  label={t('login.phoneLabel')}
                  value={telephone}
                  onChange={setTelephone}
                />
                <Champ
                  id="login-password"
                  icone={<Lock size={14} />}
                  label={t('login.passwordLabel')}
                  type={visible ? 'text' : 'password'}
                  valeur={motDePasse}
                  onChange={setMotDePasse}
                  onKeyDown={handleKeyDown}
                  placeholder={t('login.passwordPlaceholder')}
                  suffixe={
                    <button type="button" onClick={toggleVisible} className="text-gray-600 hover:text-gray-400">
                      {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                <button
                  type="button"
                  onClick={() => { setMode('recovery'); resetRecovery(); reinitialiser(); }}
                  className="text-sm text-gray-600 hover:text-gray-400 text-right transition-colors"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}

            {/* ── Mode Register ──────────────────────────────────────────── */}
            {mode === 'register' && (
              <div className="flex flex-col gap-4">
                <Champ
                  id="register-name"
                  icone={<User size={14} />}
                  label={t('login.nameLabel')}
                  type="text"
                  valeur={nom}
                  onChange={setNom}
                  placeholder={t('login.registerNamePlaceholder')}
                  autoFocus
                />
                <PhoneField
                  id="register-phone"
                  label={t('login.phoneLabel')}
                  value={telephone}
                  onChange={setTelephone}
                />
                <Champ
                  id="register-password"
                  icone={<Lock size={14} />}
                  label={t('login.passwordLabel')}
                  type={visible ? 'text' : 'password'}
                  valeur={motDePasse}
                  onChange={setMotDePasse}
                  onKeyDown={handleKeyDown}
                  placeholder={t('login.recovery.newPasswordPlaceholder')}
                  suffixe={
                    <button type="button" onClick={toggleVisible} className="text-gray-600 hover:text-gray-400">
                      {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>
            )}

            {/* ── Mode OTP Invité ────────────────────────────────────────── */}
            {mode === 'otp' && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/10 p-3.5 flex items-start gap-2.5">
                  <Crown size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t('login.otpInfo')}
                  </p>
                </div>
                <Champ
                  id="otp-name"
                  icone={<User size={14} />}
                  label={t('login.otpNameLabel')}
                  type="text"
                  valeur={nom}
                  onChange={setNom}
                  placeholder={t('login.otpNamePlaceholder')}
                  autoFocus={!urlAutoRempli}
                />
                <PhoneField
                  id="otp-phone"
                  label={t('login.otpPhoneLabel')}
                  value={telephone}
                  onChange={setTelephone}
                />
                <Champ
                  id="otp-code"
                  icone={<Key size={14} />}
                  label={t('login.otpCodeLabel')}
                  type="tel"
                  inputMode="numeric"
                  valeur={otpCode}
                  onChange={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                />
              </div>
            )}

            {/* Messages d'erreur / succès */}
            <AnimatePresence>
              {erreur && (
                <motion.div
                  className="flex items-start gap-2 rounded-xl bg-red-950/30 border border-red-500/20 p-3"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 leading-relaxed">{erreur}</p>
                </motion.div>
              )}
              {succes && (
                <motion.div
                  className="flex items-center gap-2 rounded-xl bg-green-950/30 border border-green-500/20 p-3"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle size={13} className="text-green-400 shrink-0" />
                  <p className="text-sm text-green-300">{t('login.successMessage')}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton principal (non-recovery) */}
            {mode !== 'recovery' && (
              <motion.button
                onClick={handleSubmit}
                disabled={chargement}
                className={[
                  'btn-3d w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3',
                  mode === 'otp'
                    ? 'btn-3d-gold'
                    : 'btn-3d-red text-white',
                  chargement ? 'opacity-50 cursor-wait' : '',
                ].join(' ')}
                whileTap={{ scale: 0.98 }}
              >
                {chargement ? t('common.loading') :
                  mode === 'login' ? t('login.loginButton') :
                  mode === 'register' ? t('login.registerButton') :
                  t('login.activateInvitation')}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginView;
