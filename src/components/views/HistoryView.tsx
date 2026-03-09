import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { fetchAlertHistory } from '../../lib/api';
import { AlertLog, AlertTriggerType, AlertStatus } from '../../types';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '../../lib/dateLocale';

function formaterDate(v: string | number | undefined): string {
  if (v == null) return '—';
  try {
    const d = typeof v === 'number' ? new Date(v) : parseISO(v);
    return format(d, 'd MMM yyyy · HH:mm', { locale: getDateFnsLocale() });
  } catch {
    return String(v);
  }
}

const TYPE_KEYS: Record<AlertTriggerType, string> = {
  sos:        'history.typeSos',
  dms:        'history.typeDms',
  duress:     'history.typeDuress',
  chute:      'history.typeChute',
  secousse:   'history.typeSecousse',
  bouton:     'history.typeBouton',
  widget_sos: 'history.typeWidgetSos',
};

const COULEUR_TYPE: Record<AlertTriggerType, string> = {
  sos:        'text-red-400 border-red-500/30 bg-red-500/10',
  dms:        'text-purple-400 border-purple-500/30 bg-purple-500/10',
  duress:     'text-orange-400 border-orange-500/30 bg-orange-500/10',
  chute:      'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  secousse:   'text-amber-400 border-amber-500/30 bg-amber-500/10',
  bouton:     'text-red-400 border-red-500/30 bg-red-500/10',
  widget_sos: 'text-red-400 border-red-500/30 bg-red-500/10',
};

const STATUS_KEYS: Record<AlertStatus, string> = {
  sent:    'history.statusSent',
  pending: 'history.statusPending',
  queued:  'history.statusQueued',
  failed:  'history.statusFailed',
};

const COULEUR_POINT: Record<AlertStatus, string> = {
  sent:    'bg-green-500',
  pending: 'bg-yellow-500',
  queued:  'bg-blue-500',
  failed:  'bg-red-500',
};

export const HistoryView: React.FC = () => {
  const { t } = useTranslation();
  const { alertHistory, setAlertHistory } = useAppStore();
  const [chargement, setChargement] = useState(false);

  const charger = async () => {
    setChargement(true);
    try {
      const data = await fetchAlertHistory();
      if (data.length > 0) setAlertHistory(data);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t('history.title')}</h2>
        <div className="flex items-center gap-2">
          {alertHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm(t('history.deleteAll'))) {
                  setAlertHistory([]);
                }
              }}
              className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-all"
              title={t('history.clearHistory')}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={charger}
            className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw size={14} className={chargement ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {alertHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle size={32} className="text-gray-700" />
          <p className="text-sm text-gray-600 text-center">
            {t('history.empty')}
          </p>
          <p className="text-xs text-gray-700 text-center">
            {t('history.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alertHistory.map((alert: AlertLog, i) => {
            const typeKey       = TYPE_KEYS[alert.triggerType]   ?? TYPE_KEYS.sos;
            const couleurType   = COULEUR_TYPE[alert.triggerType] ?? COULEUR_TYPE.sos;
            const statusKey     = STATUS_KEYS[alert.status]      ?? STATUS_KEYS.pending;
            const couleurPoint  = COULEUR_POINT[alert.status]    ?? COULEUR_POINT.pending;

            return (
              <motion.div
                key={alert.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm font-bold border rounded-full px-2.5 py-0.5 ${couleurType}`}>
                    {t(typeKey)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${couleurPoint}`} />
                            <span className="text-sm text-muted-foreground">{t(statusKey)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={11} />
                  {formaterDate(alert.triggeredAt)}
                </div>

                {alert.mapsLink && (
                  <a
                    href={alert.mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
                  >
                            <MapPin size={11} />
                    {alert.latitude && alert.longitude
                      ? `${Number(alert.latitude).toFixed(4)}, ${Number(alert.longitude).toFixed(4)}`
                      : t('history.viewPosition')}
                    <ExternalLink size={10} />
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
