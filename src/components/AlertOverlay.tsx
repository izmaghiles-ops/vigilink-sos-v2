import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, ExternalLink, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { DuressKeypad } from './DuressKeypad';
import { getGPSPosition } from '../lib/api';

interface AlertOverlayProps {
  onDeactivate:  () => void;
  onDuressAlert: () => void;
}

const ETIQUETTE_KEYS: Record<string, string> = {
  sos:    'home.planTable.manualSos',
  dms:    'countdown.title',
  duress: 'settings.duressCode',
};

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ onDeactivate, onDuressAlert }) => {
  const { t } = useTranslation();
  const {
    isAlertActive,
    alertTriggerType,
    gpsPosition,
    setGPSPosition,
    contacts,
  } = useAppStore();

  const [afficherClavier, setAfficherClavier] = useState(false);
  const [tempsEcoule,     setTempsEcoule]     = useState(0);

  // Compteur de durée de l'alerte
  useEffect(() => {
    if (!isAlertActive) return;
    const intervalle = setInterval(() => setTempsEcoule((p) => p + 1), 1000);
    return () => clearInterval(intervalle);
  }, [isAlertActive]);

  // Récupérer le GPS dès que l'alerte s'active
  useEffect(() => {
    if (!isAlertActive) { setTempsEcoule(0); return; }
    getGPSPosition().then(setGPSPosition).catch(() => {});
  }, [isAlertActive, setGPSPosition]);

  const formaterTemps = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const etiquetteAlerte = t(ETIQUETTE_KEYS[alertTriggerType || 'sos']);

  const contactsPrincipaux = contacts
    .filter((c) => c.priority === 'primary')
    .slice(0, 2);

  return (
    <AnimatePresence>
      {isAlertActive && (
        <motion.div
          className="fixed inset-0 z-50 bg-black flex flex-col overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* En-tête d'alerte */}
          <div className="alert-active flex flex-col items-center justify-center gap-3 py-10 px-6">
            <motion.div
              className="text-6xl font-black text-red-500 tracking-widest"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {t('alerts.title')}
            </motion.div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-red-300 uppercase tracking-widest">
                {etiquetteAlerte}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">
                {formaterTemps(tempsEcoule)}
              </span>
            </div>
          </div>

          {/* Panneaux d'information */}
          <div className="flex flex-col gap-3 px-4 pb-4">

            {/* Position GPS */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
              <MapPin size={20} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs text-gray-500 uppercase tracking-widest">
                  {t('sms.position')}
                </span>
                {gpsPosition ? (
                  <>
                    <span className="text-sm text-white font-mono">
                      {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}
                    </span>
                    <a
                      href={gpsPosition.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      <ExternalLink size={11} />
                      {t('history.viewMap')}
                    </a>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">{t('common.loading')}</span>
                )}
              </div>
            </div>


            {/* Contacts alertés */}
            {contactsPrincipaux.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                <span className="text-xs text-gray-500 uppercase tracking-widest">
                  {t('common.contacts')}
                </span>
                {contactsPrincipaux.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Phone size={13} className="text-green-500" />
                    <span className="text-sm text-white">{c.name}</span>
                    <span className="text-xs text-gray-600 ml-auto">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Désactivation */}
            <button
              onClick={() => setAfficherClavier((p) => !p)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 bg-white/5 text-sm text-gray-400 hover:text-white transition-all"
            >
              <span>{t('sos.deactivate')}</span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${afficherClavier ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {afficherClavier && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <DuressKeypad
                    onNormalDeactivate={onDeactivate}
                    onDuressDetected={onDuressAlert}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
