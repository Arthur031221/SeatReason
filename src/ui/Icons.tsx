const paths = {
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  undo: "M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12",
  redo: "m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 12",
  print: "M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z",
  save: "M12 4v11m0 0-4-4m4 4 4-4M5 19h14",
  open: "M4 19V6h6l2 2h8v11zM4 11h16",
  check: "m5 13 4 4 10-11",
  warn: "M12 4 3 20h18zM12 10v4M12 17v.5",
  cross: "m6 6 12 12M18 6 6 18",
  front: "M4 5h16M7 10h10M7 15h10M7 20h10",
  apart: "M5 9h4v6H5zM15 9h4v6h-4zM11 12h2",
  pin: "M12 3v9m-4 0h8m-4 0v9",
  desk: "M5 8h14v4H5zM8 12v7m8-7v7",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  spark: "m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
