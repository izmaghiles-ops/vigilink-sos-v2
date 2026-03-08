/**
 * ChecklistView — Fiabilite et Configuration Platinum
 *
 * Deux onglets :
 *   1. Fiabilite — checklist de tests techniques (existante)
 *   2. Config Platinum — 4 interrupteurs OUI/NON reserves au plan Platinum
 *
 * Textes en francais pur. Zero code Unicode. Zero slash parasite.
 * Admin : Gilles
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Square, Wifi, WifiOff, AlertCircle, Inbox,
  Star, Zap, EyeOff, Lock, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { PlatinumConfig } from '../../types';

// ── Onglets disponibles ───────────────────────────────────────────────────────
type Onglet = 'fiabilite' | 'platinum';

// ── Definition des 4 options Platinum ────────────────────────────────────────
interface OptionPlatinum {
  cle:          keyof PlatinumConfig;
  icone:        React.ReactNode;
  titre:        string;
  description:  string;
  avertissement?: string;
  couleurOui:   string;
  couleurBordOui: string;
  couleurBgOui: string;
}

const OPTIONS_PLATINUM: OptionPlatinum[] = [
  {
    cle:             'chuteActif',
    icone:           <Zap size={18} />,
    titre:           'Detection de Chute',
    description:     'Utilise l\'accelerometre du telephone. Si un impact brutal est detecte (acceleration superieure a 25 m/s2 en moins de 80 ms), le SOS est envoye automatiquement.',
    avertissement:   'Desactiver en voiture ou lors d\'activites sportives intenses pour eviter les faux positifs.',
    couleurOui:      'text-blue-400',
    couleurBordOui:  'border-blue-500/40',
    couleurBgOui:    'bg-blue-950/20',
  },
  {
    cle:             'modeDiscret',
    icone:           <EyeOff size={18} />,
    titre:           'Mode Discret',
    description:     'L\'alerte est envoyee sans vibration et sans son. L\'ecran ne s\'allume pas. Utile quand attirer l\'attention serait dangereux.',
    avertissement:   undefined,
    couleurOui:      'text-purple-400',
    couleurBordOui:  'border-purple-500/40',
    couleurBgOui:    'bg-purple-950/20',
  },
];

// ── Composant interrupteur OUI/NON ────────────────────────────────────────────
interface InterrupteurProps {
  actif:    boolean;
  onChange: (val: boolean) => void;
  couleurOui:    string;
  couleurBordOui: string;
  couleurBgOui:  string;
}

const Interrupteur: React.FC<InterrupteurProps> = ({
  actif, onChange, couleurOui, couleurBordOui, couleurBgOui,
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!actif)}
      className={[
        'relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-200 select-none shrink-0',
        actif
          ? `${couleurOui} ${couleurBordOui} ${couleurBgOui}`
          : 'text-gray-600 border-gray-700/60 bg-white/3 hover:border-gray-600/60 hover:text-gray-500',
      ].join(' ')}
      aria-pressed={actif}
    >
      <motion.span
        className={`w-2 h-2 rounded-full shrink-0 ${actif ? 'bg-current' : 'bg-gray-700'}`}
        animate={{ scale: actif ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.25 }}
      />
      {actif ? 'OUI' : 'NON'}
    </button>
  );
};

// ── Vue principale ────────────────────────────────────────────────────────────
export const ChecklistView: React.FC = () => {
  const {
    checklist,
    toggleChecklistItem,
    user,
    setPlatinumConfig,
    setView,
  } = useAppStore();
  const { isOnline, pendingCount } = useOfflineQueue();

  const [ongletActif, setOngletActif] = useState<Onglet>('fiabilite');

  const isPlatinum = user.subscription === 'platinum';
  const config     = user.platinumConfig;

  // Stats checklist
  const completed    = checklist.filter((i) => i.checked).length;
  const total        = checklist.length;
  const progress     = total > 0 ? (completed / total) * 100 : 0;
  const isFullyReady = completed === total;
  const hasPending   = pendingCount > 0;

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* En-tete + onglets */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-white">Fiabilite et Configuration</h2>

        <div className="flex gap-2">
          {/* Onglet Fiabilite */}
          <button
            onClick={() => setOngletActif('fiabilite')}
            className={[
              'flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all',
              ongletActif === 'fiabilite'
                ? 'text-white border-white/20 bg-white/10'
                : 'text-gray-600 border-gray-700/40 bg-white/3 hover:border-gray-600/50 hover:text-gray-500',
            ].join(' ')}
          >
            Fiabilite
          </button>

          {/* Onglet Config Platinum */}
          <button
            onClick={() => setOngletActif('platinum')}
            className={[
              'flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5',
              ongletActif === 'platinum'
                ? 'text-purple-300 border-purple-500/50 bg-purple-950/30'
                : 'text-gray-600 border-gray-700/40 bg-white/3 hover:border-purple-500/30 hover:text-purple-500/70',
            ].join(' ')}
          >
            <Star size={10} className="shrink-0" />
            Config Platinum
          </button>
        </div>
      </div>

      {/* Contenu selon onglet */}
      <AnimatePresence mode="wait">

        {/* ONGLET 1 — FIABILITE */}
        {ongletActif === 'fiabilite' && (
          <motion.div
            key="fiabilite"
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Progression */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{completed} sur {total} valides</span>
              <span className={[
                'text-xs font-bold px-2.5 py-1 rounded-full border',
                isFullyReady
                  ? 'text-green-400 border-green-500/30 bg-green-500/10'
                  : 'text-gray-500 border-gray-700 bg-white/5',
              ].join(' ')}>
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: isFullyReady ? '#16a34a' : '#dc2626' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Statut reseau */}
            <div className={[
              'rounded-2xl border p-4 flex items-center justify-between',
              isOnline
                ? 'border-green-500/20 bg-green-950/15'
                : 'border-red-500/30 bg-red-950/20',
            ].join(' ')}>
              <div className="flex items-center gap-2">
                {isOnline
                  ? <Wifi size={16} className="text-green-400" />
                  : <WifiOff size={16} className="text-red-400" />
                }
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                    {isOnline ? 'Reseau actif' : 'Hors-ligne'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {isOnline
                      ? 'Alertes transmises en temps reel'
                      : 'Alertes en file — envoi a la reconnexion'
                    }
                  </span>
                </div>
              </div>
              {!isOnline && hasPending && (
                <div className="flex items-center gap-1.5 text-orange-400">
                  <Inbox size={13} />
                  <span className="text-xs font-bold">{pendingCount}</span>
                </div>
              )}
            </div>

            {/* File hors-ligne */}
            {hasPending && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-950/15 p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-orange-300">
                    {pendingCount} alerte{pendingCount > 1 ? 's' : ''} en attente
                  </span>
                  <span className="text-[10px] text-gray-500 leading-relaxed">
                    Envoi automatique des que le reseau est retabli.
                  </span>
                </div>
              </div>
            )}

            {/* Items de la checklist */}
            <div className="flex flex-col gap-2">
              {checklist.map((item, i) => (
                <motion.button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={[
                    'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
                    item.checked
                      ? 'border-green-500/25 bg-green-950/15'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  ].join(' ')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.99 }}
                >
                                <span className={`shrink-0 mt-0.5 ${item.checked ? 'text-green-400' : 'text-gray-600'}`}>
                    {item.checked ? <CheckSquare size={17} /> : <Square size={17} />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-sm font-bold ${item.checked ? 'text-green-300' : 'text-white'}`}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      {item.description}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Etat pret */}
            {isFullyReady && (
              <motion.div
                className="rounded-2xl border border-green-500/30 bg-green-950/20 p-5 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className="text-2xl">ok</span>
                <span className="text-sm font-black text-green-300">
                  Systeme valide — Pret au deploiement
                </span>
                <span className="text-[10px] text-gray-600 text-center">
                  Tous les tests de fiabilite sont completes. Vigilink-SOS est operationnel.
                </span>
              </motion.div>
            )}

            {/* Note de bas de page */}
            <div className="rounded-2xl border border-white/5 bg-white/3 p-4">
              <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                Effectuez ces tests dans un environnement sur.
                Ne pas envoyer de vraies alertes SMS lors des tests.
                Cochez chaque item apres validation manuelle.
              </p>
            </div>
          </motion.div>
        )}

        {/* ONGLET 2 — CONFIGURATION PLATINUM */}
        {ongletActif === 'platinum' && (
          <motion.div
            key="platinum"
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {!isPlatinum ? (
              <motion.div
                className="flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border border-purple-500/30 bg-purple-950/15"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 rounded-full border border-purple-500/40 bg-purple-500/10 flex items-center justify-center">
                  <Lock size={22} className="text-purple-400" />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-sm font-black text-white">
                    Configuration Platinum
                  </span>
                  <span className="text-[11px] text-gray-500 leading-relaxed max-w-xs">
                    Ces options avancees sont reservees au plan Platinum (19,99 CAD par mois).
                    Detection IA, mots personnalises, accelerometre et mode discret.
                  </span>
                </div>
                <button
                  onClick={() => setView('upgrade')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-violet-500 to-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-900/40 hover:brightness-110 transition-all"
                >
                  <Star size={12} className="shrink-0" />
                  Passer Platinum
                  <ChevronRight size={12} className="shrink-0" />
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <Star size={13} className="text-purple-400 shrink-0" />
                  <span className="text-xs font-black text-purple-300 uppercase tracking-widest">
                    Options actives — Plan Platinum
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {OPTIONS_PLATINUM.map((opt, i) => {
                    const estActif = !!(config?.[opt.cle] ?? false);

                    return (
                      <motion.div
                        key={opt.cle}
                        className={[
                          'flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200',
                          estActif
                            ? `${opt.couleurBordOui} ${opt.couleurBgOui}`
                            : 'border-white/8 bg-white/3',
                        ].join(' ')}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={estActif ? opt.couleurOui : 'text-gray-600'}>
                              {opt.icone}
                            </span>
                            <span className={`text-sm font-black leading-snug ${estActif ? 'text-white' : 'text-gray-400'}`}>
                              {opt.titre}
                            </span>
                          </div>
                          <Interrupteur
                            actif={estActif}
                            onChange={(val) => setPlatinumConfig({ [opt.cle]: val })}
                            couleurOui={opt.couleurOui}
                            couleurBordOui={opt.couleurBordOui}
                            couleurBgOui={opt.couleurBgOui}
                          />
                        </div>

                        <p className="text-[10px] text-gray-500 leading-relaxed pl-7">
                          {opt.description}
                        </p>

                        {opt.avertissement && (
                          <div className="flex items-start gap-2 pl-7">
                            <AlertCircle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-600 leading-relaxed">
                              {opt.avertissement}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-purple-500/10 bg-purple-950/8 p-4">
                          <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                    Les modifications sont enregistrees immediatement et persistees localement.
                    Ces options agissent en temps reel sur le moteur de detection de Vigilink-SOS.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
