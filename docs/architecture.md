# Architecture

```
React UI  ->  history reducer  ->  Project (room, pupils, rules, plan)
   |                                   |
   |   debounce 200 ms                 v
   +----------------------->  worker  ->  analyze.plan / repairOptions
                                              |        |
                                              v        v
                                      hall.ts (pins, front and back rows)
                                      encode.ts + sat.ts (keep apart, sit together)
```

## Planning

`plan(problem, limits)` in `src/core/analyze.ts` returns one of four results: `solved` with a plan, `capacity` when there are more pupils than seats, `conflict` with a list of request ids and a `minimal` flag, or `inconclusive` with the reason.

1. Fixed seats, front rows and back rows are a bipartite matching problem. `hall.ts` first checks them alone. If it finds a Hall violator, a set of requests that compete for fewer seats than they need, that set is the conflict.
2. Otherwise every enabled request goes to the SAT solver in `sat.ts`, which is the only place keep-apart and sit-together rules are handled. A sit-together rule says that wherever the first pupil sits, the second pupil takes one of the seats next to it. The encoding in `encode.ts` has one variable per seat for each pupil named in a request, exactly-one constraints per pupil, at-most-one per seat, and one selector literal per request that guards that request's clauses. Pupils no request names take the leftover seats.
3. When the solver is unsatisfiable under all selectors, the failed assumptions are a conflict set. Deletion then tries to remove each request from the set. A request is dropped if the rest are still unsatisfiable. `minimal` is true only when no solver call in this pass gave up.

The solver takes a conflict budget and a stop callback. Reaching either returns `unknown`, and that becomes `inconclusive`. It is never turned into an impossibility.

## Repairs

`repairOptions` shares what is left of the worker's one time limit with the first plan, so a slow plan leaves less time for previews. It plans afresh once per request in the conflict, with that request disabled and the current plan as the solver's preferred seats. The result is the whole rule set checked, so a preview cannot hide a second clash. The changed seats are computed against the current plan.

## Checking the checker

- `oracle.ts` enumerates every assignment for small rooms. Tests compare solved, impossible and minimal results with it.
- `validate.ts` checks a plan against the rules with plain loops and does not use the encoding. The app uses it to flag broken requests after a drag, and the tests use it on every repaired plan.

## Interface

`App.tsx` owns the history reducer from `useHistory`. The check key is the problem and the seed, so a change that does not alter the problem, such as moving a pupil, does not restart the search. `useSolver` terminates the worker on cancel and on a new request, so a late answer cannot arrive for a stale problem. Autosave writes the project to `localStorage` on every change.

## Tests

- `src/core/*.test.ts` run in Vitest.
- `tests/e2e/app.spec.ts` runs against `vite build` and `vite preview`, so the tests see the shipped bundle.
