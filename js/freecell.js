// FreeCell (im Upgrade-Shop freischaltbar): alle 52 Karten offen in 8 Spalten, 4 freie Zellen,
// 4 Ablagen. Abwechselnde Farben absteigend. Ganze Folgen gehen, so weit Platz zum Umlagern ist:
// (freie Zellen + 1) × 2^(leere Spalten). Spielnummern wie im klassischen Windows-FreeCell (1–32000).
import { CardLayer, newDeck, sleep } from './cards.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock } from './store.js';
import { pickLocal } from './mascot.js';
import { sparkleAt } from './fx.js';
import { fmt, updateBalance } from './ui.js';
import { maybeTutorial, helpButton } from './tutorial.js';
import { noteResult } from './streaks.js';
import { fcCanTab, fcCanFound, fcIsSeq, fcMaxMove, fcSafe, msDeal } from './patience-rules.js';
import { top, clock, overlap, shake, bindDrag, hopHint, makeTalker, winShow, overlay } from './patience.js';

const M = 'fc';
const COLS = 8;
const MAX_DEAL = 32000;
const $ = s => document.querySelector(s);
const screen = $('#screen-freecell');
const table = $('#fc-table');
const layerEl = $('#fc-cards');
const layer = new CardLayer(layerEl);
const slotsEl = $('#fc-slots');
const mascotEl = $('#fc-mascot');
const undoBtn = $('#fc-undo');
const autoBtn = $('#fc-auto');
const kortomi = makeTalker(mascotEl, M);

let S = null;
let byUid = new Map();
let history = [];
let L = {};
let busy = false;

const LINES = {
  enter: ['FreeCell. Alles liegt offen, keine Ausreden.', 'Vier Zellen, acht Spalten, ein Gehirn. Deins. Hoffentlich.', 'Hier entscheidet kein Glück. Nur du. Ups.'],
  resume: ['Spiel Nummer {n} wartet noch auf dich.', 'Weiter geht’s. Ich hab nichts angefasst. Ehrlich.'],
  found: ['Ab nach oben damit.', 'Ordentlich. Das mag ich.', 'Und noch eine.'],
  cells: ['Alle Zellen voll? Mutig. Oder verzweifelt.', 'Kein Platz mehr in den Zellen. Ich sag ja nur.'],
  tooMany: ['So viele auf einmal? Dafür fehlt dir Platz.', 'Mehr Zellen frei machen, dann klappt der Umzug.'],
  hint: ['Psst. Hier.', 'Ich würde ja das da machen. Aber ich bin nur die Croupière.', 'Rot auf Schwarz, Schätzchen.'],
  noMoves: ['Hm. Festgefahren. Zurück oder neues Spiel?', 'Ich seh keinen Zug mehr. Du?'],
  undo: ['Zurück? Ich zähl das mit.', 'Kleiner Zeitsprung. Ich verrat’s keinem.'],
  auto: ['Der Rest geht von allein. Tipp auf „Fertig legen“.'],
  win: ['Gewonnen! Alles sortiert, nichts gemogelt.', 'Sauber. Ich hätte es nicht besser… doch. Aber fast.', 'Alle Karten oben! Fledermaus-Party!'],
  fast: ['So schnell? Hast du heimlich geübt?'],
  newGame: ['Neue Nummer, neues Glück.', 'Frisch ausgeteilt. Alles offen, wie versprochen.'],
};
const line = (k, vars) => pickLocal('fc', LINES, k).replace(/\{(\w+)\}/g, (_, v) => vars?.[v] ?? '');
const talk = (k, mood, prio = 1, vars) => kortomi.say(line(k, vars), mood, prio);

const STEPS = [
  { t: 'FreeCell, Liebes', d: 'Alle Karten liegen offen. Kein Glück, keine Ausrede. Leg <b>abwechselnd Rot und Schwarz</b> absteigend aufeinander.', el: '#fc-table' },
  { t: 'Vier freie Zellen', d: 'Oben links parkst du je <b>eine Karte</b>. Praktisch, aber jede volle Zelle macht dich unbeweglicher.', el: '#fc-slots .cell.c0' },
  { t: 'Ablagen', d: 'Rechts oben sammelst du jede Farbe von <b>Ass bis König</b>. Sichere Karten fliegen von selbst hin.', el: '#fc-slots .found.f0' },
  { t: 'Ganze Folgen', d: 'Du darfst Folgen am Stück bewegen, so viele wie <b>(freie Zellen + 1) × 2 hoch leere Spalten</b>. Klingt kompliziert, ich rechne für dich.', el: '#fc-table' },
  { t: 'Spielnummern', d: 'Bei <b>Neues Spiel</b> kannst du eine Nummer von 1 bis 32000 eingeben. Gleiche Nummer, gleiches Spiel, perfekt zum Angeben.', el: '#fc-new' },
  { t: 'Notfall-Knöpfe', d: '<b>Tipp</b> zeigt einen Zug, <b>Zurück</b> nimmt ihn zurück. Antippen legt eine Karte automatisch ab.', el: '#fc-hint' },
];

