import { describe, expect, it } from "vitest";
import { messages, localeNames, type Locale } from "./index.ts";
import en from "./en.ts";
import { detectLocale, translate } from "../i18n.tsx";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const codes = Object.keys(messages) as Locale[];

describe("locales", () => {
  it("ships the nine requested languages", () => {
    expect(codes.sort()).toEqual([
      "de",
      "en",
      "es",
      "fr",
      "ja",
      "ko",
      "pt-BR",
      "zh-CN",
      "zh-TW",
    ]);
    expect(Object.keys(localeNames).sort()).toEqual(codes);
  });

  for (const code of codes.filter((c) => c !== "en")) {
    it(`${code} has every key and the same placeholders as English`, () => {
      const table = messages[code] as Record<string, string>;
      expect(Object.keys(table).sort()).toEqual(Object.keys(en).sort());
      for (const [key, text] of Object.entries(en)) {
        expect(table[key], key).toBeTruthy();
        expect(placeholders(table[key]), `${code} ${key}`).toEqual(
          placeholders(text),
        );
      }
    });

    it(`${code} is translated, not a copy of English`, () => {
      const same = Object.entries(en).filter(
        ([k, v]) => (messages[code] as Record<string, string>)[k] === v,
      );
      // Short shared words such as "Auto" or "Nom" can match. Whole sentences must not.
      expect(same.filter(([, v]) => v.length > 14)).toEqual([]);
    });
  }

  it("fills placeholders", () => {
    expect(translate("en", "rules.pin", { name: "Maya", row: 2, col: 3 })).toBe(
      "Maya sits in row 2, seat 3",
    );
  });

  it("picks a language from the browser list", () => {
    expect(detectLocale(["zh-TW", "en"])).toBe("zh-TW");
    expect(detectLocale(["zh-Hant-HK"])).toBe("zh-TW");
    expect(detectLocale(["zh-CN"])).toBe("zh-CN");
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["fr-CA", "en"])).toBe("fr");
    expect(detectLocale(["sv", "de-AT"])).toBe("de");
    expect(detectLocale(["sv"])).toBe("en");
  });
});
