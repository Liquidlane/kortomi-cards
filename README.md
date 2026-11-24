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

## Eigene Bilder

Siehe `assets/custom/LIESMICH.txt`: `kortomi.png` (plus optionale Stimmungen) und `kartenruecken.png` ersetzen die eingebauten Grafiken.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `js/art.js` | Alle SVG-Grafiken: Karten, Rücken, Chips, Kortomi, Medaillen, Icons |
| `js/blackjack.js` | Blackjack-Regeln, Basisstrategie, Ablauf |
| `js/solitaire.js` | Klondike mit Ziehen/Ablegen, Antippen, Zurück, Tipp, Auto-Fertig |
| `js/shop.js` | Upgrade-Shop: Katalog, Kaufen mit Chips, Filz/Kartenrücken, Tagesgeld |
| `js/hilo.js` | Höher oder Tiefer (im Shop freischaltbar) |
| `js/poker.js` | Video-Poker, Jacks or Better (im Shop freischaltbar) |
| `js/mascot.js` | Kortomis Stimmungen, Sprechblase, alle Sprüche |
| `js/audio.js` | Synthetische Soundeffekte (WebAudio) |
| `js/store.js` | Speicherstand, Statistik, Erfolge |
| `js/fx.js` | Konfetti, Fledermäuse, Parallax des Casino-Dioramas |
