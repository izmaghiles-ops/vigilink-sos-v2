import { fr, enUS, es, ar, pt, de, it, tr, zhCN, ja, ko, hi, ru, nl, pl, ro, uk, sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';

const LOCALE_MAP: Record<string, Locale> = {
  fr, en: enUS, es, ar, pt, de, it, tr,
  zh: zhCN, ja, ko, hi, ru, nl, pl, ro, uk, sv,
};

function getCurrentLang(): string {
  return localStorage.getItem('vigilink-language') || 'fr';
}

export function getDateFnsLocale(): Locale {
  return LOCALE_MAP[getCurrentLang()] || enUS;
}

export function getIntlLocaleTag(): string {
  const lang = getCurrentLang();
  const map: Record<string, string> = {
    fr: 'fr-CA', en: 'en-US', es: 'es-ES', ar: 'ar-SA',
    pt: 'pt-BR', de: 'de-DE', it: 'it-IT', tr: 'tr-TR',
    zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN',
    ru: 'ru-RU', nl: 'nl-NL', pl: 'pl-PL', ro: 'ro-RO',
    uk: 'uk-UA', sv: 'sv-SE',
  };
  return map[lang] || lang;
}
