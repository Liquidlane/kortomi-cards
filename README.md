# Kortomi Cards

Blackjack und Klondike-Solitaire mit Kortomi, der frechen Croupière. Reine Web-App ohne Build-Schritt, läuft auf Handy, Tablet und Computer und lässt sich als App installieren.

## Lokal starten

```bash
node tools/devserver.mjs
```

Dann http://localhost:5173 öffnen.

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen und diesen Ordner hochladen (`git push`).
2. Im Repository unter **Settings → Pages** als Quelle „Deploy from a branch“, Branch `main`, Ordner `/ (root)` wählen.
3. Nach ein bis zwei Minuten läuft die App unter `https://<name>.github.io/<repo>/`.

Auf dem iPhone in Safari: Teilen → „Zum Home-Bildschirm“. Auf Android in Chrome: Menü → „App installieren“.

Nach Änderungen an Dateien in `sw.js` die `VERSION` erhöhen, damit installierte Apps das Update sicher bekommen.

## Spielstand zwischen Geräten (Cloud)

Im Hauptmenü unter **„Schon gespielt?“** gibt man einen 4-stelligen Code ein. Die App zeigt den Stand auf dem Gerät und den in der Cloud (Datum, Chips, Erfolge) und fragt, welcher übernommen wird.

Gespeichert wird kostenlos bei [Pantry](https://getpantry.cloud): dort einmal eine Pantry anlegen und die Pantry-ID in `js/cloud.js` bei `PANTRY_ID` eintragen. Jeder Code ist ein eigener „Basket“ (`kortomi-1234`). Wer die ID und einen Code kennt, kann den Stand lesen und überschreiben, für ein Kartenspiel reicht das.

## Eigene Bilder

Siehe `assets/custom/LIESMICH.txt`: `kortomi.png` (plus optionale Stimmungen) und `kartenruecken.png` ersetzen die eingebauten Grafiken.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `js/art.js` | Alle SVG-Grafiken: Karten, Rücken, Chips, Kortomi, Medaillen, Icons |
| `js/blackjack.js` | Blackjack-Regeln, Basisstrategie, Ablauf |
| `js/solitaire.js` | Klondike mit Ziehen/Ablegen, Antippen, Zurück, Tipp, Auto-Fertig |
| `js/shop.js` | Upgrade-Shop: Katalog, Kaufen mit Chips, Filz/Kartenrücken, Tagesgeld |
| `js/clerk.js` | Ladentheke im Shop: tagsüber Kortomi, nachts (20–6 Uhr) Choccypuddin; Chocs Figur |
| `js/lines-choc.js` | Sprüche für Choc als Croupier (im Shop für 4.000 Chips kaufbar) |
| `js/hilo.js` | Höher oder Tiefer (im Shop freischaltbar) |
| `js/poker.js` | Video-Poker, Jacks or Better (im Shop freischaltbar) |
| `js/mascot.js` | Kortomis Stimmungen, Sprechblase, alle Sprüche |
| `js/audio.js` | Synthetische Soundeffekte (WebAudio) |
| `js/store.js` | Speicherstand, Statistik, Erfolge |
| `js/cloud.js` | Cloud-Spielstand per 4-stelligem Code (Pantry) |
| `js/fx.js` | Konfetti, Fledermäuse, Parallax des Casino-Dioramas |
| `js/progress.js` | Tagesgeld-Serie, Tagesaufgabe (gleiches Solitaire-Blatt pro Datum), Zusatz-Erfolge, Statistik-Übersicht, Spielzeit und Chip-Bilanz |
