/**
 * PermissionModal — Demande de permissions GPS et Micro
 * Textes en français pur. Aucune dépendance i18n.
 * Admin : Gilles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Shield, ChevronRight } from 'lucide-react';

interface PermissionModalProps {
  visible:   boolean;
  onConfirm: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ visible, onConfirm }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Fond assombri */}
          <motion.div
            className="fixed inset-0 z-[80] bg-foreground/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Boite de dialogue */}
          <motion.div
            className="fixed inset-x-4 bottom-6 z-[90] flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-2xl"
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          >
            {/* Icone */}
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center">
                <Shield size={26} className="text-red-600" />
              </div>
            </div>

            {/* Titre et description */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-lg font-black text-foreground tracking-tight">
                {t('permissions.title')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                {t('permissions.description')}
              </p>
            </div>

            {/* Raisons */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-2xl bg-card border border-border p-3.5">
                <MapPin size={15} className="text-green-600 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">{t('permissions.gpsTitle')}</span>
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {t('permissions.gpsDesc')}
                  </span>
                </div>
              </div>

            </div>

            {/* Note confidentialité */}
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t('permissions.description')}
            </p>

            {/* Bouton de confirmation */}
            <motion.button
              onClick={onConfirm}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm tracking-wide transition-colors shadow-lg shadow-red-200/50"
              whileTap={{ scale: 0.975 }}
            >
              {t('permissions.allow')}
              <ChevronRight size={15} className="shrink-0" />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
