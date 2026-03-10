import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Users, Gift, Copy, Check, ArrowLeft,
  Shield, AlertTriangle, Clock, ChevronRight,
  Sparkles, UserCheck, Lock, Phone, Send,
  Smartphone, Trash2, X, QrCode,
} from 'lucide-react';
import { useAppStore }  from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PhoneField }   from '../PhoneField';
import { useTranslation } from 'react-i18next';
import { getIntlLocaleTag } from '../../lib/dateLocale';
import { apiUrl } from '../../lib/apiBase';
import QRCode from 'qrcode';

function formatExpiry(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(getIntlLocaleTag(), {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function heuresRestantes(isoDate: string | undefined | null): number {
  if (!isoDate) return 0;
  try {
    const ms = new Date(isoDate).getTime();
    if (isNaN(ms)) return 0;
    return Math.max(0, Math.floor((ms - Date.now()) / 3_600_000));
  } catch { return 0; }
}

function codeVersChiffres(code: unknown): string[] {
  if (code === null || code === undefined) return [];
  const str = String(code);
  if (str.length === 0) return [];
  return str.split('');
}

const ChiffreCode: React.FC<{ value?: string | null; index: number }> = ({ value, index }) => (
  <motion.div
    className="w-10 h-12 rounded-xl border border-yellow-500/30 bg-yellow-950/20 flex items-center justify-center"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <span className="text-2xl font-black text-yellow-300 font-mono tabular-nums">
      {value ?? '•'}
    </span>
  </motion.div>
);

function estMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function normaliserNuméro(tel: string): string {
  return tel.replace(/[\s\-().]/g, '');
}

const SponsorQRCode: React.FC<{ url: string }> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 2,
      color: { dark: '#1a2e4a', light: '#ffffff' },
    });
  }, [url]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2 pt-3 border-t border-border mt-2">
      <div className="flex items-center gap-1.5">
        <QrCode size={14} className="text-amber-500" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {t('sponsor.qrLabel', 'QR Code d\'invitation')}
        </span>
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-[220px]">
        {t('sponsor.qrHint', 'Scannez ce QR code pour activer l\'invitation directement.')}
      </p>
    </div>
  );
};

