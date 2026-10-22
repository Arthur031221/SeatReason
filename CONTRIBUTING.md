# Contributing

Run these before a pull request. They are the same checks as CI.

```sh
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run format` fixes formatting.

## Rules for changes

- A new kind of request needs an encoding, a validator branch, an oracle branch, strings in all nine locale files and a test that compares the solver with the oracle.
- A claim of impossibility must come from a complete search. Anything cut short is `inconclusive`.
- Use fictional names in examples and tests.
- Numbers in the README come from `npm run bench`. Update them with the method if the benchmark changes.

## Media

`npm run build` then `npm run record:demo` rewrites `assets/demo.gif` and needs ffmpeg. `npm run render:social-card` rewrites the social card.
