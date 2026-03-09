import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '../i18n/languages';

interface LanguageSelectorProps {
  onSelect: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect }) => {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(i18n.language?.split('-')[0] || 'fr');
  const [search, setSearch] = useState('');

  const filtered = LANGUAGES.filter(
    (l) =>
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (lang: Language) => {
    setSelected(lang.code);
    i18n.changeLanguage(lang.code);
    localStorage.setItem('vigilink-language', lang.code);
  };

  const handleContinue = () => {
    localStorage.setItem('vigilink-language-selected', 'true');
    try {
      const store = localStorage.getItem('vigilink-sos-storage');
      if (store) {
        const parsed = JSON.parse(store);
        if (parsed.state) {
          parsed.state.language = selected;
          localStorage.setItem('vigilink-sos-storage', JSON.stringify(parsed));
        }
      }
    } catch {}
    onSelect();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1a2e4a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('lang.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('lang.subtitle')}</p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('lang.search')}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#c41e2a]"
          />
        </div>

        <div className="bg-card rounded-2xl border border-border max-h-[50vh] overflow-y-auto shadow-sm">
          {filtered.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 ${
                selected === lang.code
                  ? 'bg-[#c41e2a]/10 text-foreground font-semibold'
                  : 'text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="flex-1">
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-muted-foreground">{lang.name}</div>
              </div>
              {selected === lang.code && (
                <div className="w-5 h-5 bg-[#c41e2a] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="btn-3d btn-3d-red w-full mt-6 py-5 text-white font-black rounded-2xl transition-colors text-xl tracking-wide"
        >
          {t('lang.continue')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
