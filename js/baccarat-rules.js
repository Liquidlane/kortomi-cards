// Baccarat (Punto Banco): reine Regeln ohne DOM, damit sie sich auch in Node prüfen lassen.

// Kartenwert: Ass = 1, 2–9 = Augenzahl, 10/Bube/Dame/König = 0.
export const cardValue = c => (c.rank >= 10 ? 0 : c.rank);

// Punktzahl einer Hand: Summe, davon zählt nur die letzte Ziffer (7 + 8 = 15 → 5).
export const handTotal = cards => cards.reduce((s, c) => s + cardValue(c), 0) % 10;

// Natural: 8 oder 9 mit den ersten zwei Karten. Dann zieht niemand mehr.
export const isNatural = cards => cards.length === 2 && handTotal(cards) >= 8;

// Spieler: zieht bei 0–5, steht bei 6–7 (8–9 ist ein Natural und wird vorher abgefangen).
export const playerDraws = total => total <= 5;

/**
 * Zieht die Bank eine dritte Karte?
 *
 * @param {number} bankTotal    Punkte der Bank nach zwei Karten (0–7; bei 8/9 Natural wird nie gefragt).
 * @param {number|null} p3      Wert (0–9) der dritten Spielerkarte, oder null, wenn der Spieler stehen blieb.
 * @returns {boolean}
 *
 * Regeln (Punto Banco, fest, keine Entscheidung):
 *   Spieler stand (p3 = null):  Bank zieht bei 0–5, steht bei 6–7.
 *   Spieler zog p3:
 *     Bank 0–2  → zieht immer
 *     Bank 3    → zieht, außer p3 = 8
 *     Bank 4    → zieht bei p3 = 2–7
 *     Bank 5    → zieht bei p3 = 4–7
 *     Bank 6    → zieht bei p3 = 6–7
 *     Bank 7    → steht
 *
 * Prüffälle (siehe Kommentar, getestet mit einem Node-Skript):
 *   bankerDraws(5, null) === true    bankerDraws(6, null) === false
 *   bankerDraws(2, 9)    === true    bankerDraws(3, 8)    === false   bankerDraws(3, 9) === true
 *   bankerDraws(4, 1)    === false   bankerDraws(4, 2)    === true    bankerDraws(4, 8) === false
 *   bankerDraws(5, 3)    === false   bankerDraws(5, 4)    === true    bankerDraws(5, 7) === true
 *   bankerDraws(6, 5)    === false   bankerDraws(6, 6)    === true    bankerDraws(6, 8) === false
 *   bankerDraws(7, 6)    === false   bankerDraws(0, 0)    === true
 */
export function bankerDraws(bankTotal, p3) {
  if (p3 == null) return bankTotal <= 5;
  switch (bankTotal) {
    case 0: case 1: case 2: return true;
    case 3: return p3 !== 8;
    case 4: return p3 >= 2 && p3 <= 7;
    case 5: return p3 >= 4 && p3 <= 7;
    case 6: return p3 === 6 || p3 === 7;
    default: return false;
  }
}

/**
 * Eine komplette Runde aus einem Schuh ausspielen. `draw()` liefert die nächste Karte.
 * Reihenfolge wie am Tisch: Spieler, Bank, Spieler, Bank, dann ggf. dritte Karten.
 * Ergebnis: { player, bank, pt, bt, winner: 'P'|'B'|'T', natural, steps } —
 * `steps` ist die Reihenfolge der Karten als ['P'|'B', karte], für die Animation.
 */
export function playRound(draw) {
  const player = [], bank = [], steps = [];
  const give = (side, hand) => { const c = draw(); hand.push(c); steps.push([side, c]); return c; };
  give('P', player); give('B', bank); give('P', player); give('B', bank);
  const natural = isNatural(player) || isNatural(bank);
  if (!natural) {
    let p3 = null;
    if (playerDraws(handTotal(player))) p3 = cardValue(give('P', player));
    if (bankerDraws(handTotal(bank), p3)) give('B', bank);
  }
  const pt = handTotal(player), bt = handTotal(bank);
  return { player, bank, pt, bt, winner: pt > bt ? 'P' : bt > pt ? 'B' : 'T', natural, steps };
}

// Auszahlung (Variante „ohne Kommission“): Gesamtrückgabe inklusive Einsatz.
//   Spieler 1:1 · Bank 1:1, aber Bank gewinnt mit 6 → 1:2 · Unentschieden 8:1 (Spieler/Bank-Einsätze zurück).
export function payout(bets, r) {
  let back = 0;
  if (r.winner === 'T') back += bets.T * 9 + bets.P + bets.B;
  else if (r.winner === 'P') back += bets.P * 2;
  else back += r.bt === 6 ? bets.B + Math.floor(bets.B / 2) : bets.B * 2;
  return back;
}
