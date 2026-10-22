[Live demo](https://arthur031221.github.io/SeatReason/) | [Traditional Chinese](README.zh-TW.md) | [Simplified Chinese](README.zh-CN.md) | [Japanese](README.ja.md) | [Korean](README.ko.md) | [Spanish](README.es.md) | [French](README.fr.md) | [German](README.de.md) | [Brazilian Portuguese](README.pt-BR.md)

<img src="assets/logo.svg" width="56" height="56" alt="SeatReason logo">

# SeatReason

Seating rules that say why they cannot all hold.

Finding a minimal clash that needs the SAT solver takes a median of 18 to 32 ms, slowest 0.38 s. Repair previews for the same cases take a median of 0.26 to 0.49 s. 51 cases, five runs, method under [Measurements](#measurements).

A teacher's requests can be impossible together, and most planners just say "no solution". SeatReason names the few requests that clash, lets you try dropping each one, and checks everything left over before the plan changes.

![A conflict in the example class, a repaired plan with changed seats outlined, then a hand-made move that breaks a fixed seat and is undone](assets/demo.gif)

It's a static web app. Names stay in the browser and nothing is uploaded. After the first visit it opens without a network, and your browser can install it as an app.

## Before and after

The "Front row squeeze" example: 24 pupils, a 5 by 6 room with two missing desks, 10 requests.

|                    | Before                                   | After choosing "Noor sits in the front row"         |
| ------------------ | ---------------------------------------- | --------------------------------------------------- |
| Result             | "These 6 requests cannot all hold"       | "The plan can meet every request (9 switched on)"   |
| What the page says | The 6 requests, numbered, in plain words | The seats that move are outlined in the room        |
| Seats changed      | None                                     | 4                                                   |
| Plan replaced      | No                                       | Only after "Use this plan and turn the request off" |

## How a plan is made

1. **Describe the class.** Paste names or one CSV column, up to 40 pupils. Equal names are kept apart by internal ids. Set the rows and seats per row, then mark missing desks. The room has at most 48 seat positions.
2. **Add requests.** There are four kinds: a fixed seat, a place in the first N rows, two pupils who must not sit next to each other, and two pupils who must (left, right, in front or behind). You can switch any of them off without deleting it.
3. **Read the verdict.** The check runs by itself a moment after every change, in a worker, with a cancel button. It ends as solved, impossible or inconclusive. An impossible verdict comes with a minimal set of requests: switch off any one of them and the rest work. SeatReason only says so after testing every request in the set.
4. **Try a repair.** Each request in the clash whose removal lets the rest hold has a "Show this plan" button. The preview plans afresh without that request and keeps the current seats where it can. Changed seats are outlined. The plan is replaced only when you press the button that says so.
5. **Adjust and keep.** Drag pupils or click two seats to swap, and fix a pupil in the current seat with one button. A move that breaks a request is shown with the reason and can be undone. The class is saved in the browser, exported to a `.seatreason.json` file and printed as a chart with a request summary.

## Files

| Path                          | Purpose                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `src/core/sat.ts`             | Conflict-driven SAT solver with assumptions, a conflict budget and a stop callback |
| `src/core/encode.ts`          | Turns seating rules into clauses, one selector per request                         |
| `src/core/hall.ts`            | Matching and Hall violators for fixed seats and front rows                         |
| `src/core/analyze.ts`         | Planning, minimal conflict extraction and repair previews                          |
| `src/core/validate.ts`        | Independent plan checker used by the app and the tests                             |
| `src/core/oracle.ts`          | Exhaustive search used only by the tests                                           |
| `src/core/project.ts`         | Project model, history actions, file import and export                             |
| `src/worker.ts`, `src/hooks/` | Worker, cancel and time limit, undo history                                        |
| `src/ui/`, `src/style.css`    | Interface, seat map, print sheet, light and dark themes                            |
| `src/locales/`                | Nine locale files and a test that they share the same keys                         |
| `tests/e2e/`                  | Browser tests against the built app                                                |
| `scripts/`                    | Benchmark, demo recorder, social card and icon renderers, offline worker template  |
| `docs/`                       | Install, usage, config and architecture notes                                      |

## Installation

```sh
git clone https://github.com/Arthur031221/SeatReason && cd SeatReason && npm ci && npm start
```

The page is then at `http://127.0.0.1:4173/`.

<details>
<summary>Linux and macOS</summary>

Install Node.js 22.12 or newer, then run the command above in a terminal.

</details>

<details>
<summary>Windows</summary>

Install Node.js 22.12 or newer. In PowerShell, run these commands one after another:

```powershell
git clone https://github.com/Arthur031221/SeatReason
cd SeatReason
npm ci
npm start
```

</details>

<details>
<summary>Any static host</summary>

Run `npm ci && npm run build` and upload the `dist/` folder. All paths are relative, so it works from a sub-folder. There's no server code and no network call after the page loads.

</details>

## Usage

The page opens on the "Front row squeeze" example, so the conflict list is already there, with a repair under each request. Other examples are under Example class.

To use your own class:

1. Paste the roster and press "Update class".
2. Set the room size and mark missing desks.
3. Add requests. The check restarts on its own.
4. Press "Show this plan" under a request in a conflict, then "Use this plan and turn the request off" if you accept it.
5. Press "Print" for the chart and the request summary, or "Save file" to keep a backup.

Settings, files and limits are in [docs/config.md](docs/config.md). Details on the steps are in [docs/usage.md](docs/usage.md).

## Measurements

`npm run bench` runs two sets of random classes with fixed seeds, then one fixed case. The two sets are in the table.

- **Random classes.** 40 classes of 40 pupils in a 6 by 8 room, each with 12 to 31 random requests of the three kinds. Matching alone finds every impossible case here, because random fixed seats and front rows clash with each other long before keep-apart pairs matter.
- **Keep-apart pairs.** 80 classes in which 8 pupils must sit in the 8 front seats, with 14 to 26 random keep-apart pairs among them. Fixed seats and front rows alone can always hold, so every conflict here comes from the SAT solver.

| Set              | Outcome                       | Cases | Median        | Slowest         |
| ---------------- | ----------------------------- | ----- | ------------- | --------------- |
| Random classes   | Solved                        | 19    | 8 to 16 ms    | 17 to 44 ms     |
| Random classes   | Impossible, minimal set found | 21    | 8 to 22 ms    | 20 to 45 ms     |
| Random classes   | Repair previews for those     | 21    | 20 to 43 ms   | 26 to 71 ms     |
| Keep-apart pairs | Solved                        | 29    | 3 to 5 ms     | 10 to 22 ms     |
| Keep-apart pairs | Impossible, minimal set found | 51    | 18 to 32 ms   | 327 to 382 ms   |
| Keep-apart pairs | Repair previews for those     | 51    | 262 to 492 ms | 1234 to 2133 ms |

Each cell is the range over five runs of `npm run bench`, on an AMD Ryzen 5 7500F with Node 24.21, one thread, in the command line without the browser. The machine was busy with other jobs during these runs, so the runs differ. The case sets are the same each time. The bench allows planning 20 seconds and repair previews no limit, while the page shares 8 seconds. The slowest case here took 2.1 seconds. These are random classes, and a real class with many pairs to keep apart can be harder.

The bench ends with one fixed case, nine pupils who all want the eight front seats. Matching settles it in 2 to 5 ms.

The tests compare the solver with an exhaustive search on small rooms. They also check that every reported conflict is minimal and that every repaired plan passes the independent checker.

## Limits

- A request set of many mutual keep-apart pairs in a tight room can be too hard for the 8 second limit. The page then says "inconclusive" and doesn't claim the rules are impossible. Nine pupils who must all be kept apart in a 4 by 4 room is one such case.
- Keep apart means orthogonal neighbours. Diagonal seats are allowed. Sit together needs the same kind of neighbour, so a diagonal seat doesn't count.
- The repair preview tries one request at a time. It doesn't search for the repair that changes the fewest seats.
- Only four kinds of request exist. There's no gender balance, no group seating and no rotation. Sitting together means next to each other, not in the same group.

## Design principles

- A failed check is reported as a failed check. Running out of time is never reported as impossible.
- Code that doesn't share the solver's encoding checks every plan. In the tests, every conflict is compared with an exhaustive search.
- A plan the teacher arranged is replaced only by a choice. After an edit to the class or the requests, a plan that breaks a request is planned again, and Undo brings it back.
- Names stay on the device. The example classes are fictional.

## Development

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` and `npm run test:e2e` are the checks that CI runs. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md).

MIT licence.

Assisted by Claude/Codex.
