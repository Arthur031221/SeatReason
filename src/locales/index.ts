import en from "./en.ts";
import zhTW from "./zh-TW.ts";
import zhCN from "./zh-CN.ts";
import ja from "./ja.ts";
import ko from "./ko.ts";
import es from "./es.ts";
import fr from "./fr.ts";
import de from "./de.ts";
import ptBR from "./pt-BR.ts";

type Messages = Record<keyof typeof en, string>;

export const messages: Record<
  "en" | "zh-TW" | "zh-CN" | "ja" | "ko" | "es" | "fr" | "de" | "pt-BR",
  Messages
> = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  es,
  fr,
  de,
  "pt-BR": ptBR,
};

export type Locale = keyof typeof messages;

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  "pt-BR": "Português (Brasil)",
};
