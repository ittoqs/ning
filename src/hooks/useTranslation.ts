import { useLanguageStore } from '../store/useLanguageStore';
import { translations, TranslationKeys } from '../locales/translations';

export const useTranslation = () => {
  const { lang } = useLanguageStore();
  const t = (key: TranslationKeys) => {
    return translations[lang][key] || translations['en'][key] || key;
  };
  return { t, lang };
};
