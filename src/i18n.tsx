import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { messages, type Locale } from "./locales/index.ts";
import type en from "./locales/en.ts";

export type MessageKey = keyof typeof en;
type Params = Record<string, string | number>;

const STORAGE_KEY = "seatreason.locale";

export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(lower)) return "zh-TW";
    if (lower.startsWith("zh")) return "zh-CN";
    if (lower.startsWith("pt")) return "pt-BR";
    const base = lower.split("-")[0];
    if (base in messages) return base as Locale;
  }
  return "en";
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Params,
): string {
  const template: string = messages[locale][key] ?? messages.en[key];
  return params
    ? template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""))
    : template;
}

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Params) => string;
}

const Context = createContext<I18n | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in messages) return saved as Locale;
  } catch {
    // Blocked storage means the browser language decides.
  }
  return detectLocale(navigator.languages ?? [navigator.language]);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies until the page is closed.
    }
    setLocaleState(next);
  }, []);
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider is missing");
  return value;
}
