import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Brain, Plus, Trash2, QrCode, Edit3, Save,
  Check, AlertTriangle, Heart, Phone, Shield, ChevronRight,
  Download, Lock, Eye, EyeOff, X, Users, Send, Copy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { PhoneField } from '../PhoneField';
import { apiUrl } from '../../lib/apiBase';
import QRCode from 'qrcode';
import type { AlzheimerWard } from '../../types';

function generateId(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateProfileId(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function syncWardProfile(ward: AlzheimerWard) {
  const payload = {
    profileId: ward.profileId,
    name: ward.name,
    phone: ward.phone,
    contacts: [{ name: ward.caregiverName, phone: ward.caregiverPhone }],
    medicalProfile: {
      bloodType: ward.bloodType,
      allergies: ward.allergies ? ward.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      medications: ward.medications ? ward.medications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      conditions: ward.conditions ? ward.conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      emergencyNotes: ward.emergencyNotes,
    },
    alzheimerMode: {
      enabled: true,
      caregiverName: ward.caregiverName,
      caregiverPhone: ward.caregiverPhone,
      hideAddress: ward.hideAddress,
      displayName: ward.displayName || ward.name,
      instructions: ward.instructions,
    },
    meetingMode: { active: false },
  };
  const res = await fetch(apiUrl('/api/profile/save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

const WardForm: React.FC<{
  ward: AlzheimerWard;
  onSave: (w: AlzheimerWard) => void;
  onCancel: () => void;
  isNew?: boolean;
}> = ({ ward: initial, onSave, onCancel, isNew }) => {
  const { t } = useTranslation();
  const [w, setW] = useState<AlzheimerWard>({ ...initial });
  const upd = (k: keyof AlzheimerWard, v: string | boolean) => setW((p) => ({ ...p, [k]: v }));

  return (
    <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onCancel} className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft size={16} />
        </button>
        <h3 className="text-lg font-black text-foreground">
          {isNew ? t('alzheimerSponsor.addPerson') : t('alzheimerSponsor.editProfile')}
        </h3>
      </div>

      <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 flex flex-col gap-4">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
          <Brain size={10} /> Identité
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.name')}</label>
          <input type="text" value={w.name} onChange={(e) => upd('name', e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.displayName')}</label>
          <input type="text" value={w.displayName} onChange={(e) => upd('displayName', e.target.value)}
            placeholder={w.name || 'Nom sur la page QR'}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.phone')}</label>
          <PhoneField id={`ward-phone-${w.id}`} value={w.phone} onChange={(e164) => upd('phone', e164)} accentClass="focus-within:border-blue-500/50" />
        </div>
      </div>

      <div className="rounded-2xl border border-green-300 bg-green-50 p-4 flex flex-col gap-4">
        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
          <Phone size={10} /> Tuteur / Aidant
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.caregiverName')}</label>
          <input type="text" value={w.caregiverName} onChange={(e) => upd('caregiverName', e.target.value)}
            placeholder="Ex: Marie Tremblay"
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.caregiverPhone')}</label>
          <PhoneField id={`ward-caregiver-${w.id}`} value={w.caregiverPhone} onChange={(e164) => upd('caregiverPhone', e164)} accentClass="focus-within:border-green-500/50" />
        </div>

        <div className="flex items-center justify-between rounded-xl p-3.5 bg-white/[0.03] border border-white/8">
          <div className="flex items-center gap-2.5">
            <EyeOff size={14} className="text-blue-400" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">{t('alzheimerSponsor.hideAddress')}</span>
              <span className="text-xs text-gray-500">{t('alzheimerSponsor.hideAddressDesc')}</span>
            </div>
          </div>
          <button onClick={() => upd('hideAddress', !w.hideAddress)}
            className={`w-11 h-6 rounded-full transition-all ${w.hideAddress ? 'bg-blue-500' : 'bg-gray-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${w.hideAddress ? 'translate-x-5.5 ml-[22px]' : 'translate-x-0.5 ml-[2px]'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col gap-4">
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Shield size={10} /> {t('alzheimerSponsor.instructions')}
        </p>
        <textarea value={w.instructions} onChange={(e) => upd('instructions', e.target.value)}
          placeholder={t('alzheimerSponsor.instructionsPlaceholder')}
          rows={4}
          className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors resize-none" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={11} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300 leading-relaxed">
            {t('alzheimerSponsor.profileInfo')}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col gap-4">
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
          <Heart size={10} /> Médical
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.bloodType')}</label>
          <input type="text" value={w.bloodType} onChange={(e) => upd('bloodType', e.target.value)} placeholder="Ex: A+"
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.allergies')}</label>
          <input type="text" value={w.allergies} onChange={(e) => upd('allergies', e.target.value)} placeholder={t('alzheimerSponsor.allergiesPlaceholder')}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.medications')}</label>
          <input type="text" value={w.medications} onChange={(e) => upd('medications', e.target.value)} placeholder={t('alzheimerSponsor.medicationsPlaceholder')}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.conditions')}</label>
          <input type="text" value={w.conditions} onChange={(e) => upd('conditions', e.target.value)} placeholder={t('alzheimerSponsor.conditionsPlaceholder')}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wider">{t('alzheimerSponsor.emergencyNotes')}</label>
          <textarea value={w.emergencyNotes} onChange={(e) => upd('emergencyNotes', e.target.value)} placeholder={t('alzheimerSponsor.emergencyNotesPlaceholder')}
            rows={2}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500/50 transition-colors resize-none" />
        </div>
      </div>

      <motion.button onClick={() => onSave(w)} whileTap={{ scale: 0.98 }}
        disabled={!w.name.trim() || !w.caregiverPhone.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-blue-200/50 transition-all">
        <Save size={15} /> {t('common.save')}
      </motion.button>
    </motion.div>
  );
};

const WardQRView: React.FC<{ ward: AlzheimerWard; onBack: () => void }> = ({ ward, onBack }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [synced, setSynced] = useState<boolean | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const profileUrl = `https://vigilink-sos.replit.app/profile/${ward.profileId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, profileUrl, {
      width: 280, margin: 2,
      color: { dark: '#1a2e4a', light: '#edf1f7' },
      errorCorrectionLevel: 'M',
    }).then(() => {
      setQrDataUrl(canvasRef.current!.toDataURL('image/png'));
    }).catch(() => {});

    syncWardProfile(ward).then((ok) => setSynced(ok)).catch(() => setSynced(false));
  }, [ward, profileUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `vigilink-alzheimer-${ward.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack} className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft size={16} />
        </button>
        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
          <QrCode size={17} className="text-blue-400" /> {ward.displayName || ward.name}
        </h3>
      </div>

      <div className="rounded-2xl border border-blue-300 bg-blue-50 p-5 flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="rounded-xl border-2 border-blue-300" />

        <p className="text-xs text-gray-500 text-center break-all">{profileUrl}</p>

        {synced === true && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
            <Check size={12} /> {t('alzheimerSponsor.qrSynced')}
          </div>
        )}
        {synced === false && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
            <AlertTriangle size={12} /> {t('alzheimerSponsor.qrSyncError')}
          </div>
        )}
      </div>

      <motion.button onClick={handleDownload} whileTap={{ scale: 0.98 }}
        disabled={!qrDataUrl}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-all disabled:opacity-40">
        <Download size={14} /> {t('qrcode.download')}
      </motion.button>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
        <Brain size={11} className="text-blue-400 shrink-0" />
        <span className="text-xs text-blue-600 leading-relaxed">{t('alzheimerSponsor.qrInfo')}</span>
      </div>

      {ward.instructions && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Shield size={10} /> {t('alzheimerSponsor.instructions')}
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{ward.instructions}</p>
        </div>
      )}
    </motion.div>
  );
};

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, '0');
}

const WardOtpInvite: React.FC<{ ward: AlzheimerWard; userName: string }> = ({ ward, userName }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = useCallback(async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || !phone.startsWith('+')) {
      setError(t('sponsor.phoneError'));
      return;
    }
    setLoading(true);
    setError(null);
    setSent(false);
    const code = generateOtp();
    setOtp(code);

    const profileUrl = `https://vigilink-sos.replit.app/profile/${ward.profileId}`;
    const smsBody =
      `🧠 VIGILINK-SOS — Parrainage Alzheimer\n\n` +
      `${userName} vous invite à accéder au profil de ${ward.displayName || ward.name}.\n\n` +
      `🔗 Profil : ${profileUrl}\n\n` +
      `🔑 Code OTP : ${code}\n\n` +
      `Ce code est valide pendant 15 minutes.`;

    try {
      const res = await fetch(apiUrl('/api/sponsor/send-invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestPhone: phone, message: smsBody }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
      } else {
        setError(t('alzheimerSponsor.otpFailed'));
      }
    } catch {
      setError(t('alzheimerSponsor.otpFailed'));
    }
    setLoading(false);
  }, [phone, ward, userName, t]);

  const handleCopy = useCallback(() => {
    if (!otp) return;
    const profileUrl = `https://vigilink-sos.replit.app/profile/${ward.profileId}`;
    const msg = `🧠 Vigilink-SOS — Profil Alzheimer de ${ward.displayName || ward.name}\n🔗 ${profileUrl}\n🔑 Code : ${otp}`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [otp, ward]);

  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2.5">
      <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
        <Send size={9} /> {t('alzheimerSponsor.inviteTitle')}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{t('alzheimerSponsor.inviteDesc')}</p>

      {sent && otp ? (
        <motion.div className="flex flex-col gap-2" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-300">
            <Check size={12} className="text-green-400 shrink-0" />
            <span className="text-xs text-green-600 font-bold">{t('alzheimerSponsor.otpSent')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1 justify-center">
              {otp.split('').map((c, i) => (
                <span key={i} className="w-8 h-10 rounded-lg border border-green-300 bg-green-50 flex items-center justify-center text-lg font-black text-green-600 font-mono">{c}</span>
              ))}
            </div>
            <motion.button onClick={handleCopy} whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          <PhoneField id={`otp-invite-${ward.id}`} value={phone} onChange={(e164) => { setPhone(e164); setError(null); }}
            accentClass="focus-within:border-green-500/50" />
          <AnimatePresence>
            {error && (
              <motion.p className="text-xs text-red-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <motion.button onClick={handleSend} whileTap={{ scale: 0.98 }}
            disabled={loading || phone.replace(/\D/g, '').length < 7}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#2b5289] to-[#1e3a5f] hover:from-[#3468a8] hover:to-[#2b5289] disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-[#152d4a]/30 transition-all">
            {loading
              ? <motion.span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
              : <><Send size={12} /> {t('alzheimerSponsor.sendOtp')}</>}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export const AlzheimerSponsorView: React.FC = () => {
  const { t } = useTranslation();
  const { user, setView, alzheimerWards, addAlzheimerWard, updateAlzheimerWard, removeAlzheimerWard } = useAppStore();
  const isPro = user.subscription === 'platinum';
  const estAdmin = useAppStore((s) => s.adminSession);

  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'qr'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const selectedWard = alzheimerWards.find((w) => w.id === selectedId) || null;

  const handleAdd = useCallback((ward: AlzheimerWard) => {
    addAlzheimerWard(ward);
    syncWardProfile(ward).catch(() => {});
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
    setMode('list');
  }, [addAlzheimerWard]);

  const handleUpdate = useCallback((ward: AlzheimerWard) => {
    updateAlzheimerWard(ward.id, ward);
    syncWardProfile(ward).catch(() => {});
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
    setMode('list');
  }, [updateAlzheimerWard]);

  const handleDelete = useCallback((id: string) => {
    removeAlzheimerWard(id);
    setDeleteConfirm(null);
    if (selectedId === id) { setSelectedId(null); setMode('list'); }
  }, [removeAlzheimerWard, selectedId]);

  if (!isPro) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-5">
        <button onClick={() => setView('settings')} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft size={18} /> <span className="text-sm">{t('common.back')}</span>
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Lock size={40} className="text-gray-600" />
          <p className="text-gray-500 text-sm text-center">{t('alzheimerSponsor.proOnly')}</p>
          <button onClick={() => setView('upgrade')} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">
            {t('upgrade.upgrade')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      {mode === 'list' && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('settings')}
              className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Brain size={17} className="text-blue-400" /> {t('alzheimerSponsor.title')}
              </h2>
              <p className="text-[11px] text-gray-500">{t('alzheimerSponsor.subtitle')}</p>
            </div>
          </div>

          <AnimatePresence>
            {showSaved && (
              <motion.div className="rounded-xl border border-green-300 bg-green-50 p-3 flex items-center gap-2.5"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Check size={14} className="text-green-400 shrink-0" />
                <span className="text-xs text-green-600 font-bold">{t('alzheimerSponsor.saved')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {t('alzheimerSponsor.personCount', { count: alzheimerWards.length })}
            </span>
          </div>

          {alzheimerWards.length === 0 ? (
            <motion.div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-col items-center gap-3 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Brain size={32} className="text-blue-400/50" />
              <p className="text-sm font-bold text-gray-400">{t('alzheimerSponsor.noPersons')}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{t('alzheimerSponsor.noPersonsDesc')}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {alzheimerWards.map((ward) => (
                <motion.div key={ward.id} className="rounded-2xl border border-blue-300 bg-blue-50 p-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                      <Brain size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{ward.displayName || ward.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{ward.phone || '—'}</p>
                    </div>
                  </div>

                  {ward.caregiverName && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                      <Users size={11} className="text-green-400 shrink-0" />
                      <span className="text-xs text-gray-400">
                        Tuteur : <span className="text-foreground font-bold">{ward.caregiverName}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedId(ward.id); setMode('qr'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-blue-500/25 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                      <QrCode size={12} /> {t('alzheimerSponsor.viewQR')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedId(ward.id); setMode('edit'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-card text-gray-300 hover:bg-muted transition-all">
                      <Edit3 size={12} /> {t('alzheimerSponsor.editProfile')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirm(ward.id)}
                      className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-950/30 transition-all">
                      <Trash2 size={13} />
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {deleteConfirm === ward.id && (
                      <motion.div className="mt-3 flex items-center gap-2"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <span className="text-xs text-red-400 flex-1">{t('alzheimerSponsor.deleteConfirm')}</span>
                        <button onClick={() => handleDelete(ward.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors">
                          {t('common.confirm')}
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-400 text-xs font-bold hover:bg-white/15 transition-colors">
                          {t('common.cancel')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <WardOtpInvite ward={ward} userName={user.name} />
                </motion.div>
              ))}
            </div>
          )}

          {(estAdmin || alzheimerWards.length < 2) ? (
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => setMode('add')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm shadow-lg shadow-blue-200/50 transition-all">
              <Plus size={16} /> {t('alzheimerSponsor.addPerson')}
            </motion.button>
          ) : (
            <p className="text-xs text-gray-600 text-center">{t('alzheimerSponsor.limitReached')}</p>
          )}
        </>
      )}

      {mode === 'add' && (
        <WardForm
          ward={{
            id: generateId(),
            name: '',
            phone: '',
            profileId: generateProfileId(),
            displayName: '',
            caregiverName: user.name || '',
            caregiverPhone: user.phone || '',
            hideAddress: true,
            instructions: '',
            bloodType: '',
            allergies: '',
            medications: '',
            conditions: '',
            emergencyNotes: '',
            createdAt: new Date().toISOString(),
          }}
          onSave={handleAdd}
          onCancel={() => setMode('list')}
          isNew
        />
      )}

      {mode === 'edit' && selectedWard && (
        <WardForm
          ward={selectedWard}
          onSave={handleUpdate}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'qr' && selectedWard && (
        <WardQRView ward={selectedWard} onBack={() => setMode('list')} />
      )}
    </div>
  );
};
