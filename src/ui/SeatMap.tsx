import { useState } from "react";
import { useI18n } from "../i18n.tsx";
import { seatCount, type Plan, type Room } from "../core/problem.ts";
import { seatPosition } from "../core/labels.ts";
import { Icon } from "./Icons.tsx";

interface Props {
  room: Room;
  plan: Plan;
  names: Map<string, string>;
  pupilOrder: string[];
  pinned: Set<number>;
  focusPupils: Set<string>;
  changed: Set<string>;
  broken: Set<string>;
  editRoom: boolean;
  readOnly: boolean;
  onMove: (pupil: string, seat: number) => void;
  onUnseat: (pupil: string) => void;
  onToggleBlocked: (seat: number) => void;
}

export function SeatMap(props: Props) {
  const { t } = useI18n();
  const { room, plan, names } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const occupant = new Map<number, string>();
  for (const [pupil, seat] of Object.entries(plan)) occupant.set(seat, pupil);
  const unseated = props.pupilOrder.filter((id) => plan[id] === undefined);
  const blocked = new Set(room.blocked);
  const interactive = !props.readOnly && !props.editRoom;

  const drop = (seat: number, pupil: string | null) => {
    setOver(null);
    if (!pupil) return;
    setSelected(null);
    props.onMove(pupil, seat);
  };

  const clickSeat = (seat: number) => {
    if (props.editRoom) return props.onToggleBlocked(seat);
    if (props.readOnly) return;
    const here = occupant.get(seat);
    if (selected && here !== selected) return drop(seat, selected);
    setSelected(here && here !== selected ? here : null);
  };

  const label = (seat: number) => {
    const { row, col } = seatPosition(room, seat);
    const who = occupant.get(seat);
    return who
      ? t("plan.seatLabelFilled", { row, col, name: names.get(who) ?? "" })
      : t("plan.seatLabel", { row, col });
  };

  return (
    <div className="seatmap">
      <div className="board" aria-hidden="true">
        {t("plan.front")}
      </div>
      <div
        className={`grid${props.editRoom ? " is-editing" : ""}`}
        style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label={t("plan.title")}
      >
        {Array.from({ length: seatCount(room) }, (_, seat) => {
          const who = occupant.get(seat);
          const isBlocked = blocked.has(seat);
          const classes = [
            "seat",
            isBlocked && "is-blocked",
            !who && !isBlocked && "is-empty",
            who && selected === who && "is-selected",
            who && props.focusPupils.has(who) && "is-focus",
            who && props.changed.has(who) && "is-changed",
            who && props.broken.has(who) && "is-broken",
            over === seat && "is-over",
          ];
          return (
            <button
              key={seat}
              type="button"
              className={classes.filter(Boolean).join(" ")}
              aria-label={
                isBlocked ? `${label(seat)}: ${t("plan.blocked")}` : label(seat)
              }
              aria-pressed={who ? selected === who : undefined}
              draggable={interactive && Boolean(who)}
              onClick={() => clickSeat(seat)}
              onDragStart={(e) => {
                if (who) e.dataTransfer.setData("text/plain", who);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (interactive && !isBlocked) {
                  e.preventDefault();
                  setOver(seat);
                }
              }}
              onDragLeave={() => setOver((o) => (o === seat ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (interactive)
                  drop(seat, e.dataTransfer.getData("text/plain"));
              }}
            >
              {isBlocked ? (
                props.editRoom ? (
                  <span className="seat-note">×</span>
                ) : null
              ) : who ? (
                <span className="seat-name">{names.get(who)}</span>
              ) : null}
              {props.pinned.has(seat) && !isBlocked ? (
                <span className="seat-pin" title={t("plan.pinned")}>
                  <Icon name="lock" size={12} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {props.editRoom ? (
        <p className="hint">{t("class.editRoomHint")}</p>
      ) : (
        <>
          {unseated.length > 0 ? (
            <div className="tray">
              <h3>{t("plan.unseated")}</h3>
              <div className="chips">
                {unseated.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip${selected === id ? " is-selected" : ""}`}
                    draggable={interactive}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", id)
                    }
                    onClick={() =>
                      interactive && setSelected(selected === id ? null : id)
                    }
                  >
                    {names.get(id)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {interactive ? (
            <div className="selection" aria-live="polite">
              <p className="hint">
                {selected
                  ? t("plan.selected", { name: names.get(selected) ?? "" })
                  : t("plan.dragHint")}
              </p>
              {selected && plan[selected] !== undefined ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    props.onUnseat(selected);
                    setSelected(null);
                  }}
                >
                  {t("plan.unseat", { name: names.get(selected) ?? "" })}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
