import { useEffect, useState } from "react";
import { useI18n } from "../i18n.tsx";
import { MAX_SIDE, parseRoster, type Project } from "../core/project.ts";
import { MAX_PUPILS } from "../core/problem.ts";
import type { Action } from "../core/project.ts";
import { NumberField } from "./NumberField.tsx";
import { Icon } from "./Icons.tsx";

interface Props {
  project: Project;
  editRoom: boolean;
  onEditRoom: (on: boolean) => void;
  dispatch: (action: Action) => void;
}

export function ClassPanel({ project, editRoom, onEditRoom, dispatch }: Props) {
  const { t } = useI18n();
  const joined = project.pupils.map((p) => p.name).join("\n");
  const [text, setText] = useState(joined);
  const [truncated, setTruncated] = useState(false);
  // A loaded file or an example replaces the roster from outside.
  useEffect(() => setText(joined), [joined]);

  const apply = () => {
    const { names, truncated: cut } = parseRoster(text);
    setTruncated(cut);
    dispatch({ type: "setRoster", names });
    setText(names.join("\n"));
  };
  const dirty = text !== joined;
  const size = (key: "rows" | "cols", n: number) => {
    dispatch({
      type: "setRoom",
      rows: key === "rows" ? n : project.room.rows,
      cols: key === "cols" ? n : project.room.cols,
    });
  };

  return (
    <section className="panel" aria-labelledby="class-title">
      <h2 id="class-title">{t("class.title")}</h2>
      <label className="field">
        <span>{t("class.name")}</span>
        <input
          type="text"
          value={project.name}
          maxLength={80}
          onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>{t("class.roster")}</span>
        <textarea
          rows={8}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
        <small>{t("class.rosterHint")}</small>
      </label>
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={!dirty}
          onClick={apply}
        >
          {t("class.update")}
        </button>
        <span className="count">
          {t("class.count", { count: project.pupils.length })} / {MAX_PUPILS}
        </span>
      </div>
      {truncated ? (
        <p className="hint">{t("class.truncated", { max: MAX_PUPILS })}</p>
      ) : null}
      <fieldset className="room">
        <legend>{t("class.room")}</legend>
        <label className="field inline">
          <span>{t("class.rows")}</span>
          <NumberField
            min={1}
            max={MAX_SIDE}
            value={project.room.rows}
            onCommit={(n) => size("rows", n)}
          />
        </label>
        <label className="field inline">
          <span>{t("class.cols")}</span>
          <NumberField
            min={1}
            max={MAX_SIDE}
            value={project.room.cols}
            onCommit={(n) => size("cols", n)}
          />
        </label>
        <button
          type="button"
          className={`btn${editRoom ? " primary" : ""}`}
          aria-pressed={editRoom}
          onClick={() => onEditRoom(!editRoom)}
        >
          <Icon name={editRoom ? "check" : "desk"} />
          <span>
            {editRoom ? t("class.editRoomDone") : t("class.editRoom")}
          </span>
        </button>
      </fieldset>
    </section>
  );
}
