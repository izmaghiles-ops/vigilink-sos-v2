import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Pays {
  code:      string;
  nom:       string;
  indicatif: string;
  drapeau:   string;
}

const PAYS_LISTE: Pays[] = [
  { code: 'AF', nom: 'Afghanistan',         indicatif: '+93',   drapeau: '🇦🇫' },
  { code: 'ZA', nom: 'Afrique du Sud',      indicatif: '+27',   drapeau: '🇿🇦' },
  { code: 'AL', nom: 'Albanie',             indicatif: '+355',  drapeau: '🇦🇱' },
  { code: 'DZ', nom: 'Algérie',             indicatif: '+213',  drapeau: '🇩🇿' },
  { code: 'DE', nom: 'Allemagne',           indicatif: '+49',   drapeau: '🇩🇪' },
  { code: 'AO', nom: 'Angola',              indicatif: '+244',  drapeau: '🇦🇴' },
  { code: 'SA', nom: 'Arabie Saoudite',     indicatif: '+966',  drapeau: '🇸🇦' },
  { code: 'AR', nom: 'Argentine',           indicatif: '+54',   drapeau: '🇦🇷' },
  { code: 'AM', nom: 'Arménie',             indicatif: '+374',  drapeau: '🇦🇲' },
  { code: 'AU', nom: 'Australie',           indicatif: '+61',   drapeau: '🇦🇺' },
  { code: 'AT', nom: 'Autriche',            indicatif: '+43',   drapeau: '🇦🇹' },
  { code: 'AZ', nom: 'Azerbaïdjan',         indicatif: '+994',  drapeau: '🇦🇿' },
  { code: 'BE', nom: 'Belgique',            indicatif: '+32',   drapeau: '🇧🇪' },
  { code: 'BJ', nom: 'Bénin',              indicatif: '+229',  drapeau: '🇧🇯' },
  { code: 'BR', nom: 'Brésil',             indicatif: '+55',   drapeau: '🇧🇷' },
  { code: 'BF', nom: 'Burkina Faso',        indicatif: '+226',  drapeau: '🇧🇫' },
  { code: 'CM', nom: 'Cameroun',            indicatif: '+237',  drapeau: '🇨🇲' },
  { code: 'CA', nom: 'Canada',              indicatif: '+1',    drapeau: '🇨🇦' },
  { code: 'CL', nom: 'Chili',              indicatif: '+56',   drapeau: '🇨🇱' },
  { code: 'CN', nom: 'Chine',              indicatif: '+86',   drapeau: '🇨🇳' },
  { code: 'CO', nom: 'Colombie',            indicatif: '+57',   drapeau: '🇨🇴' },
  { code: 'CD', nom: 'Congo (RDC)',         indicatif: '+243',  drapeau: '🇨🇩' },
  { code: 'CG', nom: 'Congo (Brazzaville)', indicatif: '+242',  drapeau: '🇨🇬' },
  { code: 'KR', nom: 'Corée du Sud',        indicatif: '+82',   drapeau: '🇰🇷' },
  { code: 'CI', nom: "Côte d'Ivoire",       indicatif: '+225',  drapeau: '🇨🇮' },
  { code: 'HR', nom: 'Croatie',             indicatif: '+385',  drapeau: '🇭🇷' },
  { code: 'CU', nom: 'Cuba',               indicatif: '+53',   drapeau: '🇨🇺' },
  { code: 'DK', nom: 'Danemark',            indicatif: '+45',   drapeau: '🇩🇰' },
  { code: 'EG', nom: 'Égypte',             indicatif: '+20',   drapeau: '🇪🇬' },
  { code: 'AE', nom: 'Émirats Arabes Unis', indicatif: '+971',  drapeau: '🇦🇪' },
  { code: 'ES', nom: 'Espagne',             indicatif: '+34',   drapeau: '🇪🇸' },
  { code: 'EE', nom: 'Estonie',             indicatif: '+372',  drapeau: '🇪🇪' },
  { code: 'ET', nom: 'Éthiopie',           indicatif: '+251',  drapeau: '🇪🇹' },
  { code: 'US', nom: 'États-Unis',          indicatif: '+1',    drapeau: '🇺🇸' },
  { code: 'FI', nom: 'Finlande',            indicatif: '+358',  drapeau: '🇫🇮' },
  { code: 'FR', nom: 'France',              indicatif: '+33',   drapeau: '🇫🇷' },
  { code: 'GA', nom: 'Gabon',              indicatif: '+241',  drapeau: '🇬🇦' },
  { code: 'GH', nom: 'Ghana',              indicatif: '+233',  drapeau: '🇬🇭' },
  { code: 'GR', nom: 'Grèce',             indicatif: '+30',   drapeau: '🇬🇷' },
  { code: 'GT', nom: 'Guatemala',           indicatif: '+502',  drapeau: '🇬🇹' },
  { code: 'GN', nom: 'Guinée',             indicatif: '+224',  drapeau: '🇬🇳' },
  { code: 'HT', nom: 'Haïti',             indicatif: '+509',  drapeau: '🇭🇹' },
  { code: 'HN', nom: 'Honduras',            indicatif: '+504',  drapeau: '🇭🇳' },
  { code: 'HU', nom: 'Hongrie',             indicatif: '+36',   drapeau: '🇭🇺' },
  { code: 'IN', nom: 'Inde',               indicatif: '+91',   drapeau: '🇮🇳' },
  { code: 'ID', nom: 'Indonésie',          indicatif: '+62',   drapeau: '🇮🇩' },
  { code: 'IQ', nom: 'Irak',              indicatif: '+964',  drapeau: '🇮🇶' },
  { code: 'IR', nom: 'Iran',              indicatif: '+98',   drapeau: '🇮🇷' },
  { code: 'IE', nom: 'Irlande',             indicatif: '+353',  drapeau: '🇮🇪' },
  { code: 'IL', nom: 'Israël',            indicatif: '+972',  drapeau: '🇮🇱' },
  { code: 'IT', nom: 'Italie',             indicatif: '+39',   drapeau: '🇮🇹' },
  { code: 'JM', nom: 'Jamaïque',          indicatif: '+1876', drapeau: '🇯🇲' },
  { code: 'JP', nom: 'Japon',             indicatif: '+81',   drapeau: '🇯🇵' },
  { code: 'JO', nom: 'Jordanie',            indicatif: '+962',  drapeau: '🇯🇴' },
  { code: 'KZ', nom: 'Kazakhstan',          indicatif: '+7',    drapeau: '🇰🇿' },
  { code: 'KE', nom: 'Kenya',              indicatif: '+254',  drapeau: '🇰🇪' },
  { code: 'KW', nom: 'Koweït',            indicatif: '+965',  drapeau: '🇰🇼' },
  { code: 'LB', nom: 'Liban',             indicatif: '+961',  drapeau: '🇱🇧' },
  { code: 'LY', nom: 'Libye',             indicatif: '+218',  drapeau: '🇱🇾' },
  { code: 'LT', nom: 'Lituanie',            indicatif: '+370',  drapeau: '🇱🇹' },
  { code: 'LU', nom: 'Luxembourg',          indicatif: '+352',  drapeau: '🇱🇺' },
  { code: 'MG', nom: 'Madagascar',          indicatif: '+261',  drapeau: '🇲🇬' },
  { code: 'MY', nom: 'Malaisie',           indicatif: '+60',   drapeau: '🇲🇾' },
  { code: 'ML', nom: 'Mali',              indicatif: '+223',  drapeau: '🇲🇱' },
  { code: 'MA', nom: 'Maroc',             indicatif: '+212',  drapeau: '🇲🇦' },
  { code: 'MX', nom: 'Mexique',            indicatif: '+52',   drapeau: '🇲🇽' },
  { code: 'MD', nom: 'Moldavie',            indicatif: '+373',  drapeau: '🇲🇩' },
  { code: 'MZ', nom: 'Mozambique',          indicatif: '+258',  drapeau: '🇲🇿' },
  { code: 'NA', nom: 'Namibie',             indicatif: '+264',  drapeau: '🇳🇦' },
  { code: 'NP', nom: 'Népal',             indicatif: '+977',  drapeau: '🇳🇵' },
  { code: 'NI', nom: 'Nicaragua',           indicatif: '+505',  drapeau: '🇳🇮' },
  { code: 'NE', nom: 'Niger',             indicatif: '+227',  drapeau: '🇳🇪' },
  { code: 'NG', nom: 'Nigéria',           indicatif: '+234',  drapeau: '🇳🇬' },
  { code: 'NO', nom: 'Norvège',           indicatif: '+47',   drapeau: '🇳🇴' },
  { code: 'NZ', nom: 'Nouvelle-Zélande',  indicatif: '+64',   drapeau: '🇳🇿' },
  { code: 'UG', nom: 'Ouganda',            indicatif: '+256',  drapeau: '🇺🇬' },
  { code: 'UZ', nom: 'Ouzbékistan',        indicatif: '+998',  drapeau: '🇺🇿' },
  { code: 'PK', nom: 'Pakistan',            indicatif: '+92',   drapeau: '🇵🇰' },
  { code: 'PS', nom: 'Palestine',           indicatif: '+970',  drapeau: '🇵🇸' },
  { code: 'PA', nom: 'Panama',             indicatif: '+507',  drapeau: '🇵🇦' },
  { code: 'PY', nom: 'Paraguay',            indicatif: '+595',  drapeau: '🇵🇾' },
  { code: 'NL', nom: 'Pays-Bas',           indicatif: '+31',   drapeau: '🇳🇱' },
  { code: 'PE', nom: 'Pérou',             indicatif: '+51',   drapeau: '🇵🇪' },
  { code: 'PH', nom: 'Philippines',         indicatif: '+63',   drapeau: '🇵🇭' },
  { code: 'PL', nom: 'Pologne',             indicatif: '+48',   drapeau: '🇵🇱' },
  { code: 'PT', nom: 'Portugal',            indicatif: '+351',  drapeau: '🇵🇹' },
  { code: 'QA', nom: 'Qatar',             indicatif: '+974',  drapeau: '🇶🇦' },
  { code: 'RO', nom: 'Roumanie',            indicatif: '+40',   drapeau: '🇷🇴' },
  { code: 'GB', nom: 'Royaume-Uni',         indicatif: '+44',   drapeau: '🇬🇧' },
  { code: 'RU', nom: 'Russie',             indicatif: '+7',    drapeau: '🇷🇺' },
  { code: 'RW', nom: 'Rwanda',             indicatif: '+250',  drapeau: '🇷🇼' },
  { code: 'SN', nom: 'Sénégal',           indicatif: '+221',  drapeau: '🇸🇳' },
  { code: 'RS', nom: 'Serbie',             indicatif: '+381',  drapeau: '🇷🇸' },
  { code: 'SL', nom: 'Sierra Leone',        indicatif: '+232',  drapeau: '🇸🇱' },
  { code: 'SO', nom: 'Somalie',             indicatif: '+252',  drapeau: '🇸🇴' },
  { code: 'SD', nom: 'Soudan',             indicatif: '+249',  drapeau: '🇸🇩' },
  { code: 'LK', nom: 'Sri Lanka',           indicatif: '+94',   drapeau: '🇱🇰' },
  { code: 'SE', nom: 'Suède',             indicatif: '+46',   drapeau: '🇸🇪' },
  { code: 'CH', nom: 'Suisse',             indicatif: '+41',   drapeau: '🇨🇭' },
  { code: 'SY', nom: 'Syrie',             indicatif: '+963',  drapeau: '🇸🇾' },
  { code: 'TJ', nom: 'Tadjikistan',         indicatif: '+992',  drapeau: '🇹🇯' },
  { code: 'TZ', nom: 'Tanzanie',            indicatif: '+255',  drapeau: '🇹🇿' },
  { code: 'TD', nom: 'Tchad',             indicatif: '+235',  drapeau: '🇹🇩' },
  { code: 'TH', nom: 'Thaïlande',         indicatif: '+66',   drapeau: '🇹🇭' },
  { code: 'TG', nom: 'Togo',              indicatif: '+228',  drapeau: '🇹🇬' },
  { code: 'TN', nom: 'Tunisie',            indicatif: '+216',  drapeau: '🇹🇳' },
  { code: 'TR', nom: 'Turquie',            indicatif: '+90',   drapeau: '🇹🇷' },
  { code: 'UA', nom: 'Ukraine',             indicatif: '+380',  drapeau: '🇺🇦' },
  { code: 'UY', nom: 'Uruguay',             indicatif: '+598',  drapeau: '🇺🇾' },
  { code: 'VE', nom: 'Venezuela',           indicatif: '+58',   drapeau: '🇻🇪' },
  { code: 'VN', nom: 'Viêt Nam',           indicatif: '+84',   drapeau: '🇻🇳' },
  { code: 'YE', nom: 'Yémen',             indicatif: '+967',  drapeau: '🇾🇪' },
  { code: 'ZM', nom: 'Zambie',             indicatif: '+260',  drapeau: '🇿🇲' },
  { code: 'ZW', nom: 'Zimbabwe',            indicatif: '+263',  drapeau: '🇿🇼' },
];

