/**
 * NetworkStatusBar — Bandeau statut réseau Vigilink-SOS
 * Textes en français pur, caractères UTF-8 directs.
 * Admin : Gilles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Inbox } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export const NetworkStatusBar: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, pendingCount } = useOfflineQueue();
  const showBar = !isOnline;

  return (
    <AnimatePresence>
      {showBar && (
        <motion.div
          className={[
            'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold',
            !isOnline
              ? 'bg-red-900/90 text-red-200 backdrop-blur-sm'
              : 'bg-orange-900/90 text-orange-200 backdrop-blur-sm',
          ].join(' ')}
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <WifiOff size={12} />
          <span>{t('network.offline')}</span>
          {pendingCount > 0 && (
            <>
              <span className="opacity-50">·</span>
              <Inbox size={11} />
              <span>
                {t('network.pendingAlerts', { count: pendingCount })}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
