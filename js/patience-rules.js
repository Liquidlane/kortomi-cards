// Reine Spielregeln für Spider und FreeCell (ohne DOM, daher auch in Node testbar).
// Karten haben die Form von cards.js: { uid, rank (1–13), suit ('S'|'H'|'D'|'C'), face, up }.

const RED = { H: true, D: true };
export const isRed = c => !!RED[c.suit];
const last = a => a[a.length - 1];

// ---------- Spider ----------
// 104 Karten. 1 Farbe: 8× Pik, 2 Farben: 4× Pik + 4× Herz, 4 Farben: 2× jede Farbe.
const SPIDER_SUITS = { 1: ['S'], 2: ['S', 'H'], 4: ['S', 'H', 'D', 'C'] };
export function spiderDeck(suits = 1) {
  const list = SPIDER_SUITS[suits] || SPIDER_SUITS[1];
  const copies = 8 / list.length;
  const out = []; let uid = 0;
  for (let d = 0; d < copies; d++) for (const s of list) for (let r = 1; r <= 13; r++) out.push({ uid: `${r}${s}-${d}-${uid++}`, rank: r, suit: s, face: `${r}${s}`, up: false });
  return out;
}

// Ab idx bis zum Ende: alles offen, gleiche Farbe, lückenlos absteigend → zusammen beweglich.
export function spRunFrom(col, idx) {
  if (idx < 0 || idx >= col.length || !col[idx].up) return false;
  for (let k = idx; k < col.length - 1; k++) {
    const a = col[k], b = col[k + 1];
    if (!b.up || b.suit !== a.suit || b.rank !== a.rank - 1) return false;
  }
  return true;
}
// Jede Karte darf auf eine um eins höhere (egal welche Farbe) oder auf einen leeren Platz.
export const spCanDrop = (card, col) => !col.length || (last(col).up && last(col).rank === card.rank + 1);
// Vollständige Folge König bis Ass gleicher Farbe am Ende der Spalte? Liefert den Startindex oder -1.
export function spCompleteRun(col) {
  const i = col.length - 13;
  if (i < 0 || col[i].rank !== 13) return -1;
  return spRunFrom(col, i) ? i : -1;
}
// Neue Reihe austeilen geht nur, wenn noch Karten im Stapel sind und keine Spalte leer ist.
export const spCanDeal = (tab, stock) => stock.length > 0 && tab.every(col => col.length > 0);

// ---------- FreeCell ----------
export const fcCanTab = (card, col) => !col.length || (isRed(last(col)) !== isRed(card) && last(col).rank === card.rank + 1);
export const fcCanFound = (card, pile) => (pile.length ? last(pile).suit === card.suit && last(pile).rank === card.rank - 1 : card.rank === 1);
// Abwechselnde Farben, lückenlos absteigend
export function fcIsSeq(cards) {
  for (let k = 0; k < cards.length - 1; k++) if (isRed(cards[k]) === isRed(cards[k + 1]) || cards[k + 1].rank !== cards[k].rank - 1) return false;
  return true;
}
// Supermove: (freie Zellen + 1) × 2^(leere Spalten). Ist das Ziel selbst leer, zählt es nicht mit.
export const fcMaxMove = (freeCells, emptyCols, toEmpty = false) => (freeCells + 1) * 2 ** Math.max(0, emptyCols - (toEmpty ? 1 : 0));
// Sicher automatisch ablegen: Ass/Zwei immer, sonst wenn beide andersfarbigen Ablagen schon bei Rang-1 sind.
export function fcSafe(card, found) {
  if (card.rank <= 2) return true;
  const rankOf = s => { const p = found.find(f => f.length && f[0].suit === s); return p ? p.length : 0; };
  const opp = isRed(card) ? ['S', 'C'] : ['H', 'D'];
  return opp.every(s => rankOf(s) >= card.rank - 1);
}
// Microsoft-Spielnummern (1–32000): klassischer Zufallsgenerator, gleiche Nummer = gleiches Spiel.
// Ergebnis: 52 { rank, suit } in Austeil-Reihenfolge (Position i → Spalte i % 8).
export function msDeal(n) {
  let seed = n >>> 0;
  const rnd = () => { seed = (seed * 214013 + 2531011) & 0x7fffffff; return seed >> 16; };
  const SUITS = ['C', 'D', 'H', 'S'];
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const out = [];
  for (let i = 0; i < 52; i++) {
    const left = 52 - i;
    const j = rnd() % left;
    const c = deck[j];
    deck[j] = deck[left - 1];
    out.push({ rank: (c >> 2) + 1, suit: SUITS[c & 3] });
  }
  return out;
}
