import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Phone, Search, Shield, Heart, Flame, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { emergencyNumbers, CountryEmergency } from '../../data/emergencyNumbers';

function detectUserCountryCode(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzToCountry: Record<string, string> = {
      'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA',
      'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
      'America/St_Johns': 'CA', 'America/Regina': 'CA',
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
      'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US',
      'Europe/Paris': 'FR', 'Europe/London': 'GB', 'Europe/Berlin': 'DE',
      'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT',
      'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
      'Europe/Stockholm': 'SE', 'Europe/Warsaw': 'PL', 'Europe/Bucharest': 'RO',
      'Europe/Kiev': 'UA', 'Europe/Athens': 'GR', 'Europe/Vienna': 'AT',
      'Europe/Dublin': 'IE', 'Europe/Istanbul': 'TR',
      'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA', 'Africa/Tunis': 'TN',
      'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
      'Africa/Johannesburg': 'ZA',
      'Asia/Beirut': 'LB', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
      'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Seoul': 'KR',
      'Asia/Kolkata': 'IN', 'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID',
      'Asia/Manila': 'PH', 'Europe/Moscow': 'RU',
      'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
      'America/Argentina/Buenos_Aires': 'AR', 'America/Bogota': 'CO',
      'Australia/Sydney': 'AU', 'Pacific/Auckland': 'NZ',
    };
    return tzToCountry[tz] || null;
  } catch {
    return null;
  }
}

export const EmergencyNumbersView: React.FC = () => {
  const { t } = useTranslation();
  const setView = useAppStore((s) => s.setView);
  const [search, setSearch] = useState('');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const code = detectUserCountryCode();
    setDetectedCode(code);
  }, []);

  const userCountry = useMemo(() => {
    if (!detectedCode) return null;
    return emergencyNumbers.find((c) => c.code === detectedCode) || null;
  }, [detectedCode]);

  const filtered = useMemo(() => {
    if (!showAll && !search.trim()) return [];
    if (!search.trim()) return emergencyNumbers;
    const q = search.toLowerCase();
    return emergencyNumbers.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search, showAll]);

  const renderCountryCard = (country: CountryEmergency, highlight = false) => (
    <div
      key={country.code}
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${highlight ? 'border-red-300 bg-red-50' : 'border-border bg-card'}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{country.flag}</span>
        <span className="text-sm font-bold text-foreground">{country.country}</span>
        {highlight && (
          <span className="ml-auto text-sm font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">
            {t('emergencyNumbers.yourCountry') || 'Your country'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a
          href={`tel:${country.police}`}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 py-2.5 px-2 hover:bg-blue-100 transition-colors active:scale-95"
        >
          <Shield size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-muted-foreground">{t('emergencyNumbers.police')}</span>
          <span className="text-xs font-bold text-foreground">{country.police}</span>
        </a>
        <a
          href={`tel:${country.ambulance}`}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 py-2.5 px-2 hover:bg-green-100 transition-colors active:scale-95"
        >
          <Heart size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-muted-foreground">{t('emergencyNumbers.ambulance')}</span>
          <span className="text-xs font-bold text-foreground">{country.ambulance}</span>
        </a>
        <a
          href={`tel:${country.fire}`}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 py-2.5 px-2 hover:bg-red-100 transition-colors active:scale-95"
        >
          <Flame size={16} className="text-red-600" />
          <span className="text-sm font-semibold text-muted-foreground">{t('emergencyNumbers.fire')}</span>
          <span className="text-xs font-bold text-foreground">{country.fire}</span>
        </a>
      </div>

      {country.hotlines && country.hotlines.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {t('emergencyNumbers.hotlines')}
          </span>
          {country.hotlines.map((hl, i) => (
            <a
              key={i}
              href={`tel:${hl.number.replace(/\s/g, '')}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm text-muted-foreground truncate">{hl.name}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground shrink-0">
                <Phone size={10} className="text-muted-foreground" />
                {hl.number}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('home')}
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">
          {t('emergencyNumbers.title')}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {t('emergencyNumbers.tapToCall')}
      </p>

      {userCountry && renderCountryCard(userCountry, true)}

      {!userCountry && !showAll && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Globe size={28} />
          <p className="text-sm text-center">{t('emergencyNumbers.countryNotDetected') || 'Country not detected'}</p>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (e.target.value) setShowAll(true); }}
          placeholder={t('emergencyNumbers.search')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder-muted-foreground outline-none focus:border-muted-foreground transition-colors"
        />
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Globe size={14} />
          {t('emergencyNumbers.showAll') || 'Show all countries'}
        </button>
      )}

      {(showAll || search.trim()) && (
        <div className="flex flex-col gap-3">
          {filtered
            .filter((c) => c.code !== detectedCode)
            .map((country) => renderCountryCard(country))}
        </div>
      )}

      {showAll && filtered.filter((c) => c.code !== detectedCode).length === 0 && search.trim() && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Search size={32} />
          <p className="text-sm">{t('emergencyNumbers.search')}</p>
        </div>
      )}
    </div>
  );
};
