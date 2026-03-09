import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, RefreshCw, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { apiUrl } from '../lib/apiBase';

const LOCAL_VERSION = '2026030802';
const STORAGE_KEY = 'vigilink-last-seen-version';

function needsWhatsNew(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== LOCAL_VERSION;
  } catch {
    return false;
  }
}

export const UpdateBanner: React.FC = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = React.useState(needsWhatsNew);
  const [bannerType, setBannerType] = React.useState<'whats-new' | 'remote-update'>('whats-new');
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const onSwUpdate = () => {
      setBannerType('remote-update');
      setShowBanner(true);
    };
    window.addEventListener('pwa-update-available', onSwUpdate);
    return () => window.removeEventListener('pwa-update-available', onSwUpdate);
  }, []);

  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(apiUrl('/api/health'), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== LOCAL_VERSION) {
          setBannerType('remote-update');
          setShowBanner(true);
        }
      } catch {}
    };

    const delay = setTimeout(checkVersion, 5000);
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, []);

  if (!showBanner || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, LOCAL_VERSION);
    setDismissed(true);
  };

  const handleUpdate = () => {
    if (bannerType === 'whats-new') {
      localStorage.setItem(STORAGE_KEY, LOCAL_VERSION);
      setDismissed(true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      window.open('https://vigilink-sos.replit.app', '_system');
    } else {
      if ('caches' in window) {
        caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(rs =>
          rs.forEach(r => r.unregister())
        );
      }
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const isWhatsNew = bannerType === 'whats-new';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] px-4 pt-4 animate-slide-down">
      <div className={`max-w-lg mx-auto rounded-2xl p-4 shadow-2xl border ${
        isWhatsNew
          ? 'bg-gradient-to-r from-[#1a2e4a] to-[#0f1e33] border-[#2b4a6e]/40'
          : 'bg-gradient-to-r from-[#1a2e4a] to-[#0f1e33] border-[#2b4a6e]/40'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-white/20 shrink-0 mt-0.5">
            {isWhatsNew
              ? <Sparkles size={20} className="text-white" />
              : <Download size={20} className="text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">
              {isWhatsNew ? t('updateBanner.whatsNewTitle') : t('updateBanner.title')}
            </p>
            <p className={`text-sm mt-1 ${isWhatsNew ? 'text-blue-100' : 'text-blue-100'}`}>
              {isWhatsNew ? t('updateBanner.whatsNewMessage') : t('updateBanner.message')}
            </p>
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleUpdate}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  isWhatsNew
                    ? 'bg-white text-[#1e3a5f] hover:bg-blue-50'
                    : 'bg-white text-blue-700 hover:bg-blue-50'
                }`}
              >
                {isWhatsNew ? (
                  <>{t('updateBanner.understood')}</>
                ) : (
                  <><RefreshCw size={16} />{t('updateBanner.updateNow')}</>
                )}
              </button>
              {!isWhatsNew && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors"
                >
                  {t('updateBanner.later')}
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
          >
            <X size={16} className="text-white/70" />
          </button>
        </div>
      </div>
    </div>
  );
};
