import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle, Lock, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';

interface LegalViewProps {
  onAccept: () => void;
  isOnboarding?: boolean;
}

export const LegalView: React.FC<LegalViewProps> = ({ onAccept, isOnboarding = false }) => {
  const { t } = useTranslation();
  const { setUser } = useAppStore();
  const [expanded, setExpanded] = useState<string | null>('disclaimer');
  const [accepted, setAccepted] = useState(false);
  const [autoConsent, setAutoConsent] = useState(true);

  const sections = [
    {
      id: 'disclaimer',
      title: t('legal.disclaimerTitle'),
      icon: <AlertTriangle size={14} />,
      content: (
        <div className="flex flex-col gap-3 text-[11px] text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-200">{t('legal.disclaimerWarranty')}</strong> {t('legal.disclaimerWarrantyText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.disclaimerFailure')}</strong>, {t('legal.disclaimerFailureText')}
          </p>
          <ul className="flex flex-col gap-1.5 pl-4">
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">•</span>
              {t('legal.disclaimerNoGps')}
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">•</span>
              {t('legal.disclaimerBattery')}
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">•</span>
              {t('legal.disclaimerDevice')}
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">•</span>
              {t('legal.disclaimerPin')}
            </li>
          </ul>
          <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-3">
            <p className="text-orange-300 font-semibold text-[11px]">
              ⚠️ {t('legal.disclaimerWarning')}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'privacy',
      title: t('legal.privacyTitle'),
      icon: <Lock size={14} />,
      content: (
        <div className="flex flex-col gap-3 text-[11px] text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-200">{t('legal.privacyGeo')}</strong> {t('legal.privacyGeoText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.privacyAudio')}</strong> {t('legal.privacyAudioText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.privacyShare')}</strong> {t('legal.privacyShareText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.privacyCompliance')}</strong> {t('legal.privacyComplianceText')}
          </p>
        </div>
      ),
    },
    {
      id: 'user-responsibility',
      title: t('legal.userRespTitle'),
      icon: <User size={14} />,
      content: (
        <div className="flex flex-col gap-3 text-[11px] text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-200">{t('legal.userRespFalseAlert')}</strong> {t('legal.userRespFalseAlertText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.userRespMaintenance')}</strong> {t('legal.userRespMaintenanceText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.userRespTest')}</strong> {t('legal.userRespTestText')}
          </p>
          <p>
            <strong className="text-gray-200">{t('legal.userRespDuress')}</strong> {t('legal.userRespDuressText')}
          </p>
        </div>
      ),
    },
  ];

  const handleAccept = () => {
    if (!accepted) return;
    const now = new Date().toISOString();
    setUser({
      termsAccepted: true,
      termsAcceptedAt: now,
      alerteAutoConsentement: autoConsent,
    });
    onAccept();
  };

  return (
    <div className="flex flex-col gap-4 py-2">

      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center">
          <Shield size={22} className="text-red-400" />
        </div>
        <h2 className="text-lg font-black text-white">{t('legal.title')}</h2>
        <p className="text-xs text-gray-500 text-center leading-relaxed max-w-xs">
          {t('legal.readCarefully')}{' '}
          {isOnboarding && t('legal.acceptRequired')}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <div key={section.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-400">{section.icon}</span>
                  <span className="text-xs font-bold text-white/80">{section.title}</span>
                </div>
                {isOpen
                  ? <ChevronUp size={14} className="text-gray-500 shrink-0" />
                  : <ChevronDown size={14} className="text-gray-500 shrink-0" />
                }
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-4 pb-4 border-t border-white/5 pt-3">
                      {section.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <motion.button
        onClick={() => setAccepted((p) => !p)}
        className={[
          'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
          accepted
            ? 'border-red-500/50 bg-red-950/25'
            : 'border-white/10 bg-white/5 hover:border-white/20',
        ].join(' ')}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`mt-0.5 shrink-0 ${accepted ? 'text-red-400' : 'text-gray-600'}`}>
          {accepted ? <CheckSquare size={18} /> : <Square size={18} />}
        </span>
        <span className="text-xs text-gray-300 leading-relaxed">
          {t('legal.acceptTerms')}
        </span>
      </motion.button>

      <motion.button
        onClick={() => setAutoConsent((p) => !p)}
        className={[
          'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
          autoConsent
            ? 'border-red-500/50 bg-red-950/25'
            : 'border-white/10 bg-white/5 hover:border-white/20',
        ].join(' ')}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`mt-0.5 shrink-0 ${autoConsent ? 'text-red-400' : 'text-gray-600'}`}>
          {autoConsent ? <CheckSquare size={18} /> : <Square size={18} />}
        </span>
        <span className="text-xs text-gray-300 leading-relaxed">
          {t('legal.autoConsent')}
        </span>
      </motion.button>

      <motion.button
        onClick={handleAccept}
        disabled={!accepted}
        className={[
          'flex items-center justify-center py-4 rounded-2xl font-black text-base transition-all',
          accepted
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
            : 'bg-white/5 text-gray-600 cursor-not-allowed',
        ].join(' ')}
        whileTap={accepted ? { scale: 0.98 } : {}}
      >
        {accepted ? t('legal.continue') : t('legal.acceptToContinue')}
      </motion.button>

      <p className="text-[9px] text-gray-700 text-center leading-relaxed">
        {t('legal.complianceNote')}
      </p>
    </div>
  );
};
