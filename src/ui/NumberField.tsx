import { useState } from "react";

interface Props {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

/**
 * A number input that keeps what is typed as a draft. The value is applied on
 * blur, on Enter, or when the spinner or arrow keys step it, so clearing the
 * box to type a new number never passes through a destructive value.
 */
export function NumberField({ value, min, max, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    const parsed = Math.floor(Number(text));
    const next =
      text.trim() === "" || !Number.isFinite(parsed) ? value : parsed;
    const clamped = Math.min(max, Math.max(min, next));
    setDraft(null);
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => {
        const typing = Boolean((e.nativeEvent as InputEvent).inputType);
        setDraft(e.target.value);
        if (!typing) commit(e.target.value);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget.value);
      }}
    />
  );
}
