// Speicher (localStorage), Statistik und Erfolge.
const KEY = 'kortomi-cards-v1';
export const START_BALANCE = 1000;

const defaults = () => ({
  balance: START_BALANCE,
  pendingBet: 0,
  pendingHl: 0,
  pendingVp: 0,
  lastBet: 25,
  owned: {},
  look: { felt: 'velvet', back: 'kortomi', dealer: 'kortomi' },
  daily: '',
  sideBet: { hl: 25, vp: 25 },
  settings: { sound: true, volume: 0.7, voice: true, voicePitch: 1, draw3: false, tips: true, chatty: 2, motion: true, mascotSol: true },
  stats: {
    bj: { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, busts: 0, biggestWin: 0, peak: START_BALANCE, streak: 0, bestStreak: 0, dealerBusts: 0, gifts: 0 },
    sol: { played: 0, won: 0, bestTime: 0, bestScore: 0, streak: 0, bestStreak: 0, chips: 0 },
    hl: { rounds: 0, cashouts: 0, bestStreak: 0, biggestWin: 0 },
    vp: { hands: 0, wins: 0, biggestWin: 0, best: '' },
  },
  ach: {},
  solSave: null,
  updated: 0,
});

function merge(base, saved) {
  for (const k in saved) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object') merge(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}

export const replaceSave = saved => store.replace(saved);

export const store = (() => {
  let data = defaults();
  try { const raw = localStorage.getItem(KEY); if (raw) data = merge(defaults(), JSON.parse(raw)); } catch { }
  let t = null;
  return {
    get d() { return data; },
    save(now = false) {
      clearTimeout(t);
      data.updated = Date.now();
      const w = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { } };
      now ? w() : (t = setTimeout(w, 120));
    },
    reset() { data = defaults(); this.save(true); },
    // Kompletten Spielstand ersetzen (Cloud), Zeitstempel bleibt erhalten
    replace(saved) { clearTimeout(t); data = merge(defaults(), saved); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { } },
  };
})();

// ---------- Erfolge ----------
export const ACHIEVEMENTS = [
  { id: 'bj_first', t: 'Platz genommen', d: 'Spiele deine erste Runde Blackjack.', m: 'lilac', g: '♠' },
  { id: 'bj_natural', t: 'Naturtalent', d: 'Bekomme einen Blackjack.', m: 'gold', g: '21' },
  { id: 'bj_streak5', t: 'Glückssträhne', d: 'Gewinne 5 Hände in Folge.', m: 'pink', g: '5' },
  { id: 'bj_double', t: 'Doppelt hält besser', d: 'Gewinne eine verdoppelte Hand.', m: 'lilac', g: '×2' },
  { id: 'bj_split', t: 'Geteiltes Glück', d: 'Gewinne beide Hände nach einem Split.', m: 'pink', g: '⑂' },
  { id: 'bj_charlie', t: 'Kartensammlerin', d: 'Gewinne mit 5 oder mehr Karten.', m: 'lilac', g: '✋' },
  { id: 'bj_insured', t: 'Gut versichert', d: 'Kassiere eine Versicherung.', m: 'lilac', g: '☂' },
  { id: 'bj_highroller', t: 'High Roller', d: 'Setze 1.000 oder mehr auf eine Hand.', m: 'gold', g: '$' },
  { id: 'bj_rich', t: 'Kortomis Albtraum', d: 'Erreiche ein Guthaben von 10.000.', m: 'gold', g: '♛' },
  { id: 'bj_broke', t: 'Pleite, aber stilvoll', d: 'Verliere dein ganzes Guthaben.', m: 'pink', g: '0' },
  { id: 'bj_dealerbust', t: 'Dealer-Schreck', d: 'Kortomi überkauft sich 25 Mal.', m: 'pink', g: '☠' },
  { id: 'sol_first', t: 'Ordnung muss sein', d: 'Gewinne eine Partie Solitaire.', m: 'lilac', g: '♥' },
  { id: 'sol_fast', t: 'Speedrun', d: 'Gewinne Solitaire in unter 3 Minuten.', m: 'gold', g: '⚡' },
  { id: 'sol_draw3', t: 'Dreifaltig', d: 'Gewinne Solitaire mit 3 Karten ziehen.', m: 'pink', g: '3' },
  { id: 'sol_noundo', t: 'Ohne Netz', d: 'Gewinne Solitaire ohne „Zurück“.', m: 'gold', g: '✦' },
  { id: 'sol_streak3', t: 'Hattrick', d: 'Gewinne 3 Partien Solitaire in Folge.', m: 'pink', g: '3×' },
  { id: 'sol_ten', t: 'Kartenhai', d: 'Gewinne 10 Partien Solitaire.', m: 'gold', g: '10' },
  { id: 'hl_streak5', t: 'Hellseherin', d: 'Rate bei „Höher oder Tiefer“ 5 Mal in Folge richtig.', m: 'lilac', g: '↕' },
  { id: 'hl_x10', t: 'Alles auf eine Karte', d: 'Kassiere bei „Höher oder Tiefer“ das Zehnfache.', m: 'gold', g: '×10' },
  { id: 'vp_quads', t: 'Viermal Glück', d: 'Bekomme einen Vierling im Video-Poker.', m: 'pink', g: '4' },
  { id: 'vp_royal', t: 'Königlich', d: 'Bekomme einen Royal Flush im Video-Poker.', m: 'gold', g: '♚' },
  { id: 'shop_first', t: 'Shopping-Tour', d: 'Kauf etwas im Upgrade-Shop.', m: 'pink', g: '✿' },
  { id: 'shop_all', t: 'Ausverkauft', d: 'Kauf alles, was der Shop hergibt.', m: 'gold', g: '∞' },
  { id: 'night_owl', t: 'Nachteule', d: 'Spiele zwischen Mitternacht und 4 Uhr.', m: 'lilac', g: '☾' },
];

let onUnlock = () => { };
export function setUnlockHandler(fn) { onUnlock = fn; }
export function unlock(id) {
  if (store.d.ach[id]) return false;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return false;
  store.d.ach[id] = Date.now();
  store.save();
  onUnlock(a);
  return true;
}
export function checkNightOwl() { const h = new Date().getHours(); if (h >= 0 && h < 4) unlock('night_owl'); }
export const achCount = () => Object.keys(store.d.ach).length;

// ---------- Upgrade-Shop: Besitz ----------
export const owns = id => !!store.d.owned[id];
export const chipValues = () => (owns('perk_chip1000') ? [5, 25, 100, 500, 1000] : [5, 25, 100, 500]);