// ---------- Zustand ----------
function newGame(n) {
  const deck = newDeck(1);
  byUid = new Map(deck.map(c => [c.uid, c]));
  const byFace = new Map(deck.map(c => [c.face, c]));
  S = { deal: n, tab: Array.from({ length: COLS }, () => []), cells: [null, null, null, null], found: [[], [], [], []], moves: 0, time: 0, usedUndo: false, started: false, won: false };
  msDeal(n).forEach((rc, i) => { const c = byFace.get(`${rc.rank}${rc.suit}`); c.up = true; S.tab[i % COLS].push(c); });
  history = [];
}
const randomDeal = () => 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % MAX_DEAL);
function snapshot() {
  const p = a => a.map(c => c.uid);
  return { tab: S.tab.map(p), cells: S.cells.map(c => (c ? c.uid : null)), found: S.found.map(p), moves: S.moves };
}
function restore(snap) {
  const u = a => a.map(id => byUid.get(id));
  S.tab = snap.tab.map(u); S.cells = snap.cells.map(id => (id ? byUid.get(id) : null)); S.found = snap.found.map(u);
  S.moves = snap.moves;
}
function persist() {
  if (!S || S.won) { store.d.fcSave = null; store.save(); return; }
  store.d.fcSave = { ...snapshot(), deal: S.deal, time: S.time, started: S.started, usedUndo: S.usedUndo };
  store.save();
}
function loadSave(sv) {
  const deck = newDeck(1);
  deck.forEach(c => (c.up = true));
  byUid = new Map(deck.map(c => [c.uid, c]));
  S = { deal: sv.deal, tab: [], cells: [], found: [], moves: 0, time: sv.time || 0, usedUndo: !!sv.usedUndo, started: !!sv.started, won: false };
  restore(sv);
  history = [];
}
const pushHistory = () => { history.push(snapshot()); if (history.length > 400) history.shift(); };

const freeCells = () => S.cells.filter(c => !c).length;
const emptyCols = () => S.tab.filter(col => !col.length).length;
const limit = toEmpty => fcMaxMove(freeCells(), emptyCols(), toEmpty);

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  const pad = Math.max(5, Math.min(W, H) * 0.016);
  const gapK = W < 520 ? 0.08 : 0.12;
  let cw = Math.min((W - pad * 2) / (COLS + (COLS - 1) * gapK), (H - pad * 2) / (1.4 * 4.6), 118);
  cw = Math.max(28, cw);
  const ch = cw * 1.4;
  const gap = cw * gapK;
  const x0 = (W - (COLS * cw + (COLS - 1) * gap)) / 2;
  const colX = i => x0 + i * (cw + gap);
  const y0 = pad;
  const ty = y0 + ch + Math.max(gap * 2, 12);
  L = { W, H, cw, ch, gap, colX, y0, ty, pad, bottom: H - pad };
  layer.setSize(cw, ch);
  renderSlots();
}

function renderSlots() {
  const { colX, y0, ty } = L;
  const mk = (x, y, cls, inner = '') => `<div class="slot-mark ${cls}" style="--x:${x}px;--y:${y}px">${inner}</div>`;
  const glyph = t => `<svg viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="56" font-family="Fredoka" font-weight="600" fill="currentColor">${t}</text></svg>`;
  let h = '';
  for (let i = 0; i < 4; i++) h += mk(colX(i), y0, `cell pat-cell c${i}`, glyph('◇'));
  for (let i = 0; i < 4; i++) h += mk(colX(4 + i), y0, `found f${i}`, glyph('A'));
  for (let i = 0; i < COLS; i++) h += mk(colX(i), ty, `tabslot t${i}`);
  slotsEl.innerHTML = h;
}

