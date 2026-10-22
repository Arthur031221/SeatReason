# Changelog

## 0.5.0

- New request "Near the back": a pupil who must sit in the last N rows, with the same minimal conflict and repair previews as the other kinds
- A pupil asked for the front row and the back row is named as a clash of exactly those two requests
- Project files from 0.4.0 open unchanged

## 0.4.0

- The app opens without a network after the first visit, and can be installed from the browser
- Web app manifest with icons
- A test that reloads the page offline and still plans
- Project files from 0.3.0 open unchanged

## 0.3.0

- New request "Sit together": two pupils who must sit next to each other, with the same minimal conflict and repair previews as the other kinds
- A pair asked to sit together and apart is named as a clash of exactly those two requests
- The "Class 3C" example includes a sit-together request
- Project files from 0.2.0 open unchanged

## 0.2.0

- Room size boxes apply on Enter or blur, so clearing a box to type a new number no longer shrinks the room and drops fixed seats on the way
- A corrected typo in a name keeps the pupil, the seat and the requests
- "Fix in this seat" button for the selected pupil
- Seats are announced as fixed, in a conflict, moved or breaking a request
- Only the one-line verdict is a live region, and unseated names report their pressed state
- On a phone the plan and the verdict come first
- Panel titles lose their numbers, in all nine languages

## 0.1.0

First release.

- Roster paste, room with missing desks, three kinds of request
- Own SAT solver with a minimal conflict set, claimed only after a complete pass
- Repair previews that check the whole remaining set
- Drag adjustments with validation, undo and redo
- Autosave, JSON file export and import, printable chart
- Nine languages, light and dark themes
