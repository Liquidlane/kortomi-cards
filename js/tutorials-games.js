// Tutorial-Texte für die vorhandenen Spiele (Format siehe js/tutorial.js).
// Verdrahtet in js/app.js: Hilfe-Knopf in der Kopfzeile, beim ersten Betreten automatisch.
// Schlüssel = Bildschirmname in go() (blackjack, solitaire, hilo, poker).
export const GAME_TUTORIALS = {
  blackjack: [
    { t: 'Blackjack', d: 'Ziel: näher an die <b>21</b> als ich – aber nicht drüber. Bilder zählen 10, das Ass 1 oder 11. Klingt leicht. Ist es nicht. Hehe.', el: '#bj-dealer' },
    { t: 'Einsatz setzen', d: 'Tippe auf die Chips, um sie zu setzen. Jeder Tipp legt noch einen drauf. Gier ist erlaubt, ich nehm alles.', el: '#bj-rack' },
    { t: 'Der Einsatzkreis', d: 'Hier liegt dein Geld. Zu viel? Kreis antippen oder <b>Löschen</b>, dann kriegst du es zurück. Feigling.', el: '#bj-bet' },
    { t: 'Ziehen oder halten', d: '<b>Ziehen</b> gibt dir eine Karte, <b>Halten</b> beendet deine Hand. <b>Verdoppeln</b> heißt: doppelter Einsatz, genau eine Karte. Bei zwei gleichen kannst du <b>Teilen</b>.', el: '#bj-actions' },
    { t: 'Mein Tipp', d: 'Unsicher? Die Glühbirne verrät dir, was das Lehrbuch sagt. Ob du drauf hörst, ist dein Problem.', el: '#bj-hint' },
    { t: 'Auszahlung', d: 'Gewinn zahlt <b>1:1</b>, ein Blackjack <b>3:2</b>. Ich bleibe ab 17 stehen. Und wenn du pleite bist, gibt’s Mitleids-Chips. Ich bin ja kein Monster.' },
  ],
  solitaire: [
    { t: 'Solitaire', d: 'Klondike, ganz in Ruhe. Ziel: alle Karten nach Farbe sortiert <b>von Ass bis König</b> auf die vier Ablagen oben. Ich schau nur zu. Und urteile.', el: '#sol-table' },
    { t: 'Die Reihen', d: 'Unten baust du <b>abwärts</b> und <b>abwechselnd rot und schwarz</b>. Auf leere Plätze darf nur ein König. Karten ziehen oder einfach antippen – sie springen von selbst.', el: '#sol-table' },
    { t: 'Der Stapel', d: 'Kommst du nicht weiter, tippe oben links auf den Stapel und ziehe neue Karten. 1 oder 3 Karten stellst du in den Einstellungen ein.' },
    { t: 'Zurück & Tipp', d: '<b>Zurück</b> nimmt einen Zug zurück, <b>Tipp</b> zeigt dir einen möglichen Zug. Ich zähl trotzdem mit, wie oft du schummelst.', el: '#sol-hint' },
    { t: 'Chips verdienen', d: 'Jeder Sieg bringt <b>Chips</b>. Schnell, ohne Zurück oder mit 3 Karten gibt’s extra. Zeit, Züge und Punkte stehen oben.', el: '.sol-meta' },
  ],
  hilo: [
    { t: 'Höher oder Tiefer', d: 'Eine Karte liegt offen. Du rätst, ob die nächste <b>höher</b> oder <b>tiefer</b> ist. Ass ist niedrig, König hoch. Ich lache, wenn du falsch liegst.', el: '#hl-table' },
    { t: 'Einsatz wählen', d: 'Tippe einen Chip an – das ist dein Einsatz für die Runde. Dann <b>Los geht’s</b>.', el: '#hl-rack' },
    { t: 'Raten', d: 'Unter <b>Höher</b> und <b>Tiefer</b> steht der Multiplikator. Je unwahrscheinlicher, desto mehr zahlt es. Jeder Treffer multipliziert weiter.', el: '#hl-actions' },
    { t: 'Kassieren!', d: 'Mit <b>Kassieren</b> nimmst du deinen Gewinn mit. Einmal daneben, und alles ist weg. Gleiche Karte zählt nicht, dann einfach nochmal.' },
  ],
  poker: [
    { t: 'Video-Poker', d: 'Jacks or Better: Du bekommst fünf Karten und willst eine Pokerhand. Ab einem Paar <b>Buben</b> wird gezahlt.', el: '#vp-table' },
    { t: 'Gewinntabelle', d: 'Hier steht, was jede Hand zahlt – Einsatz mal Faktor. Royal Flush zahlt <b>250-fach</b>. Kommt nie. Fast nie.', el: '#vp-pay' },
    { t: 'Einsatz & Geben', d: 'Chip wählen, dann <b>Geben</b>. Fünf Karten liegen vor dir.', el: '#vp-rack' },
    { t: 'Halten & Ziehen', d: 'Tippe die Karten an, die du <b>behalten</b> willst. Mit <b>Ziehen</b> werden die anderen einmal ersetzt. Dann zählt, was liegt.', el: '#vp-actions' },
  ],
};
