import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plane, ArrowLeft, Clock, MapPin, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const TravelModeView: React.FC = () => {
  const { t } = useTranslation();
  const { user, travelMode, setTravelMode, setView } = useAppStore();

  const isPro = user.subscription === 'pro';
  const isPlatinum = user.subscription === 'platinum';
  const hasAccess = isPro || isPlatinum;

  const [destination, setDestination] = useState(travelMode.destination);
  const [checkInMorning, setCheckInMorning] = useState(travelMode.checkInMorning);
  const [checkInEvening, setCheckInEvening] = useState(travelMode.checkInEvening);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setTravelMode({ destination, checkInMorning, checkInEvening });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleActivate = () => {
    setTravelMode({ active: true, destination, checkInMorning, checkInEvening, missedCheckIns: 0, lastCheckIn: null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeactivate = () => {
    setTravelMode({ active: false });
  };

  const handleCheckIn = () => {
    setTravelMode({ lastCheckIn: Date.now() });
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => setView('settings')}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <Plane size={20} className="text-blue-400" />
        <h1 className="text-lg font-bold">{t('travel.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        {!hasAccess ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="p-4 rounded-full bg-card border border-border">
              <Lock size={32} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">{t('travel.proOnly')}</p>
            <button
              type="button"
              onClick={() => setView('upgrade')}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              {t('upgrade.upgrade')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t('travel.description')}</p>

            {travelMode.active && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-300">
                <CheckCircle size={20} className="text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">{t('travel.active')}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} />
                {t('travel.destination')}
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t('travel.destination')}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                {t('travel.morningCheckIn')}
              </label>
              <input
                type="time"
                value={checkInMorning}
                onChange={(e) => setCheckInMorning(e.target.value)}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                {t('travel.eveningCheckIn')}
              </label>
              <input
                type="time"
                value={checkInEvening}
                onChange={(e) => setCheckInEvening(e.target.value)}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {travelMode.active && (
              <>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  {t('travel.checkIn')}
                </button>

                {travelMode.lastCheckIn && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>{t('travel.lastCheckIn')}: {new Date(travelMode.lastCheckIn).toLocaleString()}</span>
                  </div>
                )}

                {travelMode.missedCheckIns > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-sm">
                    <AlertTriangle size={16} />
                    <span>{t('travel.missedCheckIns')}: {travelMode.missedCheckIns}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-3 mt-2">
              {!travelMode.active ? (
                <button
                  type="button"
                  onClick={handleActivate}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                >
                  {t('travel.activate')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                      saved
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {saved ? '✓' : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    className="w-full py-3 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-sm transition-colors"
                  >
                    {t('travel.deactivate')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