const PanneauParrain: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const { creerInvitationOTP, otpInvitations, supprimerInvitation } = useAuthStore();

  const estAdmin = useAppStore((s) => s.adminSession);

  const [téléphoneInvité, setTéléphoneInvité] = useState('');
  const [erreur,     setErreur]     = useState<string | null>(null);
  const [copié,      setCopié]      = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [smsEnvoyé,  setSmsEnvoyé]  = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [dernièreInvitation, setDernièreInvitation] = useState<import('../../types').OtpInvitation | null>(null);
  const [giftPlan, setGiftPlan] = useState<'free' | 'pro' | 'platinum'>('pro');

  const toutesInvitations = Object.values(otpInvitations ?? {}).filter(
    (inv) => inv.sponsorPhone === user.phone,
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const nbInvitations = toutesInvitations.length;
  const limiteAtteinte = estAdmin ? false : nbInvitations >= 10;

  const invitationAffichée = dernièreInvitation && !dernièreInvitation.used &&
    new Date(dernièreInvitation.expiresAt) > new Date() ? dernièreInvitation : null;

  const minutesRestantes = invitationAffichée
    ? Math.max(0, Math.floor((new Date(invitationAffichée.expiresAt).getTime() - Date.now()) / 60_000))
    : 0;

  const lienIntelligent = invitationAffichée
    ? (() => {
        const base  = window.location.origin;
        const phone = encodeURIComponent(invitationAffichée.guestPhone);
        const otp   = encodeURIComponent(invitationAffichée.code);
        return `${base}/?mode=invite&phone=${phone}&otp=${otp}`;
      })()
    : '';

  const messagePrêt = invitationAffichée
    ? (
      `${t('sponsor.smsHeader')}\n\n` +
      `${t('sponsor.smsInvitedBy', { name: user.name })}\n\n` +
      `${t('sponsor.smsClickToActivate')}\n${lienIntelligent}\n\n` +
      `${t('sponsor.smsLinkNote')}\n\n` +
      `${t('sponsor.smsOtpLine', { code: invitationAffichée.code })}\n` +
      `${t('sponsor.smsValidFor', { count: minutesRestantes })}\n\n` +
      `${t('sponsor.smsHelpNote', { name: user.name })}`
    )
    : '';

  const handleGénérer = useCallback(async () => {
    const tel = téléphoneInvité.trim();
    const chiffres = tel.replace(/\D/g, '');
    const estE164Valide = tel.startsWith('+') && chiffres.length >= 8;
    if (!estE164Valide) {
      setErreur(t('sponsor.phoneError'));
      return;
    }
    setErreur(null);
    setLoading(true);
    setSmsEnvoyé(false);

    const résultat = creerInvitationOTP(tel, user.phone, user.name, estAdmin ? giftPlan : undefined);
    if (résultat.status === 'error') {
      setErreur(résultat.reason);
      setLoading(false);
      return;
    }

    const inv = résultat.invitation;
    const base  = window.location.origin;
    const phone = encodeURIComponent(inv.guestPhone);
    const otp   = encodeURIComponent(inv.code);
    const lien  = `${base}/?mode=invite&phone=${phone}&otp=${otp}`;
    const mins  = 15;

    const smsBody =
      `${t('sponsor.smsHeader')}\n\n` +
      `${t('sponsor.smsInvitedBy', { name: user.name })}\n\n` +
      `${t('sponsor.smsClickToActivate')}\n${lien}\n\n` +
      `${t('sponsor.smsLinkNote')}\n\n` +
      `${t('sponsor.smsOtpLine', { code: inv.code })}\n` +
      `${t('sponsor.smsValidFor', { count: mins })}\n\n` +
      `${t('sponsor.smsHelpNote', { name: user.name })}`;

    try {
      await fetch(apiUrl('/api/otp/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestPhone: inv.guestPhone,
          sponsorPhone: user.phone,
          sponsorName: user.name,
          code: inv.code,
          expiresAt: inv.expiresAt,
        }),
      });
    } catch (e) {
      console.error('[Sponsor] Failed to store OTP on server:', e);
    }

    try {
      const res = await fetch(apiUrl('/api/sponsor/send-invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestPhone: inv.guestPhone, message: smsBody }),
      });
      const data = await res.json();
      if (data.ok) {
        setSmsEnvoyé(true);
      } else {
        setErreur(t('sponsor.smsFailed'));
      }
    } catch {
      setErreur(t('sponsor.smsFailed'));
    }

    setDernièreInvitation(inv);
    setLoading(false);
  }, [téléphoneInvité, creerInvitationOTP, user.phone, user.name, t]);

  const handleCopier = useCallback(() => {
    if (!messagePrêt) return;
    navigator.clipboard.writeText(messagePrêt).then(() => {
      setCopié(true);
      setTimeout(() => setCopié(false), 2500);
    });
  }, [messagePrêt]);

  const handleNouvelleInvitation = useCallback(() => {
    setDernièreInvitation(null);
    setTéléphoneInvité('');
    setErreur(null);
    setCopié(false);
    setSmsEnvoyé(false);
  }, []);

  const handleSupprimerInvitation = useCallback(async (invId: string, guestPhone: string) => {
    setSuppressionEnCours(invId);
    try {
      await fetch(apiUrl('/api/sponsor/deactivate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestPhone,
          sponsorName: user.name,
          lang: localStorage.getItem('vigilink-language') || 'fr',
        }),
      });
    } catch {}
    supprimerInvitation(invId);
    setSuppressionEnCours(null);
  }, [user.name, supprimerInvitation]);

  return (
    <div className="flex flex-col gap-5">

      <div className="rounded-2xl border border-white/8 bg-card p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t('sponsor.guestBenefits')}
          </span>
          <span className="text-[10px] font-bold text-yellow-500">
            {nbInvitations}{estAdmin ? '' : '/10'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Shield size={12} />,         label: t('sponsor.sosAlerts')           },
            { icon: <Clock size={12} />,           label: t('sponsor.deadMansSwitch')     },
            { icon: <Sparkles size={12} />,       label: t('sponsor.allProOptions')       },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-yellow-600/70">{icon}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 pt-2 border-t border-white/5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Lock size={10} className="text-red-400/70 shrink-0" />
            <span className="text-[10px] text-red-300/70">{t('sponsor.lockedContact')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-amber-500/70 shrink-0" />
            <span className="text-[10px] text-amber-400/70">{t('sponsor.logoutWarning')}</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {invitationAffichée ? (
          <motion.div key={`inv-${invitationAffichée.id}`} className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="rounded-2xl border border-yellow-500/25 bg-yellow-950/15 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest">
                  {t('sponsor.inviteSentTo')}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-yellow-600">
                  <Clock size={10} />
                  <span>{t('sponsor.minRemaining', { count: minutesRestantes })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-yellow-600" />
                </div>
                <span className="text-sm font-bold text-foreground font-mono">{invitationAffichée.guestPhone}</span>
              </div>
              <div className="flex flex-col items-center gap-2 pt-1">
                <span className="text-[10px] text-yellow-600/70">{t('sponsor.otpCode')}</span>
                <div className="flex gap-1.5">
                  {codeVersChiffres(invitationAffichée.code).map((c, i) => (
                    <ChiffreCode key={i} value={c} index={i} />
                  ))}
                </div>
              </div>
              <SponsorQRCode url={lienIntelligent} />
            </div>

            {smsEnvoyé && (
              <motion.div className="rounded-xl border border-green-500/30 bg-green-950/25 p-3 flex items-center gap-2.5"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                <Check size={14} className="text-green-600 shrink-0" />
                <span className="text-xs text-green-300 font-bold">{t('sponsor.smsSentSuccess')}</span>
              </motion.div>
            )}

            <div className="flex gap-2">
              <motion.button onClick={handleCopier} whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm border border-border bg-card text-foreground hover:bg-muted transition-all">
                {copié ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copié ? t('sponsor.copied') : t('sponsor.copyText')}
              </motion.button>
            </div>

            {!limiteAtteinte && (
              <motion.button onClick={handleNouvelleInvitation} whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border border-yellow-500/30 bg-yellow-950/20 text-yellow-300 hover:bg-yellow-950/40 transition-all">
                <Send size={14} /> {t('sponsor.newInvitation')}
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div key="formulaire" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {estAdmin && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Crown size={10} /> {t('sponsor.giftPlanLabel')}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['free', 'pro', 'platinum'] as const).map((plan) => (
                    <button key={plan} onClick={() => setGiftPlan(plan)}
                      className={[
                        'py-2.5 rounded-xl text-xs font-bold border transition-all',
                        giftPlan === plan
                          ? plan === 'platinum' ? 'border-purple-500/50 bg-purple-950/30 text-purple-300'
                            : plan === 'pro' ? 'border-yellow-500/50 bg-yellow-950/30 text-yellow-300'
                            : 'border-green-500/50 bg-green-950/30 text-green-300'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted',
                      ].join(' ')}>
                      {plan === 'free' ? 'GRATUIT' : plan.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <PhoneField id="sponsor-invite-phone" label={t('sponsor.phoneLabel')}
                value={téléphoneInvité} onChange={(e164) => { setTéléphoneInvité(e164); setErreur(null); }}
                accentClass="focus-within:border-yellow-500/40" />
              <AnimatePresence>
                {erreur && (
                  <motion.p className="text-xs text-red-400 leading-relaxed"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {erreur}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <motion.button onClick={handleGénérer} whileTap={{ scale: 0.98 }}
              disabled={loading || limiteAtteinte || téléphoneInvité.replace(/\D/g, '').length < 7}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-yellow-200/50 transition-all">
              {loading
                ? <motion.span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                : <> <Send size={15} /> {t('sponsor.sendInvite')} </> }
            </motion.button>
            <p className="text-[10px] text-gray-600 text-center leading-relaxed">
              {limiteAtteinte ? t('sponsor.limitReached') : estAdmin
                ? `Un code OTP à 6 chiffres valide 15 min sera généré. L'invité reçoit le plan ${giftPlan.toUpperCase()}.`
                : t('sponsor.otpInfo')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {toutesInvitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t('sponsor.sentInvitations')} ({nbInvitations}{estAdmin ? '' : '/10'})
          </span>
          <div className="flex flex-col gap-1.5">
            {toutesInvitations.map((inv) => {
              const expiré = new Date(inv.expiresAt) <= new Date();
              const enSuppression = suppressionEnCours === inv.id;
              return (
                <div key={inv.id} className="rounded-xl border border-white/8 bg-card px-3 py-2.5 flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${inv.used ? 'bg-green-400' : expiré ? 'bg-gray-600' : 'bg-yellow-400 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground font-mono truncate block">{inv.guestPhone}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${inv.used ? 'text-green-600' : expiré ? 'text-muted-foreground' : 'text-yellow-600'}`}>
                    {inv.used ? t('sponsor.statusUsed') : expiré ? t('sponsor.statusExpired') : t('sponsor.statusPending')}
                  </span>
                  <motion.button
                    onClick={() => handleSupprimerInvitation(inv.id, inv.guestPhone)}
                    disabled={enSuppression}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all disabled:opacity-40"
                    title={t('sponsor.removeInvite')}
                  >
                    {enSuppression
                      ? <motion.span className="block w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                      : <Trash2 size={13} />}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PanneauInvité: React.FC = () => {
  const { t } = useTranslation();
  const { user, redeemSponsorCode } = useAppStore();
  const { getAllSponsorCodes, markSponsorCodeUsed, syncSponsorRole, syncSponsorLink } = useAuthStore();

  const [saisie,  setSaisie]  = useState('');
  const [erreur,  setErreur]  = useState<string | null>(null);
  const [succès,  setSuccès]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isPlatinum = user.subscription === 'platinum';
  const isGuest    = user.sponsorRole  === 'guest';
  const peutParrainer = isPlatinum && !isGuest;

  const déjàInvité = user.sponsorRole === 'guest' && user.sponsorLink;

  const handleValider = useCallback(() => {
    const code = saisie.trim().replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) { setErreur(t('sponsor.codeError')); return; }
    setLoading(true); setErreur(null);
    const tousLesCodes = getAllSponsorCodes();
    const link = redeemSponsorCode(code, tousLesCodes);
    if (!link) {
      setErreur(t('sponsor.codeInvalid'));
      setLoading(false); return;
    }
    markSponsorCodeUsed(code);
    syncSponsorRole('guest');
    syncSponsorLink(link);
    setSuccès(t('sponsor.linkActivated', { name: link.sponsorName }));
    setLoading(false);
  }, [saisie, getAllSponsorCodes, redeemSponsorCode, markSponsorCodeUsed, syncSponsorRole, syncSponsorLink, t]);

  if (déjàInvité && user.sponsorLink) {
    return (
      <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border border-yellow-500/25 bg-yellow-950/15 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0">
              <UserCheck size={18} className="text-yellow-600" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-black text-yellow-300">{t('sponsor.guestActivePro')}</span>
              <span className="text-[11px] text-yellow-600">
                {t('sponsor.linkedSince', { date: new Date(user.sponsorLink.linkedAt).toLocaleDateString(getIntlLocaleTag()) })}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-card border border-white/5 p-3 flex flex-col gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('sponsor.yourSponsor')}</span>
            <span className="text-sm font-bold text-foreground">{user.sponsorLink.sponsorName}</span>
            <span className="text-xs text-gray-500 font-mono">{user.sponsorLink.sponsorPhone}</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Users size={11} className="text-gray-500 shrink-0" />
              <span className="text-[11px] text-muted-foreground">{t('sponsor.extraContact')}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/8 bg-card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Gift size={13} className="text-gray-400 shrink-0" />
          <span className="text-sm font-bold text-foreground/80">{t('sponsor.receivedCode')}</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {t('sponsor.receivedCodeDescPro')}
        </p>
      </div>
      <AnimatePresence>
        {succès && (
          <motion.div className="rounded-2xl border border-green-500/30 bg-green-950/25 p-4 flex items-start gap-3"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={16} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-green-300 leading-relaxed">{succès}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('sponsor.codeLabel')}</label>
        <input type="tel" inputMode="numeric" maxLength={6} value={saisie}
          onChange={(e) => { setSaisie(e.target.value.replace(/\D/g, '').slice(0, 6)); setErreur(null); }}
          placeholder="• • • • • •"
          className="bg-card border border-border rounded-xl px-4 py-4 text-2xl text-center font-black text-foreground font-mono tracking-[0.5em] placeholder-gray-800 focus:outline-none focus:border-yellow-500/50 transition-colors" />
        <AnimatePresence>
          {erreur && (
            <motion.p className="text-xs text-red-400 leading-relaxed"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <motion.button onClick={handleValider} whileTap={{ scale: 0.98 }}
        disabled={loading || saisie.replace(/\D/g, '').length !== 6}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-yellow-200/50 transition-all">
        <ChevronRight size={16} /> {t('sponsor.activateSponsorship')}
      </motion.button>
    </div>
  );
};

export const SponsorView: React.FC = () => {
  const { t } = useTranslation();
  const { user, setView } = useAppStore();
  const isPlatinum  = user.subscription === 'platinum';
  const isGuest     = user.sponsorRole  === 'guest';
  const peutParrainer = isPlatinum && !isGuest;

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('settings')}
          className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Crown size={17} className="text-yellow-600" /> {t('sponsor.platinumTitle')}
          </h2>
          <p className="text-[11px] text-muted-foreground">{t('sponsor.platinumDesc')}</p>
        </div>
      </div>

      {peutParrainer ? (
        <PanneauParrain />
      ) : !isPlatinum ? (
        <motion.div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/15 p-4 flex items-start gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Crown size={15} className="text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-yellow-300">{t('sponsor.platinumOnly')}</span>
            <span className="text-[11px] text-gray-500 leading-relaxed">{t('sponsor.platinumOnlyDesc')}</span>
            <button onClick={() => setView('upgrade')}
              className="mt-2 self-start px-3 py-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-500/80 text-white text-xs font-bold transition-all">
              {t('sponsor.viewPlatinum')}
            </button>
          </div>
        </motion.div>
      ) : isGuest ? (
        <PanneauInvité />
      ) : null}
    </div>
  );
};
