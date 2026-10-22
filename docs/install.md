# Install

SeatReason is a static site. You build it once and serve the `dist/` folder.

## Requirements

- Node.js 22.12 or newer (CI runs 22 and 24)
- npm
- A current Chrome, Edge, Firefox or Safari with Web Worker support

## Run it

```sh
git clone https://github.com/Arthur031221/SeatReason
cd SeatReason
npm ci
npm start
```

`npm start` builds the app and starts `vite preview`, which serves it at `http://127.0.0.1:4173/`.

## Offline use and install

The build writes `dist/sw.js`, a service worker that caches the page, its scripts and its icons on the first visit. After that the app opens with no network, and the browser can offer to install it. Page loads still go to the network first, so a new version arrives on the next online visit. The worker is registered only in a production build, never under `npm run dev`. To remove the cached copy, clear site data in the browser.

## Host it

```sh
npm ci
npm run build
```

Copy `dist/` to any static host. The build uses relative paths, so a sub-folder such as `https://example.org/seating/` works. The app makes no network request after the page loads, so it also works from a USB stick behind a local web server. Opening `index.html` straight from the file system does not work because browsers block module scripts and workers on `file:` pages.

## Develop

```sh
npm run dev
```

If `npm run dev` stops with `ENOSPC`, the system limit on file watchers is too low. Use `npm start` instead, or raise `fs.inotify.max_user_watches`.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```
