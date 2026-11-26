// Fortschritt & Motivation: Tagesgeld-Serie, Tagesaufgabe (gleiches Solitaire für alle),
// zusätzliche Erfolge mit Fortschrittsanzeige, Übersicht in der Statistik, Spielzeit und Chip-Bilanz.
// Daten liegen in store.d.prog (siehe defaults() in store.js).
import { store, owns, unlock, ACHIEVEMENTS } from './store.js';
import { newDeck } from './cards.js';
import { solveKlondike } from './klondike-solver.js';
import { medalSVG } from './art.js';
import { sfx } from './audio.js';
import { fmt, updateBalance, toast } from './ui.js';
import { say, pick, LINES } from './mascot.js';
import { CHOC } from './lines-choc.js';

// ---------- Datum (lokale Zeit, JJJJ-MM-TT) ----------
const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Tagesnummer über UTC, damit Sommer-/Winterzeit keine halben Tage erzeugt
const dayNum = k => { const [y, m, d] = String(k).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

// ---------- Tagesgeld-Serie ----------
// Tag 1 = Grundbetrag, jeder weitere Tag in Folge +1/6 davon, ab Tag 7 gedeckelt (300 → 600).
export const STREAK_CAP = 7;
export const streakBonus = (base, n) => base + (Math.min(Math.max(n, 1), STREAK_CAP) - 1) * Math.round(base / 6);
const P = () => store.d.prog;

// Welcher Serientag wäre heute? (letzter Abholtag steht in store.d.daily)
export function nextStreak(today = dayKey(), last = store.d.daily, cur = P().streak) {
  if (!last) return 1;
  const gap = daysBetween(last, today);
  const n = cur || 1; // alte Spielstände ohne Zähler: als Tag 1 werten
  if (gap <= 0) return n;
  return gap === 1 ? n + 1 : 1;
}
// Aktuell laufende Serie (verfällt, wenn gestern nicht abgeholt wurde)
export function liveStreak(today = dayKey()) {
  const last = store.d.daily;
  if (!last || daysBetween(last, today) > 1) return 0;
  return P().streak || 1;
}
// Von claimDaily() aufgerufen, BEVOR store.d.daily auf heute springt
export function claimStreak(today = dayKey()) {
  const p = P(), before = liveStreak(today);
  const n = nextStreak(today);
  p.lostStreak = before === 0 && (p.streak || 0) > 1 ? p.streak : 0;
  p.streak = n;
  p.bestStreak = Math.max(p.bestStreak || 0, n);
  if (n >= 3) unlock('daily_3');
  if (n >= 7) unlock('daily_7');
  return n;
}

// 7-Tage-Leiste + Kommentar nach dem Abholen
export function showStreakCard({ amount, streak }, base) {
  const p = P();
  const week = Math.min(streak, STREAK_CAP);
  const days = Array.from({ length: STREAK_CAP }, (_, i) => {
    const d = i + 1, cls = d < week ? 'done' : d === week ? 'now' : '';
    return `<li class="${cls}"><span>Tag ${d}</span><b>+${fmt(streakBonus(base, d))}</b></li>`;
  }).join('');
  const sub = streak >= STREAK_CAP ? `Tag ${streak} in Folge, Maximalbonus!` : `Tag ${streak} in Folge. Morgen gibt’s +${fmt(streakBonus(base, streak + 1))}.`;
  const el = document.createElement('div');
  el.className = 'prog-pop';
  el.innerHTML = `<div class="prog-card" role="dialog" aria-label="Tagesgeld">
    <h3>+${fmt(amount)} Chips</h3><p>${sub}</p>
    <ol class="streak-strip">${days}</ol>
    ${p.lostStreak ? `<p class="lost">Deine ${p.lostStreak}-Tage-Serie ist gerissen. Selber schuld.</p>` : ''}
    <button class="btn primary">Danke, Kortomi</button></div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('button')) { sfx.tap(); close(); } });
  document.body.appendChild(el);
  setTimeout(() => el.isConnected && close(), 9000);
  const key = p.lostStreak ? 'streakLost' : streak >= STREAK_CAP ? 'streakMax' : streak > 1 ? 'streakUp' : 'dailyGift';
  setTimeout(() => say('lobby', pick(key, { n: streak }), { mood: streak >= STREAK_CAP ? 'love' : 'wink', priority: 3 }), 400);
}

// ---------- Tagesaufgabe: geseedetes Klondike ----------
// cyrb53-Hash über den Datumstext, dann mulberry32 – überall gleich, unabhängig vom Gerät
function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seededDeck(seed) {
  const rng = mulberry32(hash(seed));
  const a = newDeck(1);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Nur nachweislich lösbare Blätter: Ist die Mischung des Tages unlösbar (oder zu knifflig für den Löser),
// wird deterministisch neu gemischt („#1“, „#2“ …). Alle bekommen also weiterhin dasselbe Blatt.
const chalOrder = new Map();
export function challengeDeck(date) {
  if (!chalOrder.has(date)) {
    let found = null;
    for (let n = 0; n < 40 && !found; n++) {
      const d = seededDeck(`kortomi-tagesaufgabe-${date}${n ? '#' + n : ''}`);
      if (solveKlondike(d, 50000) === true) found = d;
    }
    chalOrder.set(date, (found || seededDeck(`kortomi-tagesaufgabe-${date}`)).map(c => c.face));
  }
  const byFace = new Map(newDeck(1).map(c => [c.face, c]));
  return chalOrder.get(date).map(f => byFace.get(f));
}

export const CHAL_REWARD = 250;
const CHAL_VER = 2; // 2 = Blätter mit Lösbarkeitsprüfung; ältere Zwischenstände passen nicht mehr
const chalSolvedToday = () => P().chal.last === dayKey();
export function liveChalStreak(today = dayKey()) {
  const c = P().chal;
  return c.last && daysBetween(c.last, today) <= 1 ? c.streak : 0;
}

let queued = null;
export function queueChallenge() { queued = makeChallenge(dayKey()); }
export function takeChallenge() { const c = queued; queued = null; return c; }

function makeChallenge(date) {
  return {
    date,
    talk: 'chalEnter',
    deck: () => challengeDeck(date),
    saved: () => (P().chalSave?.date === date && P().chalSave.v === CHAL_VER ? P().chalSave : null),
    save: sv => { P().chalSave = sv ? { ...sv, date, v: CHAL_VER } : null; store.save(); },
    onWin: ({ time }) => {
      const c = P().chal, first = c.last !== date;
      if (first) {
        c.streak = c.last && daysBetween(c.last, date) === 1 ? c.streak + 1 : 1;
        c.bestStreak = Math.max(c.bestStreak, c.streak);
        c.last = date; c.solved++; c.dayTime = time;
      } else c.dayTime = Math.min(c.dayTime || time, time);
      if (!c.bestTime || time < c.bestTime) c.bestTime = time;
      const reward = [];
      if (first) {
        reward.push(['Tagesaufgabe', CHAL_REWARD]);
        if (c.streak > 1) reward.push([`Serie ${c.streak}`, Math.min(c.streak, 7) * 25]);
      }
      const chips = reward.reduce((s, [, v]) => s + v, 0);
      if (chips) { paused = true; store.d.balance += chips; paused = false; settle(); }
      store.save(true);
      updateBalance();
      unlock('chal_first');
      if (c.streak >= 3) unlock('chal_streak3');
      if (c.streak >= 7) unlock('chal_streak7');
      setTimeout(() => toast(first ? `Tagesaufgabe gelöst · Serie ${c.streak}` : 'Tagesaufgabe nochmal gelöst', first ? `Morgen gibt’s ein neues Blatt.` : `Deine beste Zeit heute: ${clock(c.dayTime)}`), 2600);
      return { reward, chips };
    },
  };
}
const clock = s => (s ? `${Math.floor(s / 60)}:${pad(s % 60)}` : '–');

// ---------- Zusätzliche Erfolge ----------
// Werden an ACHIEVEMENTS angehängt, damit unlock(), Zähler und Cloud sie wie alle anderen behandeln.
const NEW_ACH = [
  { id: 'daily_3', t: 'Stammgast', d: 'Hol dir dein Tagesgeld 3 Tage in Folge.', m: 'lilac', g: '☀' },
  { id: 'daily_7', t: 'Treue Seele', d: 'Halte beim Tagesgeld eine 7-Tage-Serie.', m: 'gold', g: '7' },
  { id: 'chal_first', t: 'Pflichterfüllung', d: 'Löse eine Tagesaufgabe.', m: 'lilac', g: '✓' },
  { id: 'chal_streak3', t: 'Termintreu', d: 'Löse die Tagesaufgabe 3 Tage in Folge.', m: 'pink', g: '3' },
  { id: 'chal_streak7', t: 'Wochenwerk', d: 'Löse die Tagesaufgabe 7 Tage in Folge.', m: 'gold', g: '7' },
  { id: 'sol_2min', t: 'Turbo-Patience', d: 'Gewinne Solitaire in unter 2 Minuten.', m: 'gold', g: '2′' },
  { id: 'bj_hands500', t: 'Stammplatz', d: 'Spiele 500 Hände Blackjack.', m: 'pink', g: '500' },
  { id: 'all_games', t: 'Tausendsassa', d: 'Spiel jedes Spiel mindestens einmal.', m: 'lilac', g: '✧' },
  { id: 'looks_all', t: 'Modeikone', d: 'Besitze alle Tischfilze, Kartenrücken und Croupiers.', m: 'pink', g: '♕' },
  { id: 'chips_10k', t: 'Chipregen', d: 'Gewinne insgesamt 10.000 Chips.', m: 'lilac', g: '10k' },
  { id: 'chips_100k', t: 'Goldesel', d: 'Gewinne insgesamt 100.000 Chips.', m: 'gold', g: '★' },
  { id: 'comeback', t: 'Phönix aus der Gruft', d: 'Rutsch unter 50 Chips und kämpf dich zurück auf 1.000.', m: 'pink', g: '↺' },
  { id: 'night_choc', t: 'Nachtschicht', d: 'Spiel nach 22 Uhr mit Choccypuddin am Tisch.', m: 'lilac', g: '☕' },
  { id: 'play_10h', t: 'Sitzfleisch', d: 'Spiel insgesamt 10 Stunden.', m: 'gold', g: '⧗' },
];
for (const a of NEW_ACH) if (!ACHIEVEMENTS.some(x => x.id === a.id)) ACHIEVEMENTS.push(a);

let catalog = [];
const LOOK_CATS = ['felt', 'back', 'dealer'];
const sum = o => Object.values(o || {}).reduce((s, v) => s + (+v || 0), 0);
const totalWon = () => sum(P().won);
const totalTime = () => sum(P().time);
const looks = () => catalog.filter(c => LOOK_CATS.includes(c.key)).flatMap(c => c.items);
const buyables = () => catalog.flatMap(c => c.items).filter(i => !i.free);
const played = () => {
  const s = store.d.stats;
  return [['Blackjack', s.bj.hands], ['Solitaire', s.sol.played], ['Höher oder Tiefer', s.hl.rounds], ['Video-Poker', s.vp.hands]];
};

// Zählbarer Fortschritt [aktuell, Ziel] für gesperrte Erfolge
const PROGRESS = {
  bj_streak5: () => [store.d.stats.bj.bestStreak, 5],
  bj_dealerbust: () => [store.d.stats.bj.dealerBusts, 25],
  bj_rich: () => [store.d.stats.bj.peak, 10000],
  bj_hands500: () => [store.d.stats.bj.hands, 500],
  sol_streak3: () => [store.d.stats.sol.bestStreak, 3],
  sol_ten: () => [store.d.stats.sol.won, 10],
  hl_streak5: () => [store.d.stats.hl.bestStreak, 5],
  shop_all: () => [buyables().filter(i => owns(i.id)).length, buyables().length],
  daily_3: () => [liveStreak(), 3],
  daily_7: () => [liveStreak(), 7],
  chal_streak3: () => [liveChalStreak(), 3],
  chal_streak7: () => [liveChalStreak(), 7],
  all_games: () => [played().filter(([, n]) => n > 0).length, played().length],
  looks_all: () => [looks().filter(i => i.free || owns(i.id)).length, looks().length],
  chips_10k: () => [totalWon(), 10000],
  chips_100k: () => [totalWon(), 100000],
  play_10h: () => [Math.floor(totalTime() / 3600), 10],
};

function checkMeta() {
  const s = store.d.stats;
  if (s.sol.bestTime && s.sol.bestTime < 120) unlock('sol_2min');
  if (s.bj.hands >= 500) unlock('bj_hands500');
  if (played().every(([, n]) => n > 0)) unlock('all_games');
  if (catalog.length && looks().every(i => i.free || owns(i.id))) unlock('looks_all');
  const w = totalWon();
  if (w >= 10000) unlock('chips_10k');
  if (w >= 100000) unlock('chips_100k');
  if (totalTime() >= 36000) unlock('play_10h');
}

// ---------- Chip-Bilanz & Spielzeit ----------
// Vermögen = Guthaben + laufende Einsätze (pending*). Nur Änderungen während eines Spiels zählen;
// Einsatz setzen/zurücknehmen ändert das Vermögen nicht, erst das Ergebnis der Runde.
let lastW = null, paused = false, pend = false;
const activeGame = () => document.querySelector('.screen[data-active]')?.id.replace('screen-', '') || 'lobby';
const inGame = () => document.body.classList.contains('game-active');
function wealth() {
  let w = 0;
  for (const k in store.d) if ((k === 'balance' || k.startsWith('pending')) && typeof store.d[k] === 'number') w += store.d[k];
  return w;
}
function settle() {
  pend = false;
  const w = wealth(), delta = lastW == null ? 0 : w - lastW;
  lastW = w;
  const p = P();
  if (delta && !paused && inGame()) {
    const g = activeGame();
    if (delta > 0) p.won[g] = (p.won[g] || 0) + delta;
    else p.lost[g] = (p.lost[g] || 0) - delta;
  }
  if (w < 50) p.low = true;
  else if (p.low && w >= 1000) { p.low = false; unlock('comeback'); }
  if (delta) checkMeta();
}
const queue = () => { if (!pend) { pend = true; queueMicrotask(settle); } };
function installLedger() {
  const d = store.d;
  for (const k of Object.keys(d)) {
    if (!(k === 'balance' || k.startsWith('pending')) || typeof d[k] !== 'number') continue;
    let v = d[k];
    Object.defineProperty(d, k, { get: () => v, set: n => { v = n; queue(); }, enumerable: true, configurable: true });
  }
  lastW = wealth();
}

let ticks = 0;
function tickTime() {
  if (document.hidden || !inGame() || document.querySelector('.sheet.show')) return;
  const p = P(), g = activeGame();
  p.time[g] = (p.time[g] || 0) + 1;
  settle(); // fängt Änderungen an pending* ohne Guthaben-Änderung ab (z. B. verlorene Runde)
  if (++ticks % 30 === 0) {
    const h = new Date().getHours();
    if (store.d.look?.dealer === 'choc' && (h >= 22 || h < 5)) unlock('night_choc');
    checkMeta();
    store.save();
  }
}

// ---------- Lobby ----------
const CAL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="M9 14.5l2 2 4-4"/></svg>';
export function refreshProgressLobby() {
  const b = document.getElementById('chal-btn');
  if (!b) return;
  const done = chalSolvedToday(), n = liveChalStreak();
  b.classList.toggle('done', done);
  b.lastChild.textContent = done ? `Tagesaufgabe ✓ ${clock(P().chal.dayTime)}` : `Tagesaufgabe${n ? ` · Serie ${n}` : ''}`;
}

export function initProgress({ catalog: cat = [] } = {}) {
  catalog = cat;
  installLedger();
  const ico = document.querySelector('#chal-btn .ico-chal');
  if (ico) ico.outerHTML = CAL;
  setInterval(tickTime, 1000);
  checkMeta();
  refreshProgressLobby();
}

// ---------- Statistik: Übersicht ----------
const GAME_NAMES = { blackjack: 'Blackjack', solitaire: 'Solitaire', hilo: 'Höher oder Tiefer', poker: 'Video-Poker', slots: 'Slots', baccarat: 'Baccarat', spider: 'Spider', freecell: 'FreeCell' };
const gameName = k => GAME_NAMES[k] || k.charAt(0).toUpperCase() + k.slice(1);
const dur = s => (s >= 3600 ? `${Math.floor(s / 3600)} h ${pad(Math.floor(s / 60) % 60)} min` : s >= 60 ? `${Math.floor(s / 60)} min` : s ? `${s} s` : '–');

function totalRounds() {
  // Bekannte Zähler; neue Spiele mit hands/rounds/played/spins/games zählen automatisch mit
  let n = 0;
  for (const v of Object.values(store.d.stats)) {
    if (!v || typeof v !== 'object') continue;
    const k = ['hands', 'rounds', 'played', 'spins', 'games'].find(x => typeof v[x] === 'number');
    if (k) n += v[k];
  }
  return n;
}

export function statsOverviewHTML() {
  const p = P(), st = (v, l, c = '') => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`;
  const won = totalWon(), lost = sum(p.lost), net = won - lost, time = totalTime();
  const byTime = Object.entries(p.time).filter(([g, s]) => s > 0 && g !== 'lobby').sort((a, b) => b[1] - a[1]);
  const fav = byTime[0] ? gameName(byTime[0][0]) : (played().sort((a, b) => b[1] - a[1]).find(([, n]) => n > 0)?.[0] || '–');
  const max = byTime[0]?.[1] || 1;
  const bars = byTime.slice(0, 6).map(([g, s]) => `<li><span>${gameName(g)}</span><i style="--w:${Math.max(4, Math.round((s / max) * 100))}%"></i><b>${dur(s)}</b></li>`).join('');
  const c = p.chal;
  return `<div class="stat-hero">
    <div class="hero-main"><span>Lieblingsspiel</span><b>${fav}</b></div>
    <div class="stat-grid">
      ${st(fmt(store.d.balance), 'Guthaben')}${st(fmt(totalRounds()), 'Runden gespielt')}${st(dur(time), 'Spielzeit')}
      ${st(won ? '+' + fmt(won) : '–', 'Chips gewonnen', 'pos')}${st(lost ? '−' + fmt(lost) : '–', 'Chips verloren', 'neg')}${st(won || lost ? (net >= 0 ? '+' : '−') + fmt(Math.abs(net)) : '–', 'Bilanz', net >= 0 ? 'pos' : 'neg')}
    </div>
    ${bars ? `<ul class="time-bars">${bars}</ul>` : ''}
    ${won || lost || time ? '' : '<p class="hint">Chips und Spielzeit zählen ab jetzt mit. Los, spiel was.</p>'}
  </div>
  <div class="stat-block"><h3>Serien</h3><div class="stat-grid">
    ${st(fmt(liveStreak()), 'Tagesgeld-Serie')}${st(fmt(p.bestStreak || 0), 'Längste Tagesgeld-Serie')}
    ${st(fmt(c.solved), 'Tagesaufgaben gelöst')}${st(fmt(liveChalStreak()), 'Tagesaufgaben-Serie')}${st(fmt(c.bestStreak), 'Längste Aufgaben-Serie')}${st(clock(c.bestTime), 'Bestzeit Tagesaufgabe')}
  </div></div>`;
}

// ---------- Erfolge, gruppiert ----------
const CATS = [
  ['bj', 'Blackjack'], ['sol', 'Solitaire'], ['chal', 'Tagesaufgabe'], ['hl', 'Höher oder Tiefer'], ['vp', 'Video-Poker'],
  ['slots', 'Slots'], ['sl', 'Slots'], ['bac', 'Baccarat'], ['spider', 'Spider'], ['sp', 'Spider'], ['fc', 'FreeCell'], ['freecell', 'FreeCell'],
];
const META = new Set(['daily', 'shop', 'night', 'all', 'looks', 'chips', 'comeback', 'play']);
function catOf(a) {
  if (a.cat) return a.cat;
  const pre = a.id.split('_')[0];
  if (META.has(pre)) return 'Treue & Sammeln';
  return CATS.find(([k]) => k === pre)?.[1] || 'Weitere';
}

export function achGroupedHTML() {
  const got = store.d.ach;
  const df = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
  const groups = new Map();
  for (const a of ACHIEVEMENTS) { const c = catOf(a); if (!groups.has(c)) groups.set(c, []); groups.get(c).push(a); }
  const order = [...new Set([...CATS.map(([, n]) => n), 'Treue & Sammeln', ...groups.keys()])].filter(n => groups.has(n));
  const total = ACHIEVEMENTS.length, n = ACHIEVEMENTS.filter(a => got[a.id]).length;
  const item = a => {
    const on = got[a.id];
    let prog = '';
    if (!on && PROGRESS[a.id]) {
      const [cur, goal] = PROGRESS[a.id]();
      const c = Math.min(cur || 0, goal);
      if (goal) prog = `<div class="ach-bar" aria-label="${fmt(c)} von ${fmt(goal)}"><i style="--w:${Math.round((c / goal) * 100)}%"></i><span>${fmt(c)}/${fmt(goal)}</span></div>`;
    }
    return `<div class="ach ${on ? '' : 'locked'}">${medalSVG(a.m, a.g)}<div class="ach-txt"><div class="t">${a.t}</div><div class="d">${a.d}${on ? ` · ${df.format(on)}` : ''}</div>${prog}</div></div>`;
  };
  return `<p class="ach-progress">${n} von ${total} freigeschaltet</p><div class="ach-total"><i style="--w:${Math.round((n / total) * 100)}%"></i></div>
    ${order.map(c => { const list = groups.get(c), k = list.filter(a => got[a.id]).length; return `<section class="ach-group"><h3>${c}<small>${k}/${list.length}</small></h3><div class="ach-list">${list.map(item).join('')}</div></section>`; }).join('')}`;
}

// ---------- Sprüche ----------
Object.assign(LINES, {
  streakUp: ['Tag {n} in Folge. Du kommst echt nur wegen dem Geld, oder?', 'Schon wieder du. Tag {n}. Ich fang an, mich an dich zu gewöhnen.', '{n} Tage am Stück. Brav. Morgen gibt’s mehr, wenn du kommst.'],
  streakMax: ['Tag {n}! Maximalbonus. Ich sollte dir Miete berechnen.', 'Volle Woche und mehr. Du bist offiziell Inventar.'],
  streakLost: ['Ach, auch mal wieder da? Serie futsch, zurück auf Anfang.', 'Einen Tag geschwänzt und schon ist die Serie weg. Tja.'],
  chalEnter: ['Tagesaufgabe! Alle kriegen heute dasselbe Blatt. Mal sehen, ob du mithalten kannst.', 'Heute für alle gleich gemischt. Keine Ausreden.'],
});
Object.assign(CHOC, {
  streakUp: ['Tag {n}… du bist ja öfter wach als ich.', '{n} Tage hintereinander. Respekt. *gähn*'],
  streakMax: ['Maximalbonus. Ich hätte das nicht durchgehalten.'],
  streakLost: ['Serie gerissen. Passiert mir mit Schlaf auch ständig.'],
});
