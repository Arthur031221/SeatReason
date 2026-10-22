import { useRef } from "react";
import { useI18n } from "../i18n.tsx";
import { localeNames, type Locale } from "../locales/index.ts";
import type { ScenarioKey } from "../core/scenarios.ts";
import { Icon } from "./Icons.tsx";

export type Theme = "auto" | "light" | "dark";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  error: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onExample: (key: ScenarioKey) => void;
  onSave: () => void;
  onOpen: (file: File) => void;
  onPrint: () => void;
  onTheme: (theme: Theme) => void;
}

const THEMES: Theme[] = ["auto", "light", "dark"];

export function Header(props: Props) {
  const { t, locale, setLocale } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const nextTheme = THEMES[(THEMES.indexOf(props.theme) + 1) % THEMES.length];

  return (
    <header className="topbar">
      <div className="brand">
        <img src="./favicon.svg" alt="" width="32" height="32" />
        <div>
          <h1>SeatReason</h1>
          <p>{t("app.tagline")}</p>
        </div>
      </div>
      <div className="toolbar">
        <label className="select">
          <span className="sr-only">{t("header.examples")}</span>
          <select
            value=""
            aria-label={t("header.examples")}
            onChange={(e) => {
              if (e.target.value)
                props.onExample(e.target.value as ScenarioKey);
            }}
          >
            <option value="">{t("header.examples")}</option>
            <option value="squeeze">{t("header.exampleSqueeze")}</option>
            <option value="crowded">{t("header.exampleCrowded")}</option>
            <option value="ready">{t("header.exampleReady")}</option>
          </select>
        </label>
        <button
          type="button"
          className="icon-btn"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title={t("header.undo")}
          aria-label={t("header.undo")}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          title={t("header.redo")}
          aria-label={t("header.redo")}
        >
          <Icon name="redo" />
        </button>
        <button type="button" className="btn" onClick={props.onSave}>
          <Icon name="save" />
          <span>{t("header.save")}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="open" />
          <span>{t("header.open")}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="open-file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) props.onOpen(file);
          }}
        />
        <button type="button" className="btn" onClick={props.onPrint}>
          <Icon name="print" />
          <span>{t("header.print")}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => props.onTheme(nextTheme)}
          title={`${t("header.theme")}: ${t(`theme.${props.theme}`)}`}
          aria-label={`${t("header.theme")}: ${t(`theme.${props.theme}`)}`}
        >
          <Icon name={props.theme === "dark" ? "moon" : "sun"} />
        </button>
        <label className="select">
          <span className="sr-only">{t("header.language")}</span>
          <select
            value={locale}
            aria-label={t("header.language")}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {(Object.keys(localeNames) as Locale[]).map((code) => (
              <option key={code} value={code}>
                {localeNames[code]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {props.error ? (
        <p className="banner is-error" role="alert">
          {props.error}
        </p>
      ) : null}
    </header>
  );
}
