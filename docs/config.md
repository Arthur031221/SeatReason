# Configuration

SeatReason has no config file and no environment variables. Everything is set in the page.

## Limits

| Limit                               | Value     | Where                                       |
| ----------------------------------- | --------- | ------------------------------------------- |
| Pupils                              | 40        | `MAX_PUPILS` in `src/core/problem.ts`       |
| Seat positions                      | 48        | `MAX_SEATS` in `src/core/problem.ts`        |
| Rows or seats per row               | 12        | `MAX_SIDE` in `src/core/project.ts`         |
| Time for one check and its previews | 8 seconds | `TIME_LIMIT_MS` in `src/hooks/useSolver.ts` |

## Stored in the browser

| Key                  | Content                                   |
| -------------------- | ----------------------------------------- |
| `seatreason.project` | The current class, rules and plan as JSON |
| `seatreason.theme`   | `auto`, `light` or `dark`                 |
| `seatreason.locale`  | One of the nine locale codes              |

The offline copy of the app is kept in a cache named `seatreason-` plus a build hash. Clearing site data in the browser removes all three keys and the cached copy.

## Languages

`en`, `zh-TW`, `zh-CN`, `ja`, `ko`, `es`, `fr`, `de` and `pt-BR`. The first visit follows the browser language and falls back to English. A test checks that every locale file has the same keys as `en`.

## Plan file

A file is JSON with `version` set to `1`.

```json
{
  "version": 1,
  "name": "Room 12",
  "room": { "rows": 5, "cols": 6, "blocked": [2, 3] },
  "pupils": [{ "id": "p1", "name": "Maya" }],
  "rules": [
    { "id": "r1", "kind": "front", "pupil": "p1", "rows": 1, "enabled": true }
  ],
  "plan": { "p1": 0 },
  "seed": 1
}
```

Seats are numbered from zero, row by row, so seat `row * cols + col`. A rule is one of:

- `{ "kind": "pin", "pupil": id, "seat": n }`
- `{ "kind": "front", "pupil": id, "rows": n }`
- `{ "kind": "apart", "a": id, "b": id }`
- `{ "kind": "together", "a": id, "b": id }`

Every rule also has `id` and `enabled`. A file that fails validation is refused as a whole.
