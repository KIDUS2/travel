import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'am';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} });

function initialLang(): Lang {
  try {
    return localStorage.getItem('teguwaz.lang') === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('teguwaz.lang', l);
    } catch {
      /* storage unavailable */
    }
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Bilingual label: primary in the chosen language, secondary in the other. */
export function useBi() {
  const { lang } = useLang();
  return (en: string, am: string) => (lang === 'am' ? { primary: am, secondary: en, primaryIsAm: true } : { primary: en, secondary: am, primaryIsAm: false });
}