const PAYS_PAR_DEFAUT = PAYS_LISTE.find((p) => p.code === 'CA')!;

function paysPourE164(e164: string): Pays {
  if (!e164 || !e164.startsWith('+')) return PAYS_PAR_DEFAUT;
  const sorted = [...PAYS_LISTE].sort((a, b) => b.indicatif.length - a.indicatif.length);
  return sorted.find((p) => e164.startsWith(p.indicatif)) ?? PAYS_PAR_DEFAUT;
}

function localDepuisE164(e164: string, pays: Pays): string {
  if (e164.startsWith(pays.indicatif)) return e164.slice(pays.indicatif.length);
  return e164.replace(/^\+/, '');
}

interface SélecteurPaysProps {
  paysSélectionné: Pays;
  onChangement:    (pays: Pays) => void;
}

const SélecteurPays: React.FC<SélecteurPaysProps> = ({ paysSélectionné, onChangement }) => {
  const { t } = useTranslation();
  const [ouvert,    setOuvert]    = React.useState(false);
  const [recherche, setRecherche] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ouvert) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOuvert(false);
        setRecherche('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [ouvert]);

  React.useEffect(() => {
    if (ouvert) setTimeout(() => inputRef.current?.focus(), 60);
  }, [ouvert]);

  const paysFiltres = React.useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return PAYS_LISTE;
    const starts = PAYS_LISTE.filter(
      (p) => p.nom.toLowerCase().startsWith(q) || p.indicatif.startsWith('+' + q),
    );
    const contains = PAYS_LISTE.filter(
      (p) => !starts.includes(p) && p.nom.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [recherche]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOuvert((o) => !o); setRecherche(''); }}
        className="flex items-center gap-1.5 shrink-0 h-full px-2 hover:bg-muted rounded-lg transition-colors"
        aria-label={`Pays : ${paysSélectionné.nom}`}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-sm overflow-hidden shrink-0"
          style={{ background: 'var(--color-muted, #f1f5f9)', border: '1px solid var(--color-border, #e2e8f0)' }}
        >
          {paysSélectionné.drapeau}
        </span>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {paysSélectionné.indicatif}
        </span>
        <ChevronDown
          size={10}
          className={`text-muted-foreground transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="absolute left-0 top-full mt-1 z-50 w-64 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-card, #ffffff)', border: '1px solid var(--color-border, #e2e8f0)' }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <div className="px-3 py-2.5 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={t('phone.searchCountry')}
                className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              {paysFiltres.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">{t('common.noResults')}</div>
              ) : (
                paysFiltres.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => { onChangement(p); setOuvert(false); setRecherche(''); }}
                    className={[
                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                      p.code === paysSélectionné.code
                        ? 'bg-red-50 text-red-600'
                        : 'hover:bg-muted text-foreground',
                    ].join(' ')}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm overflow-hidden shrink-0"
                      style={{ background: 'var(--color-muted, #f1f5f9)', border: '1px solid var(--color-border, #e2e8f0)' }}
                    >
                      {p.drapeau}
                    </span>
                    <span className="flex-1 text-xs truncate">{p.nom}</span>
                    <span className="text-sm font-mono text-muted-foreground shrink-0">{p.indicatif}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { PAYS_LISTE, paysPourE164, localDepuisE164, SélecteurPays };
export type { Pays, SélecteurPaysProps };

export interface PhoneFieldProps {
  id:           string;
  label?:       string;
  value:        string;
  onChange:     (e164: string) => void;
  accentClass?: string;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  id, label, value, onChange,
  accentClass = 'focus-within:border-red-500/40',
}) => {
  const { t } = useTranslation();
  const [pays,  setPays]  = React.useState<Pays>(() => paysPourE164(value));
  const [local, setLocal] = React.useState<string>(() => localDepuisE164(value, paysPourE164(value)));

  React.useEffect(() => {
    const p = paysPourE164(value);
    setPays(p);
    setLocal(localDepuisE164(value, p));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocalChange = (raw: string) => {
    const chiffres = raw.replace(/\D/g, '');
    setLocal(chiffres);
    onChange(pays.indicatif + chiffres);
  };

  const handlePaysChange = (nouveauPays: Pays) => {
    setPays(nouveauPays);
    onChange(nouveauPays.indicatif + local);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center gap-0 bg-card border border-border rounded-xl transition-colors ${accentClass}`}
      >
        <SélecteurPays paysSélectionné={pays} onChangement={handlePaysChange} />
        <div className="w-px h-7 bg-border shrink-0" />
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={t('phone.localNumber')}
          autoComplete="tel"
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  );
};