function fanStep(col) {
  const { ch, ty, bottom } = L;
  let up = ch * 0.27;
  const need = Math.max(0, col.length - 1) * up;
  const avail = bottom - ty - ch - (mascotEl.classList.contains('away') ? 0 : 6);
  if (need > avail && need > 0) up *= avail / need;
  return up;
}

function render({ instant = false, except = null } = {}) {
  if (!S) return;
  const { colX, y0, ty } = L;
  S.cells.forEach((c, i) => c && layer.place(c, { x: colX(i), y: y0, z: 50 + i, up: true, instant }));
  S.found.forEach((f, fi) => f.forEach((c, i) => layer.place(c, { x: colX(4 + fi), y: y0, z: 100 + fi * 15 + i, up: true, instant })));
  S.tab.forEach((col, ci) => {
    const up = fanStep(col);
    col.forEach((c, i) => { if (!(except && except.has(c.uid))) layer.place(c, { x: colX(ci), y: ty + i * up, z: 300 + ci * 60 + i, up: true, instant }); });
  });
  $('#fc-moves').textContent = S.moves;
  $('#fc-deal').textContent = `#${S.deal}`;
  undoBtn.disabled = !history.length || S.won;
  autoBtn.hidden = !canAutoFinish() || S.won;
  if (!autoBtn.hidden && !autoBtn._said) { autoBtn._said = true; talk('auto', 'happy', 2); }
}

// ---------- Regeln ----------
function where(card) {
  for (let i = 0; i < COLS; i++) { const k = S.tab[i].indexOf(card); if (k >= 0) return { t: 'tab', i, idx: k }; }
  const ci = S.cells.indexOf(card);
  if (ci >= 0) return { t: 'cell', i: ci };
  return { t: 'f' };
}
function movable(card) {
  const p = where(card);
  if (p.t === 'cell') return { from: p, cards: [card] };
  if (p.t !== 'tab') return false;
  const cards = S.tab[p.i].slice(p.idx);
  if (!fcIsSeq(cards)) return null;
  if (cards.length > limit(false)) { talk('tooMany', 'think', 2); return null; }
  return { from: p, cards };
}
// Darf diese Folge an dieses Ziel?
function legal(m, to) {
  const card = m.cards[0], n = m.cards.length;
  if (to.t === 'f') return n === 1 && fcCanFound(card, S.found[to.i]);
  if (to.t === 'cell') return n === 1 && !S.cells[to.i] && m.from.t !== 'cell';
  if (to.t === 'tab') {
    if (m.from.t === 'tab' && m.from.i === to.i) return false;
    const col = S.tab[to.i];
    return fcCanTab(card, col) && n <= limit(!col.length);
  }
  return false;
}

function take(from, n) {
  if (from.t === 'cell') { const c = S.cells[from.i]; S.cells[from.i] = null; return [c]; }
  if (from.t === 'f') return [S.found[from.i].pop()];
  const src = S.tab[from.i];
  return src.splice(src.length - n, n);
}
function put(to, cards) {
  if (to.t === 'cell') S.cells[to.i] = cards[0];
  else if (to.t === 'f') S.found[to.i].push(cards[0]);
  else S.tab[to.i].push(...cards);
}

async function doMove(from, to, n) {
  pushHistory();
  put(to, take(from, n));
  S.moves++;
  startTimer();
  sfx.place();
  if (to.t === 'f') sparkle(to.i);
  if (to.t === 'cell' && !freeCells() && Math.random() < .4) talk('cells', 'smug', 1);
  render();
  persist();
  await autoPlay();
  checkWin();
}
function sparkle(fi) {
  if (Math.random() < .08) talk('found', 'happy', 1);
  const c = top(S.found[fi]); const el = c && layer.elOf(c);
  setTimeout(() => { if (el) { const r = el.getBoundingClientRect(); sparkleAt(r.left + r.width / 2, r.top + r.height / 2); } }, 300);
}

// Sichere Karten wandern von selbst auf die Ablagen (zählt nicht als eigener Zug fürs Zurück).
function nextSafe(any = false) {
  const cand = [];
  S.cells.forEach((c, i) => c && cand.push({ c, from: { t: 'cell', i } }));
  S.tab.forEach((col, i) => col.length && cand.push({ c: top(col), from: { t: 'tab', i, idx: col.length - 1 } }));
  cand.sort((a, b) => a.c.rank - b.c.rank);
  for (const { c, from } of cand) {
    if (!any && !fcSafe(c, S.found)) continue;
    for (let fi = 0; fi < 4; fi++) if (fcCanFound(c, S.found[fi])) return { from, to: { t: 'f', i: fi } };
  }
  return null;
}
async function autoPlay(any = false) {
  busy = true;
  let mv;
  while (!S.won && (mv = nextSafe(any))) {
    await sleep(any ? 90 : 150);
    put(mv.to, take(mv.from, 1));
    sfx.place();
    render();
  }
  busy = false;
  persist();
}

