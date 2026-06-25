import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../locales/translations';

interface LanguageState {
  lang: Language;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: 'id', // Default
      toggleLanguage: () => set((state) => ({
        lang: state.lang === 'en' ? 'id' : 'en'
      })),
    }),
    { name: 'ning-language-storage' }
  )
);
