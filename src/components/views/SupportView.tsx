/**
 * SupportView — Support & Contact Vigilink-SOS
 *
 * Accessible depuis les Réglages via le bouton "Besoin d'aide ?".
 * Icônes Argent (PRO) ou Or (Platinum) selon le plan.
 * Contact : Giles — gilesbrh@gmail.com
 *
 * Admin : Gilles
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Bug, CheckCircle, ChevronLeft, MessageSquare,
  Clock, Shield, Crown, Star, Zap,
} from 'lucide-react';
import { useAppStore }  from '../../store/useAppStore';

// ── Constantes ────────────────────────────────────────────────────────────────

const EMAIL_SUPPORT = 'gilesbrh@gmail.com';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ouvrirEmailAide(nomUtilisateur: string, sujet: string, corps: string) {
  const objetEncode = encodeURIComponent(sujet);
  const corpsEncode = encodeURIComponent(corps);
  window.open(`mailto:${EMAIL_SUPPORT}?subject=${objetEncode}&body=${corpsEncode}`, '_blank');
}

// ── Composant principal ───────────────────────────────────────────────────────

export const SupportView: React.FC = () => {
  const { user, setView } = useAppStore();

  const isPro      = user.subscription === 'pro' || user.subscription === 'trial';
  const isPlatinum = user.subscription === 'platinum';
  const isProrPlat = isPro || isPlatinum;

  // Couleurs thématiques — Argent (PRO) ou Or (Platinum)
  const theme = isPlatinum
    ? {
        accent:      'text-yellow-300',
        border:      'border-yellow-500/30',
        bg:          'bg-yellow-950/15',
        glow:        'shadow-yellow-900/20',
        btnPrim:     'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black',
        btnSec:      'bg-yellow-950/20 border-yellow-500/25 hover:border-yellow-400/40 text-yellow-300',
        iconBadge:   'bg-yellow-500/10 border-yellow-500/20',
        planBadge:   'text-yellow-300 border-yellow-500/30 bg-yellow-500/10',
        planIcon:    <Star size={11} className="text-yellow-400" />,
        planLabel:   'PLATINUM',
      }
    : isPro
    ? {
        accent:      'text-gray-300',
        border:      'border-gray-500/25',
        bg:          'bg-gray-900/20',
        glow:        'shadow-gray-900/20',
        btnPrim:     'bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white',
        btnSec:      'bg-gray-900/20 border-gray-500/20 hover:border-gray-400/35 text-gray-300',
        iconBadge:   'bg-gray-500/10 border-gray-500/20',
        planBadge:   'text-gray-300 border-gray-500/25 bg-gray-500/8',
        planIcon:    <Crown size={11} className="text-gray-400" />,
        planLabel:   'PRO',
      }
    : {
        accent:      'text-red-400',
        border:      'border-white/10',
        bg:          'bg-white/5',
        glow:        '',
        btnPrim:     'bg-red-700 hover:bg-red-600 text-white',
        btnSec:      'bg-white/5 border-white/10 hover:border-white/20 text-gray-300',
        iconBadge:   'bg-white/5 border-white/10',
        planBadge:   '',
        planIcon:    null,
        planLabel:   '',
      };

  const [envoye, setEnvoye] = useState<'aide' | 'bug' | null>(null);

  const handleAide = () => {
    const sujet = `Aide Vigilink-SOS — ${user.name}`;
    const corps = [
      `Bonjour,`,
      ``,
      `J'ai besoin d'aide avec Vigilink-SOS.`,
      ``,
      `Mon nom : ${user.name}`,
      `Mon plan : ${user.subscription.toUpperCase()}`,
      ``,
      `Description du problème :`,
      `[Décrivez votre problème ici]`,
      ``,
      `Merci,`,
      `${user.name}`,
    ].join('\n');
    ouvrirEmailAide(user.name, sujet, corps);
    setEnvoye('aide');
    setTimeout(() => setEnvoye(null), 4000);
  };

  const handleBug = () => {
    const sujet = `Signalement de bug — Vigilink-SOS — ${user.name}`;
    const corps = [
      `Bonjour,`,
      ``,
      `Je souhaite signaler un problème technique.`,
      ``,
      `Mon nom : ${user.name}`,
      `Mon plan : ${user.subscription.toUpperCase()}`,
      ``,
      `Fonctionnalité concernée : [Compte à rebours / SMS / SOS / Autre]`,
      ``,
      `Ce que j'ai fait :`,
      `[Décrivez les étapes]`,
      ``,
      `Ce qui s'est passé :`,
      `[Décrivez le problème]`,
      ``,
      `Ce qui devrait se passer :`,
      `[Comportement attendu]`,
      ``,
      `Merci,`,
      `${user.name}`,
    ].join('\n');
    ouvrirEmailAide(user.name, sujet, corps);
    setEnvoye('bug');
    setTimeout(() => setEnvoye(null), 4000);
  };

  return (
    <div className="flex flex-col gap-5 py-2">

      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('settings')}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          aria-label="Retour aux réglages"
        >
          <ChevronLeft size={15} className="text-gray-400" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-foreground">Support & Contact</h2>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            Nous sommes là pour vous aider
          </p>
        </div>
      </div>

      {/* Carte Fahima */}
      <motion.div
        className={[
          'rounded-2xl border p-5 flex flex-col gap-4 shadow-lg',
          theme.border, theme.bg, theme.glow,
        ].join(' ')}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Identité du support */}
        <div className="flex items-center gap-3.5">
          <div className={[
            'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-md',
            theme.iconBadge,
          ].join(' ')}>
            <MessageSquare size={20} className={theme.accent} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-black text-white">Giles</span>
            <span className={`text-[11px] font-semibold ${theme.accent}`}>
              Propriétaire &amp; Support Vigilink-SOS
            </span>
            {isProrPlat && (
              <span className={[
                'self-start flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-0.5',
                theme.planBadge,
              ].join(' ')}>
                {theme.planIcon}
                Support {theme.planLabel}
              </span>
            )}
          </div>
        </div>

        {/* Délai de réponse */}
        <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/5 px-3.5 py-2.5">
          <Clock size={13} className="text-green-400 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Nous vous répondons sous{' '}
            <strong className="text-white">24 heures</strong>{' '}
            pour garantir votre sécurité.
          </p>
        </div>
      </motion.div>

      {/* Bouton — Envoyer un email */}
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <motion.button
          onClick={handleAide}
          className={[
            'flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg',
            theme.btnPrim,
          ].join(' ')}
          whileTap={{ scale: 0.97 }}
        >
          <Mail size={16} />
          Envoyer un email — Aide Vigilink-SOS
        </motion.button>
        <p className="text-[10px] text-gray-600 text-center leading-relaxed px-2">
          Ouvre votre application Mail avec l'objet{' '}
          <strong className="text-gray-500">
            «&nbsp;Aide Vigilink-SOS — {user.name}&nbsp;»
          </strong>{' '}
          déjà rempli.
        </p>
      </motion.div>

      {/* Bouton — Signaler un bug */}
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.14 }}
      >
        <motion.button
          onClick={handleBug}
          className={[
            'flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-sm border transition-all',
            theme.btnSec,
          ].join(' ')}
          whileTap={{ scale: 0.97 }}
        >
          <Bug size={16} />
          Signaler un problème
        </motion.button>
        <p className="text-[10px] text-gray-600 text-center leading-relaxed px-2">
          Pour signaler un bug sur le compte à rebours, le SMS ou le SOS.
        </p>
      </motion.div>

      {/* Confirmation d'ouverture */}
      <AnimatePresence>
        {envoye && (
          <motion.div
            className="flex items-center gap-2 rounded-2xl border border-green-500/25 bg-green-950/20 px-4 py-3"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <CheckCircle size={14} className="text-green-400 shrink-0" />
            <p className="text-[11px] text-green-300 leading-relaxed">
              {envoye === 'aide'
                ? 'Application Mail ouverte — votre message est prêt à envoyer.'
                : 'Formulaire de bug ouvert — décrivez le problème rencontré.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ rapide */}
      <motion.div
        className="rounded-2xl border border-white/8 bg-white/3 p-4 flex flex-col gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Questions fréquentes
        </h3>

        {[
          {
            q: 'Le SMS n\'est pas arrivé',
            r: 'Vérifiez le numéro dans Contacts. Le SMS part en moins de 5 secondes si le réseau est actif.',
          },
          {
            q: 'Le compte à rebours s\'arrête quand l\'écran se verrouille',
            r: 'Installez l\'app depuis l\'écran d\'accueil (PWA). Le minuteur continue en arrière-plan.',
          },
        ].map(({ q, r }, i) => (
          <div key={i} className="flex flex-col gap-1 pb-3 border-b border-white/5 last:border-0 last:pb-0">
            <p className="text-[11px] font-bold text-gray-300">{q}</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">{r}</p>
          </div>
        ))}
      </motion.div>

      {/* Promesse de sécurité */}
      <motion.div
        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/3 px-4 py-3.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <Shield size={16} className="text-red-400/60 shrink-0" />
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Votre sécurité est notre priorité absolue. Toute demande de support
          est traitée en priorité sous 24 heures.{' '}
          <strong className="text-gray-500">{EMAIL_SUPPORT}</strong>
        </p>
      </motion.div>

      {/* Mention plan PRO/Platinum */}
      {isProrPlat && (
        <motion.div
          className={[
            'flex items-center gap-2 rounded-2xl border px-4 py-3',
            theme.border, theme.bg,
          ].join(' ')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.34 }}
        >
          <Zap size={12} className={`${theme.accent} shrink-0`} />
          <p className={`text-[10px] leading-relaxed ${theme.accent}`}>
            En tant qu'abonné{' '}
            <strong>{theme.planLabel}</strong>, votre demande est traitée en priorité.
          </p>
        </motion.div>
      )}

    </div>
  );
};