const canAutoFinish = () => S && !S.won && S.found.some(f => f.length < 13) && S.tab.every(col => fcIsSeq(col));
async function autoFinish() {
  if (busy) return;
  autoBtn.hidden = true;
  pushHistory();
  await autoPlay(true);
  checkWin();
}

// Ziel beim Antippen: Ablage, passende Spalte, leere Spalte, freie Zelle
function autoTarget(m) {
  const opts = [];
  for (let i = 0; i < 4; i++) opts.push({ t: 'f', i });
  for (let i = 0; i < COLS; i++) if (S.tab[i].length) opts.push({ t: 'tab', i });
  if (!(m.from.t === 'tab' && m.from.idx === 0)) for (let i = 0; i < COLS; i++) if (!S.tab[i].length) opts.push({ t: 'tab', i });
  for (let i = 0; i < 4; i++) opts.push({ t: 'cell', i });
  return opts.find(to => legal(m, to)) || null;
}

// ---------- Eingabe ----------
function dropTarget(d, cx, cy) {
  const { cw, ch, colX, y0, ty } = L;
  let best = null, bestA = 0;
  const test = (to, x, y, w, h) => { const a = overlap(cx, cy, cw, ch, x, y, w, h); if (a > bestA && legal(d.m, to)) { best = to; bestA = a; } };
  for (let i = 0; i < 4; i++) { test({ t: 'cell', i }, colX(i), y0, cw, ch); test({ t: 'f', i }, colX(4 + i), y0, cw, ch); }
  for (let i = 0; i < COLS; i++) {
    const col = S.tab[i];
    const lastY = col.length ? layer.get(top(col)).y : ty;
    test({ t: 'tab', i }, colX(i) - L.gap / 2, ty, cw + L.gap, Math.max(lastY - ty + ch, ch));
  }
  return bestA > cw * ch * 0.08 ? best : null;
}
let hl = null;
const slotSel = t => (t.t === 'f' ? `.f${t.i}` : t.t === 'cell' ? `.c${t.i}` : `.t${t.i}`);
function highlightDrop(t) {
  const key = t ? slotSel(t) : null;
  if (key === hl) return;
  hl = key;
  slotsEl.querySelectorAll('.drop-ok').forEach(s => s.classList.remove('drop-ok'));
  if (t) slotsEl.querySelector(slotSel(t))?.classList.add('drop-ok');
}

// ---------- Zurück, Tipp ----------
function undo() {
  if (!history.length || busy || S.won) return;
  restore(history.pop());
  S.usedUndo = true; S.moves++;
  sfx.whoosh();
  if (Math.random() < .3) talk('undo', 'smug', 1);
  render(); persist();
}

