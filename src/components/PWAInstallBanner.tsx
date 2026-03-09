/**
 * PWAInstallBanner — Invitation à installer Vigilink-SOS
 * Textes en français pur, caractères UTF-8 directs.
 * Admin : Gilles
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Shield } from 'lucide-react';
import { promptPWAInstall, isStandalonePWA } from '../lib/pwa';

export const PWAInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('pwa-banner-dismissed') === 'true'
  );

  useEffect(() => {
    if (dismissed || isStandalonePWA()) return;

    const handleInstallable = () => {
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    return () => window.removeEventListener('pwa-installable', handleInstallable);
  }, [dismissed]);

  const handleInstall = async () => {
    const accepted = await promptPWAInstall();
    if (accepted) setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-24 left-4 right-4 z-40 max-w-sm mx-auto"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="rounded-2xl border border-red-300 bg-card shadow-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-red-600" />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-xs font-black text-foreground">{t('pwa.install')}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {t('pwa.installDesc')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all"
              >
                <Download size={11} />
                {t('pwa.installButton')}
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
