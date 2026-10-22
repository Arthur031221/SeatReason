import type en from "./en.ts";

const de: Record<keyof typeof en, string> = {
  "app.tagline": "Sitzpläne, die sich selbst erklären",
  "app.privacy":
    "Die Namen bleiben in diesem Browser. Nichts wird hochgeladen.",
  "app.source": "Quellcode",

  "header.examples": "Beispielklasse",
  "header.exampleSqueeze": "Enge erste Reihe",
  "header.exampleCrowded": "Überfüllte erste Reihe",
  "header.exampleReady": "Klappt auf Anhieb",
  "header.undo": "Rückgängig",
  "header.redo": "Wiederholen",
  "header.save": "Datei speichern",
  "header.open": "Datei öffnen",
  "header.print": "Drucken",
  "header.language": "Sprache",
  "header.theme": "Darstellung",
  "theme.auto": "Automatisch",
  "theme.light": "Hell",
  "theme.dark": "Dunkel",
  "header.openFailed": "Diese Datei ist kein SeatReason-Plan ({reason}).",

  "status.working": "Wünsche werden geprüft",
  "status.cancel": "Abbrechen",
  "status.cancelled":
    "Die Prüfung wurde abgebrochen. Es wurde nichts entschieden.",
  "status.retry": "Erneut prüfen",
  "status.empty": "Fügen Sie zuerst Schülerinnen und Schüler hinzu.",
  "status.ok": "Der Plan kann alle Wünsche erfüllen ({count} eingeschaltet).",
  "status.okNone": "Noch keine Wünsche. Jede Sitzordnung passt.",
  "status.capacity":
    "Es gibt nicht genug Plätze. Schüler: {pupils}. Plätze: {seats}.",
  "status.conflict":
    "Diese {count} Wünsche lassen sich nicht zugleich erfüllen",
  "status.conflictMinimal":
    "Streichen Sie einen beliebigen davon, und die übrigen lassen sich gemeinsam erfüllen. Die anderen Wünsche in Ihrer Liste gehörten nicht zum Problem.",
  "status.conflictUnproven":
    "Die Suche endete, bevor geprüft werden konnte, ob eine kleinere Gruppe genügt. Manche dieser Wünsche sind daher vielleicht gar nicht nötig.",
  "status.inconclusive":
    "Die Prüfung wurde nach {seconds} Sekunden ohne Ergebnis beendet. Das heißt nicht, dass die Wünsche unmöglich sind.",
  "status.error": "Die Klasse kann nicht geprüft werden: {reason}",

  "repair.title": "Auf welchen Wunsch würden Sie verzichten?",
  "repair.worksFresh": "Die übrigen lassen sich erfüllen.",
  "repair.works":
    "Die übrigen lassen sich erfüllen. Geänderte Plätze: {count}.",
  "repair.worksSame":
    "Die übrigen lassen sich erfüllen, ohne den Plan zu ändern.",
  "repair.stillBlocked": "Es bleibt ein weiterer Konflikt.",
  "repair.unknown": "Nicht rechtzeitig entscheidbar.",
  "repair.preview": "Diesen Plan ansehen",
  "repair.previewing": "Plan ohne diesen Wunsch: {request}",
  "repair.use": "Diesen Plan nehmen und den Wunsch ausschalten",
  "repair.back": "Zurück zu meinem Plan",
  "repair.changed": "Geänderte Plätze sind umrandet.",
  "repair.remaining": "Weiterhin im Konflikt: {requests}",

  "class.title": "Ihre Klasse",
  "class.name": "Name der Klasse",
  "class.roster": "Schüler, ein Name pro Zeile",
  "class.rosterHint":
    "Fügen Sie eine Liste oder eine CSV-Spalte ein. Gleiche Namen sind kein Problem.",
  "class.update": "Klasse aktualisieren",
  "class.count": "Schüler: {count}",
  "class.truncated": "Es wurden nur die ersten {max} Namen verwendet.",
  "class.rows": "Reihen",
  "class.cols": "Plätze pro Reihe",
  "class.room": "Raum",
  "class.editRoom": "Fehlende Tische markieren",
  "class.editRoomDone": "Markieren beenden",
  "class.editRoomHint":
    "Klicken Sie auf einen Platz, um ihn aus dem Raum zu nehmen oder wieder einzusetzen.",

  "rules.title": "Ihre Wünsche",
  "rules.empty":
    "Noch keine Wünsche. Fügen Sie unten einen hinzu, die Prüfung läuft von selbst.",
  "rules.kind": "Art des Wunsches",
  "rules.kindPin": "Fester Platz",
  "rules.kindFront": "Weit vorn",
  "rules.kindApart": "Auseinandersetzen",
  "rules.pupil": "Schüler",
  "rules.other": "Anderer Schüler",
  "rules.row": "Reihe",
  "rules.seat": "Platz",
  "rules.frontRows": "Anzahl erlaubter vorderer Reihen",
  "rules.add": "Wunsch hinzufügen",
  "rules.remove": "Wunsch entfernen",
  "rules.enabled": "Der Wunsch ist eingeschaltet",
  "rules.inConflict": "Im Konflikt",
  "rules.pin": "{name} sitzt in Reihe {row}, Platz {col}",
  "rules.front1": "{name} sitzt in der ersten Reihe",
  "rules.frontN": "{name} sitzt in den ersten {rows} Reihen",
  "rules.apart": "{a} und {b} sitzen nicht nebeneinander",
  "rules.apartNote": "Nebeneinander heißt links, rechts, davor oder dahinter.",
  "rules.blockedSeat": "Dieser Platz gehört nicht zum Raum.",
  "rules.needPupils": "Fügen Sie zuerst Schüler hinzu.",

  "plan.title": "Der Plan",
  "plan.front": "Vorderseite des Raums",
  "plan.empty": "Freier Platz",
  "plan.blocked": "Hier steht kein Tisch",
  "plan.make": "Plan erstellen",
  "plan.shuffle": "Neu mischen",
  "plan.clear": "Plan löschen",
  "plan.unseated": "Noch ohne Platz",
  "plan.unseat": "{name} aus dem Plan nehmen",
  "plan.pin": "{name} auf diesem Platz festlegen",
  "plan.stateFocus": "in einem Konflikt",
  "plan.stateChanged": "wechselt in diesem Plan den Platz",
  "plan.stateBroken": "verletzt einen Wunsch",
  "plan.dragHint":
    "Ziehen Sie einen Namen auf einen Platz, oder klicken Sie erst einen Namen und dann einen Platz an, um zu tauschen.",
  "plan.selected": "{name} ausgewählt. Wählen Sie einen Platz.",
  "plan.valid": "Dieser Plan erfüllt alle Wünsche.",
  "plan.violations": "Dieser Plan verletzt einige Wünsche:",
  "plan.seatLabel": "Reihe {row}, Platz {col}",
  "plan.seatLabelFilled": "Reihe {row}, Platz {col}: {name}",
  "plan.pinned": "Fester Platz",

  "print.title": "Sitzplan",
  "print.requests": "Wünsche",
  "print.kept": "erfüllt",
  "print.broken": "nicht erfüllt",
  "print.off": "ausgeschaltet",
  "print.list": "Schüler nach Namen",
  "print.checked":
    "Im Browser mit einem Solver geprüft. Kein Name hat dieses Gerät verlassen.",
};

export default de;