function findHint() {
  const tgt = to => (to.t === 'f' ? top(S.found[to.i]) : to.t === 'tab' ? top(S.tab[to.i]) : null);
  const mk = (cards, to) => ({ cards, to, target: tgt(to) });
  // 1. Auf die Ablage
  for (let i = 0; i < 4; i++) { const c = S.cells[i]; if (c) for (let f = 0; f < 4; f++) if (fcCanFound(c, S.found[f])) return mk([c], { t: 'f', i: f }); }
  for (let ci = 0; ci < COLS; ci++) { const c = top(S.tab[ci]); if (c) for (let f = 0; f < 4; f++) if (fcCanFound(c, S.found[f])) return mk([c], { t: 'f', i: f }); }
  // 2. Folge auf eine andere Spalte, die nicht schon auf einem passenden Platz liegt
  let best = null, bestS = -1;
  for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci];
    for (let idx = col.length - 1; idx >= 0; idx--) {
      const cards = col.slice(idx);
      if (!fcIsSeq(cards)) break;
      if (idx > 0 && fcIsSeq(col.slice(idx - 1, idx + 1))) continue;
      const m = { from: { t: 'tab', i: ci, idx }, cards };
      for (let i = 0; i < COLS; i++) {
        if (!S.tab[i].length || !legal(m, { t: 'tab', i })) continue;
        const s = (idx === 0 ? 50 : 0) + (20 - idx);
        if (s > bestS) { bestS = s; best = mk(cards, { t: 'tab', i }); }
      }
    }
  }
  if (best) return best;
  // 3. Karte aus einer Zelle zurück in eine Spalte
  for (let i = 0; i < 4; i++) {
    const c = S.cells[i]; if (!c) continue;
    const m = { from: { t: 'cell', i }, cards: [c] };
    for (let j = 0; j < COLS; j++) if (legal(m, { t: 'tab', i: j })) return mk([c], { t: 'tab', i: j });
  }
  // 4. Folge in eine leere Spalte (nur wenn darunter noch etwas liegt)
  const empty = S.tab.findIndex(col => !col.length);
  if (empty >= 0) for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci];
    let idx = col.length - 1;
    while (idx > 0 && fcIsSeq(col.slice(idx - 1))) idx--;
    if (idx <= 0) continue;
    const cards = col.slice(idx);
    if (legal({ from: { t: 'tab', i: ci, idx }, cards }, { t: 'tab', i: empty })) return mk(cards, { t: 'tab', i: empty });
  }
  // 5. Notlösung: eine Karte in eine freie Zelle
  const cell = S.cells.findIndex(c => !c);
  if (cell >= 0) {
    let ci = -1;
    S.tab.forEach((col, i) => { if (col.length > 1 && (ci < 0 || col.length < S.tab[ci].length)) ci = i; });
    if (ci >= 0) return mk([top(S.tab[ci])], { t: 'cell', i: cell });
  }
  return null;
}
let hintTimer = null;
function clearHint() { table.querySelectorAll('.hint').forEach(e => e.classList.remove('hint')); clearTimeout(hintTimer); }
function hint() {
  if (!S || S.won || busy) return;
  clearHint(); sfx.tap();
  const h = findHint();
  if (!h) { talk('noMoves', 'sad', 3); return; }
  const src = h.cards.map(c => layer.elOf(c));
  const dst = h.target ? layer.elOf(h.target) : slotsEl.querySelector(slotSel(h.to));
  [...src, dst].forEach(e => e && e.classList.add('hint'));
  hopHint(src, dst);
  hintTimer = setTimeout(clearHint, 3000);
  talk('hint', 'wink', 2);
}

// ---------- Zeit & Sieg ----------
function startTimer() {
  if (S.started) return;
  S.started = true;
  store.d.stats.fc.played++; store.save();
}
function tick() {
  if (screen.hasAttribute('data-active')) kortomi.sync();
  if (!S || !S.started || S.won || document.hidden || !screen.hasAttribute('data-active')) return;
  S.time++;
  $('#fc-time').textContent = clock(S.time);
  if (S.time % 10 === 0) persist();
}

function checkWin() {
  if (S.won || !S.found.every(f => f.length === 13)) return;
  S.won = true;
  const st = store.d.stats.fc;
  st.won++;
  if (!st.bestTime || S.time < st.bestTime) st.bestTime = S.time;
  const fast = S.time < 240;
  const reward = [['Sieg', 100]];
  if (fast) reward.push(['Unter 4 Minuten', 50]);
  if (!S.usedUndo) reward.push(['Ohne Zurück', 50]);
  const chips = reward.reduce((a, [, v]) => a + v, 0);
  store.d.balance += chips;
  st.chips = (st.chips || 0) + chips;
  store.d.fcSave = null; store.save(true);
  updateBalance();
  noteResult('fc', 'win', chips);
  unlock('fc_first');
  if (fast) unlock('fc_fast');
  render();
  setTimeout(() => {
    talk(fast ? 'fast' : 'win', 'love', 3);
    const launches = [];
    for (let r = 12; r >= 0; r--) for (let fi = 0; fi < 4; fi++) { const c = S.found[fi][r]; if (c) launches.push({ card: c, x: L.colX(4 + fi), y: L.y0, el: layer.elOf(c) }); }
    winShow({
      table, launches, cw: L.cw, ch: L.ch, mascotEl, gameName: 'FreeCell', reward, chips,
      text: `Spiel #${S.deal} ${S.usedUndo ? 'gelöst.' : 'gelöst, ganz ohne Zurück.'}`,
      stats: [[clock(S.time), 'Zeit'], [S.moves, 'Züge'], [`#${S.deal}`, 'Spiel']],
      onNew: ov => { ov.remove(); startNew(); },
    });
  }, 700);
}

