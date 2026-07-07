import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations, { Language, Translations } from './translations';
import { getSettings, updateSettings } from '../database';

interface I18nContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        if (settings.language && (settings.language === 'en' || settings.language === 'hi')) {
          setLanguageState(settings.language as Language);
        }
      } catch (error) {
        console.error('Failed to load language setting:', error);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await updateSettings({ language: lang });
    } catch (error) {
      console.error('Failed to persist language setting:', error);
    }
  }, []);

  const value: I18nContextValue = {
    language,
    t: translations[language],
    setLanguage,
  };

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}

export type { Language, Translations };
