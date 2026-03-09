import React from 'react';
import { Home, Users, Clock, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppView } from '../types';

interface BottomNavProps {
  current:  AppView;
  onChange: (view: AppView) => void;
}

type VueNav = 'home' | 'contacts' | 'history' | 'settings';

const ELEMENTS_NAV: { vue: VueNav; icone: (active: boolean) => React.ReactNode; labelKey: string }[] = [
  { vue: 'home',     icone: (a) => <Home size={28} strokeWidth={a ? 2.5 : 2} />,     labelKey: 'common.home'     },
  { vue: 'contacts', icone: (a) => <Users size={28} strokeWidth={a ? 2.5 : 2} />,    labelKey: 'common.contacts'  },
  { vue: 'history',  icone: (a) => <Clock size={28} strokeWidth={a ? 2.5 : 2} />,    labelKey: 'common.history'   },
  { vue: 'settings', icone: (a) => <Settings size={28} strokeWidth={a ? 2.5 : 2} />, labelKey: 'common.settings'  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ current, onChange }) => {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 max-w-sm mx-auto border-t backdrop-blur-xl transition-colors duration-500"
      style={{
        backgroundColor: 'var(--nav-bg, rgba(10,10,10,0.97))',
        borderColor:     'var(--nav-border, rgba(255,255,255,0.12))',
      }}
    >
      <div className="flex">
        {ELEMENTS_NAV.map(({ vue, icone, labelKey }) => {
          const estActif = current === vue;
          return (
            <button
              key={vue}
              onClick={() => onChange(vue as AppView)}
              className={[
                'flex-1 flex flex-col items-center justify-center py-3 gap-1.5 transition-all relative',
                estActif ? 'text-red-600' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {icone(estActif)}
              <span className={`text-xs font-bold uppercase tracking-wider ${estActif ? 'text-red-600' : ''}`}>
                {t(labelKey)}
              </span>
              {estActif && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-red-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
