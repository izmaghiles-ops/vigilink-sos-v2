import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import hi from './locales/hi.json';
import ru from './locales/ru.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import uk from './locales/uk.json';
import sv from './locales/sv.json';

const savedLang = (() => {
  try {
    const store = localStorage.getItem('vigilink-sos-storage');
    if (store) {
      const parsed = JSON.parse(store);
      return parsed?.state?.language || null;
    }
  } catch {}
  return null;
})();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      ar: { translation: ar },
      pt: { translation: pt },
      de: { translation: de },
      it: { translation: it },
      tr: { translation: tr },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      hi: { translation: hi },
      ru: { translation: ru },
      nl: { translation: nl },
      pl: { translation: pl },
      ro: { translation: ro },
      uk: { translation: uk },
      sv: { translation: sv },
    },
    lng: savedLang || undefined,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vigilink-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
