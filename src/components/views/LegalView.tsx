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
        <div className="flex flex-col gap-3 text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">{t('legal.disclaimerWarranty')}</strong> {t('legal.disclaimerWarrantyText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.disclaimerFailure')}</strong>, {t('legal.disclaimerFailureText')}
          </p>
          <ul className="flex flex-col gap-1.5 pl-4">
            <li className="flex gap-2">
              <span className="text-[#c41e2a] shrink-0">•</span>
              {t('legal.disclaimerNoGps')}
            </li>
            <li className="flex gap-2">
              <span className="text-[#c41e2a] shrink-0">•</span>
              {t('legal.disclaimerBattery')}
            </li>
            <li className="flex gap-2">
              <span className="text-[#c41e2a] shrink-0">•</span>
              {t('legal.disclaimerDevice')}
            </li>
            <li className="flex gap-2">
              <span className="text-[#c41e2a] shrink-0">•</span>
              {t('legal.disclaimerPin')}
            </li>
          </ul>
          <div className="rounded-xl border border-orange-300/40 bg-orange-50 p-3">
            <p className="text-orange-700 font-semibold text-[11px]">
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
        <div className="flex flex-col gap-3 text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">{t('legal.privacyGeo')}</strong> {t('legal.privacyGeoText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.privacyAudio')}</strong> {t('legal.privacyAudioText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.privacyShare')}</strong> {t('legal.privacyShareText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.privacyCompliance')}</strong> {t('legal.privacyComplianceText')}
          </p>
        </div>
      ),
    },
    {
      id: 'user-responsibility',
      title: t('legal.userRespTitle'),
      icon: <User size={14} />,
      content: (
        <div className="flex flex-col gap-3 text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">{t('legal.userRespFalseAlert')}</strong> {t('legal.userRespFalseAlertText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.userRespMaintenance')}</strong> {t('legal.userRespMaintenanceText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.userRespTest')}</strong> {t('legal.userRespTestText')}
          </p>
          <p>
            <strong className="text-foreground">{t('legal.userRespDuress')}</strong> {t('legal.userRespDuressText')}
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
        <div className="w-12 h-12 rounded-2xl bg-[#c41e2a]/10 border border-[#c41e2a]/20 flex items-center justify-center">
          <Shield size={22} className="text-[#c41e2a]" />
        </div>
        <h2 className="text-lg font-black text-foreground">{t('legal.title')}</h2>
        <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-xs">
          {t('legal.readCarefully')}{' '}
          {isOnboarding && t('legal.acceptRequired')}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {sections.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <div key={section.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#c41e2a]">{section.icon}</span>
                  <span className="text-xs font-bold text-foreground">{section.title}</span>
                </div>
                {isOpen
                  ? <ChevronUp size={14} className="text-muted-foreground shrink-0" />
                  : <ChevronDown size={14} className="text-muted-foreground shrink-0" />
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
                    <div className="px-4 pb-4 border-t border-border pt-3">
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
            ? 'border-[#c41e2a]/40 bg-[#c41e2a]/5'
            : 'border-border bg-card hover:border-[#1a2e4a]/30',
        ].join(' ')}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`mt-0.5 shrink-0 ${accepted ? 'text-[#c41e2a]' : 'text-muted-foreground'}`}>
          {accepted ? <CheckSquare size={18} /> : <Square size={18} />}
        </span>
        <span className="text-xs text-foreground leading-relaxed">
          {t('legal.acceptTerms')}
        </span>
      </motion.button>

      <motion.button
        onClick={() => setAutoConsent((p) => !p)}
        className={[
          'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
          autoConsent
            ? 'border-[#c41e2a]/40 bg-[#c41e2a]/5'
            : 'border-border bg-card hover:border-[#1a2e4a]/30',
        ].join(' ')}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`mt-0.5 shrink-0 ${autoConsent ? 'text-[#c41e2a]' : 'text-muted-foreground'}`}>
          {autoConsent ? <CheckSquare size={18} /> : <Square size={18} />}
        </span>
        <span className="text-xs text-foreground leading-relaxed">
          {t('legal.autoConsent')}
        </span>
      </motion.button>

      <motion.button
        onClick={handleAccept}
        disabled={!accepted}
        className={[
          'flex items-center justify-center py-4 rounded-2xl font-black text-base transition-all',
          accepted
            ? 'bg-[#c41e2a] hover:bg-[#a81823] text-white shadow-lg shadow-red-900/20'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        ].join(' ')}
        whileTap={accepted ? { scale: 0.98 } : {}}
      >
        {accepted ? t('legal.continue') : t('legal.acceptToContinue')}
      </motion.button>

      <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
        {t('legal.complianceNote')}
      </p>
    </div>
  );
};
