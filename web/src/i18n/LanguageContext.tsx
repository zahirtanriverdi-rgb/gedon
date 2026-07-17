'use client';
import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { translations } from './translations';

export type Language = 'az' | 'en' | 'ru';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'az', label: 'AZ' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

const STORAGE_KEY = 'gg_language';

function getNested(dict: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), dict);
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'az';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'ru' || stored === 'az' ? stored : 'az';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  // Keep <html lang> in sync with the active UI language — index.html ships lang="az", which
  // is wrong for EN/RU sessions (screen readers and search engines both read this attribute).
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const value = getNested(translations[language], key) ?? getNested(translations.az, key) ?? key;
      let result = typeof value === 'string' ? value : key;
      if (vars) {
        for (const [varKey, varValue] of Object.entries(vars)) {
          result = result.replace(new RegExp(`{{${varKey}}}`, 'g'), String(varValue));
        }
      }
      return result;
    };
  }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}