// ---------- Neues Spiel (Spielnummer optional) ----------
function askNew() {
  if (busy) return;
  sfx.tap();
  const ov = overlay(table, `<h3>Neues Spiel</h3><p>Zufällig austeilen oder eine Spielnummer wählen.</p>
    <label class="pat-num"><span>Spiel-Nr.</span><input type="number" inputmode="numeric" min="1" max="${MAX_DEAL}" placeholder="zufällig" aria-label="Spielnummer, 1 bis ${MAX_DEAL}"></label>
    <div class="row"><button class="btn ghost" data-act="cancel">Weiterspielen</button><button class="btn primary" data-act="go">Austeilen</button></div>`);
  const inp = ov.querySelector('input');
  const go = () => {
    const v = parseInt(inp.value, 10);
    if (inp.value && !(v >= 1 && v <= MAX_DEAL)) { shake([inp]); return; }
    ov.remove(); talk('newGame', 'smug', 1); startNew(v || undefined);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); e.stopPropagation(); });
  ov.querySelector('[data-act=cancel]').addEventListener('click', () => { sfx.tap(); ov.remove(); });
  ov.querySelector('[data-act=go]').addEventListener('click', go);
}

async function startNew(n = randomDeal()) {
  if (busy) return;
  table.querySelector('.overlay-card')?.remove();
  busy = true;
  autoBtn._said = false;
  newGame(n);
  layer.clear();
  computeLayout();
  $('#fc-time').textContent = '0:00';
  const all = S.tab.flat();
  const cx = (L.W - L.cw) / 2;
  all.forEach((c, i) => layer.place(c, { x: cx, y: L.y0, z: i, up: false, instant: true }));
  render({ instant: true, except: new Set(all.map(c => c.uid)) });
  sfx.shuffle();
  await sleep(300);
  const step = 18;
  for (let i = 0; i < 52; i++) {
    const ci = i % COLS, row = Math.floor(i / COLS), c = S.tab[ci][row];
    const y = L.ty + row * fanStep(S.tab[ci]);
    layer.place(c, { x: L.colX(ci), y, z: 300 + ci * 60 + row, up: false, delay: i * step, dur: 320 });
    setTimeout(() => layer.place(c, { x: L.colX(ci), y, z: 300 + ci * 60 + row, up: true }), i * step + 280);
    if (i % 2 === 0) setTimeout(() => sfx.deal(), i * step);
  }
  await sleep(52 * step + 500);
  busy = false;
  render();
  persist();
}

// ---------- Init ----------
let inited = false;
export function enterFreecell() {
  const first = !inited;
  if (first) {
    inited = true;
    kortomi.mount();
    screen.querySelector('.topbar-actions').prepend(helpButton('freecell', STEPS));
    bindDrag({
      layerEl, layer, byUid: () => byUid, busy: () => busy || !S || S.won,
      press: card => { clearHint(); return movable(card); },
      onTap: (card, m, els) => { const to = autoTarget(m); if (to) { doMove(m.from, to, m.cards.length); vibrate(8); } else shake(els); },
      onHover: (d, x, y) => highlightDrop(dropTarget(d, x, y)),
      onDrop: (d, x, y) => { highlightDrop(null); const t = dropTarget(d, x, y); if (t) { doMove(d.m.from, t, d.m.cards.length); vibrate(8); } else render(); },
      onCancel: () => { highlightDrop(null); render(); },
    });
    $('#fc-new').addEventListener('click', askNew);
    undoBtn.addEventListener('click', undo);
    $('#fc-hint').addEventListener('click', hint);
    autoBtn.addEventListener('click', autoFinish);
    setInterval(tick, 1000);
    new ResizeObserver(() => { if (table.clientWidth && S && !busy) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!screen.hasAttribute('data-active') || document.querySelector('.sheet.show, .tut.show') || e.target.closest?.('input')) return;
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey)) || e.key === 'u') { e.preventDefault(); undo(); }
      else if (e.key === 'h') hint();
    });
  }
  kortomi.sync();
  computeLayout();
  if (first) {
    const sv = store.d.fcSave;
    if (sv && sv.tab && sv.deal) { loadSave(sv); layer.clear(); render({ instant: true }); $('#fc-time').textContent = clock(S.time); setTimeout(() => talk('resume', 'wink', 2, { n: S.deal }), 700); }
    else { startNew(); setTimeout(() => talk('enter', 'smug', 2), 900); }
  } else {
    render({ instant: true });
    setTimeout(() => talk('enter', 'smug', 1), 700);
  }
  maybeTutorial('freecell', STEPS, 1200);
}
