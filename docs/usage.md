# Usage

## The class

Paste names into "Pupils, one name per line" and press "Update class". For a CSV, the first column is read as the names and a header such as "name" is skipped. Blank lines are dropped and names are trimmed. Two pupils with the same name get separate internal ids, so rules on one do not touch the other. Pressing "Update class" with a changed name makes a new pupil, and that pupil has no seat yet, and the requests that named the old name are removed.

At most 40 pupils are used. If the list is longer, the page says that only the first 40 were used.

Set "Rows" and "Seats per row" for the room. A room has at most 12 rows, 12 seats per row and 48 seat positions. "Mark missing desks" lets you click a seat to remove it from the room, for a pillar or a door. A pupil sitting in a removed seat becomes unseated. Shrinking the room also removes fixed-seat requests whose seat no longer exists, and "Undo" brings them back.

## The requests

| Kind           | Meaning                                                             |
| -------------- | ------------------------------------------------------------------- |
| Fixed seat     | The pupil sits in the given row and seat                            |
| Near the front | The pupil sits in the first N rows                                  |
| Keep apart     | Two pupils do not sit left, right, in front of or behind each other |

Each request has a switch. A switched-off request stays in the list and is ignored by the check. Removing it deletes it.

## The verdict

The check starts about 200 ms after the last change and runs in a worker. The panel shows one of these:

- **Checking your requests.** The time spent so far and a Cancel button. Cancelling decides nothing.
- **This plan follows every request.** The seats shown are valid.
- **These N requests cannot all hold.** A minimal set. Take away any one of them and the rest work together. Requests that are not listed were not part of the clash. If the search stopped before it could finish minimising, the page says that some listed requests may not be needed.
- **There are not enough desks.** Not a clash of requests. Add seats or remove pupils.
- **The check stopped after 8 seconds without an answer.** Nothing is claimed. "Check again" runs it once more.

A plan is built only when the current seats are incomplete or break a request. A valid plan you arranged by hand is never replaced. After you change the class or the requests, a plan that breaks a request is planned again, and "Undo" brings the earlier one back. A move by hand does not start a new plan by itself.

## Repairs

Under each request of a conflict whose removal lets the rest hold, "Show this plan" previews the class with that request off. The remaining requests are all checked together. Seats that move are outlined. The preview changes nothing. "Use this plan and turn the request off" replaces the plan and switches that request off. "Undo" brings the previous state back.

"Shuffle" asks for a different valid arrangement.

## Adjusting by hand

Drag a pupil onto another seat to swap, or click one pupil and then a seat. A move that breaks a request is allowed. The page lists the broken requests and which seats are involved, and Undo reverses the move.

## Keeping the work

The class is saved in the browser as you work. "Save file" writes `<class name>.seatreason.json` and "Open file" reads it back. A file that is not a SeatReason plan is refused with a reason. "Print" produces the seating chart and a summary of the requests. The page chrome is hidden in print.
