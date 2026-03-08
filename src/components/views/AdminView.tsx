/**
 * AdminView — Tableau de bord administrateur Vigilink-SOS
 * Accès réservé à Gilles — Montréal-Nord
 * Textes en français pur. Aucun code Unicode parasite.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, ExternalLink, RefreshCw, Activity,
  AlertTriangle, Users, Zap, CheckCircle, XCircle, MapPin,
  Phone, Crown, Settings2, Mail, Trash2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AlertLog, SubscriptionPlan } from '../../types';

interface AdminConfig {
  phone: string;
  email: string;
  password: string;
}

const ADMIN_STORAGE_KEY = 'vigilinksos-admin-config';
const DEFAULT_ADMIN: AdminConfig = { phone: '4383678183', email: 'izmaghiles@gmail.com', password: '123456789' };

function normaliserNumero(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

export function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.phone || !parsed.email) {
        saveAdminConfig(DEFAULT_ADMIN);
        return { ...DEFAULT_ADMIN };
      }
      return {
        phone:    parsed.phone    || DEFAULT_ADMIN.phone,
        email:    parsed.email    || DEFAULT_ADMIN.email,
        password: parsed.password || DEFAULT_ADMIN.password,
      };
    }
  } catch {}
  saveAdminConfig(DEFAULT_ADMIN);
  return { ...DEFAULT_ADMIN };
}

export function saveAdminConfig(config: AdminConfig) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(config));
}

export function verifierAdminCredentials(phone: string, email: string, password: string): boolean {
  const phoneDigits = normaliserNumero(phone);
  const emailLower = email.trim().toLowerCase();
  const pwd = password;

  const defaultOk =
    phoneDigits === normaliserNumero(DEFAULT_ADMIN.phone) &&
    emailLower === DEFAULT_ADMIN.email.trim().toLowerCase() &&
    pwd === DEFAULT_ADMIN.password;
  if (defaultOk) return true;

  const cfg = loadAdminConfig();
  return (
    phoneDigits === normaliserNumero(cfg.phone) &&
    emailLower === cfg.email.trim().toLowerCase() &&
    pwd === cfg.password
  );
}

const COULEURS_TYPE: Record<string, string> = {
  sos:    'text-red-400 bg-red-500/10 border-red-500/30',
  dms:    'text-orange-400 bg-orange-500/10 border-orange-500/30',
  duress: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const LABELS_TYPE: Record<string, string> = {
  sos:    'SOS',
  dms:    'Dead Man Switch',
  duress: 'Contrainte',
};

const ICONES_STATUT: Record<string, React.ReactNode> = {
  sent:    <CheckCircle size={12} className="text-green-400" />,
  pending: <RefreshCw   size={12} className="text-yellow-400" />,
  failed:  <XCircle     size={12} className="text-red-400" />,
};

function formaterDate(iso: string | number | undefined): string {
  if (iso == null) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month:  'short',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function CarteAlerte({ alert, index }: { alert: AlertLog; index: number }) {
  const couleur = COULEURS_TYPE[alert.triggerType] ?? 'text-gray-400 bg-white/5 border-white/10';
  const aGPS    = alert.latitude && alert.longitude;

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${couleur}`}>
              {LABELS_TYPE[alert.triggerType] ?? alert.triggerType}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              {ICONES_STATUT[alert.status]}
              {alert.status}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-mono">{alert.userId}</span>
        </div>
        <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">
          {formaterDate(alert.triggeredAt)}
        </span>
      </div>

      {aGPS && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin size={11} className="text-red-400" />
            <span className="font-mono">
              {Number(alert.latitude!).toFixed(5)}, {Number(alert.longitude!).toFixed(5)}
            </span>
          </div>
          {alert.mapsLink && (
            <a
              href={alert.mapsLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              <ExternalLink size={10} />
              Maps
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CarteMétrique({ icon, label, value, sub }: {
  icon:   React.ReactNode;
  label:  string;
  value:  string | number;
  sub?:   string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
      <span className="text-gray-500">{icon}</span>
      <span className="text-xl font-black text-white tabular-nums">{value}</span>
      <span className="text-[10px] text-gray-600 uppercase tracking-widest">{label}</span>
      {sub && <span className="text-[9px] text-gray-700">{sub}</span>}
    </div>
  );
}

const PLANS: { id: SubscriptionPlan; label: string; color: string }[] = [
  { id: 'free',     label: 'Gratuit',  color: 'bg-gray-600 text-white' },
  { id: 'trial',    label: 'Essai',    color: 'bg-blue-600 text-white' },
  { id: 'pro',      label: 'PRO',      color: 'bg-yellow-600 text-white' },
  { id: 'platinum', label: 'Platinum', color: 'bg-yellow-400 text-black' },
];

export const AdminView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { alertHistory, contacts, user, setUser, setAlertHistory } = useAppStore();

  const [adminCfg,    setAdminCfg]    = useState<AdminConfig>(loadAdminConfig);
  const [authentifie, setAuthentifie] = useState(true);
  const [authPhone,   setAuthPhone]   = useState('');
  const [authEmail,   setAuthEmail]   = useState('');
  const [authPwd,     setAuthPwd]     = useState('');
  const [erreur,      setErreur]      = useState(false);
  const [filtre,      setFiltre]      = useState<'all' | 'sos' | 'dms' | 'duress'>('all');
  const [adminPhone,  setAdminPhone]  = useState(user.phone ?? '');
  const [phoneSaved,  setPhoneSaved]  = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail,    setNewEmail]    = useState(adminCfg.email);
  const [newPhone,    setNewPhone]    = useState(adminCfg.phone);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const metriques = useMemo(() => ({
    total:         alertHistory.length,
    sos:           alertHistory.filter((a) => a.triggerType === 'sos').length,
    dms:           alertHistory.filter((a) => a.triggerType === 'dms').length,
    contrainte:    alertHistory.filter((a) => a.triggerType === 'duress').length,
    envoyes:       alertHistory.filter((a) => a.status === 'sent').length,
    enAttente:     alertHistory.filter((a) => a.status === 'pending').length,
  }), [alertHistory]);

  const alertesFiltrees = useMemo(() =>
    filtre === 'all' ? alertHistory : alertHistory.filter((a) => a.triggerType === filtre),
    [alertHistory, filtre]
  );

  const handleAuth = () => {
    if (verifierAdminCredentials(authPhone, authEmail, authPwd)) {
      setAuthentifie(true);
      setErreur(false);
    } else {
      setErreur(true);
    }
  };

  if (!authentifie) {
    return (
      <div className="flex flex-col gap-6 py-6 items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock size={22} className="text-red-400" />
          </div>
          <h2 className="text-lg font-black text-white">Admin Dashboard</h2>
          <p className="text-xs text-gray-600 text-center">
            Accès protégé — Saisissez vos identifiants
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
            <Phone size={14} className="text-gray-600 shrink-0" />
            <input
              type="tel"
              placeholder="Numéro de téléphone"
              value={authPhone}
              onChange={(e) => { setAuthPhone(e.target.value); setErreur(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
            <Mail size={14} className="text-gray-600 shrink-0" />
            <input
              type="email"
              placeholder="Adresse email"
              value={authEmail}
              onChange={(e) => { setAuthEmail(e.target.value); setErreur(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-red-500/50 transition-colors">
            <Lock size={14} className="text-gray-600 shrink-0" />
            <input
              type="password"
              placeholder="Mot de passe"
              value={authPwd}
              onChange={(e) => { setAuthPwd(e.target.value); setErreur(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
            />
          </div>
          {erreur && (
            <p className="text-xs text-red-400 text-center">Identifiants incorrects. Vérifiez le numéro, l'email et le mot de passe.</p>
          )}
          <motion.button
            onClick={handleAuth}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black transition-all"
            whileTap={{ scale: 0.98 }}
          >
            Accéder
          </motion.button>
          <button
            onClick={onBack}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-center"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2 px-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <h2 className="text-lg font-bold text-white">Administration</h2>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Retour
        </button>
      </div>

      {/* Statut système */}
      <div className="rounded-2xl border border-green-500/20 bg-green-950/15 p-4 flex items-center gap-3">
        <Activity size={16} className="text-green-400" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-green-300">Système opérationnel</span>
          <span className="text-[10px] text-gray-600">
            Utilisateur : <strong className="text-gray-400">{user.name}</strong>
            {' '}· Plan : <strong className={user.subscription === 'pro' ? 'text-yellow-400' : 'text-gray-400'}>
              {user.subscription.toUpperCase()}
            </strong>
          </span>
        </div>
      </div>

      {/* Contrôle Admin */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Settings2 size={14} className="text-red-400" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Contrôle rapide</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Crown size={10} />
            Changer de plan
          </span>
          <div className="flex gap-1.5">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setUser({ subscription: p.id })}
                className={[
                  'flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                  user.subscription === p.id
                    ? `${p.color} border-transparent ring-2 ring-white/30`
                    : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-gray-600">
            Plan actuel : <strong className="text-white">{user.subscription.toUpperCase()}</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Phone size={10} />
            Numéro de téléphone
          </span>
          <div className="flex gap-2">
            <input
              type="tel"
              value={adminPhone}
              onChange={(e) => { setAdminPhone(e.target.value); setPhoneSaved(false); }}
              placeholder="+14381234567"
              className="flex-1 rounded-xl bg-black/30 border border-white/10 text-white text-xs px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
            />
            <button
              onClick={() => {
                setUser({ phone: adminPhone.trim() });
                setPhoneSaved(true);
                setTimeout(() => setPhoneSaved(false), 2000);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
            >
              {phoneSaved ? 'Sauvé' : 'Sauver'}
            </button>
          </div>
          <span className="text-[9px] text-gray-600">
            Actuel : <strong className="text-white font-mono">{user.phone || 'Non défini'}</strong>
          </span>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Phone size={10} />
            Numéro admin
          </span>
          <div className="flex gap-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => { setNewPhone(e.target.value); setSettingsSaved(false); }}
              placeholder="4381234567"
              className="flex-1 rounded-xl bg-black/30 border border-white/10 text-white text-xs px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
            />
            <button
              onClick={() => {
                if (newPhone.trim().length < 7) return;
                setConfirmAction('phone');
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
            >
              Modifier
            </button>
          </div>
          <span className="text-[9px] text-gray-600">
            Actuel : <strong className="text-white font-mono">{adminCfg.phone}</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Mail size={10} />
            Email admin
          </span>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setSettingsSaved(false); }}
              placeholder="email@example.com"
              className="flex-1 rounded-xl bg-black/30 border border-white/10 text-white text-xs px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-red-500/50"
            />
            <button
              onClick={() => {
                if (!newEmail.includes('@')) return;
                setConfirmAction('email');
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
            >
              Modifier
            </button>
          </div>
          <span className="text-[9px] text-gray-600">
            Actuel : <strong className="text-white">{adminCfg.email}</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Lock size={10} />
            Mot de passe admin
          </span>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setSettingsSaved(false); }}
              placeholder="Nouveau mot de passe"
              className="flex-1 rounded-xl bg-black/30 border border-white/10 text-white text-xs px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-red-500/50"
            />
            <button
              onClick={() => {
                if (newPassword.trim().length < 4) return;
                setConfirmAction('password');
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
            >
              Modifier
            </button>
          </div>
          <span className="text-[9px] text-gray-600">
            Min. 4 caractères
          </span>
        </div>

        {confirmAction && (
          <motion.div
            className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4 flex flex-col gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-yellow-300 font-bold text-center">
              Confirmer la modification {confirmAction === 'phone' ? 'du numéro' : confirmAction === 'email' ? "de l'email" : 'du mot de passe'} ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-xs font-bold hover:bg-white/10 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  let updated = { ...adminCfg };
                  if (confirmAction === 'phone') updated.phone = newPhone.trim();
                  if (confirmAction === 'email') updated.email = newEmail.trim();
                  if (confirmAction === 'password') { updated.password = newPassword.trim(); setNewPassword(''); }
                  saveAdminConfig(updated);
                  setAdminCfg(updated);
                  setConfirmAction(null);
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        )}

        {settingsSaved && (
          <motion.div
            className="flex items-center justify-center gap-2 text-green-400 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CheckCircle size={14} />
            Sauvegardé avec succès
          </motion.div>
        )}
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-2">
        <CarteMétrique icon={<Zap size={14} />}           label="Total alertes"     value={metriques.total} />
        <CarteMétrique icon={<Users size={14} />}         label="Contacts actifs"   value={contacts.length} sub="configurés" />
        <CarteMétrique icon={<AlertTriangle size={14} />} label="SOS manuels"       value={metriques.sos} />
        <CarteMétrique icon={<Shield size={14} />}        label="Dead Man Switch"   value={metriques.dms} />
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 rounded-xl bg-white/5 p-1">
        {(['all', 'sos', 'dms', 'duress'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={[
              'flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
              filtre === f ? 'bg-red-600 text-white' : 'text-gray-600 hover:text-gray-400',
            ].join(' ')}
          >
            {f === 'all' ? 'Tout' : LABELS_TYPE[f]}
          </button>
        ))}
      </div>

      {/* Journal des alertes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-widest">
            Historique des alertes
          </span>
          <div className="flex items-center gap-2">
            {alertHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Supprimer tout l\'historique des alertes ?')) {
                    setAlertHistory([]);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-[10px] font-bold transition-all"
              >
                <Trash2 size={10} />
                Vider
              </button>
            )}
            <span className="text-[10px] text-gray-600">
              {alertesFiltrees.length} entrée{alertesFiltrees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {alertesFiltrees.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center gap-2">
              <Shield size={28} className="text-gray-700" />
              <p className="text-xs text-gray-600">Aucune alerte enregistrée</p>
            </div>
          ) : (
            alertesFiltrees.map((alert, i) => (
              <CarteAlerte key={alert.id} alert={alert} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Note backend */}
      <div className="rounded-2xl border border-white/5 bg-white/3 p-4">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          <strong className="text-gray-500">Production :</strong> Connectez le backend Express
          pour afficher les alertes de tous les utilisateurs.
          Endpoint protégé par JWT :{' '}
          <span className="font-mono text-gray-500">GET api/admin/alerts</span>
        </p>
      </div>
    </div>
  );
};
