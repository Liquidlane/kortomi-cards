// Klondike-Solitaire: Ziehen & Ablegen oder Antippen zum automatischen Verschieben.
import { CardLayer, newDeck, shuffle, sleep } from './cards.js';
import { RED, icon } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock } from './store.js';
import { mountMascot, say, pick, setMood } from './mascot.js';
import { celebrate, sparkleAt, batSwarm } from './fx.js';
import { fmt, updateBalance, toast } from './ui.js';
import { runCascade } from './cascade.js';

const M = 'sol';
const $ = s => document.querySelector(s);
const table = $('#sol-table');
const layer = new CardLayer($('#sol-cards'));
const slotsEl = $('#sol-slots');
const mascotEl = $('#sol-mascot');
const autoBtn = $('#sol-auto');
const undoBtn = $('#sol-undo');

let S = null;       // Spielzustand
let byUid = new Map();
let history = [];
let L = {};
let timer = null;
let busy = false;
let drag = null;

const isRed = c => !!RED[c.suit];
const top = a => a[a.length - 1];

// ---------- Zustand ----------
function newGame() {
  const deck = shuffle(newDeck(1));
  byUid = new Map(deck.map(c => [c.uid, c]));
  S = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], score: 0, moves: 0, time: 0, draw3: store.d.settings.draw3, usedUndo: false, started: false, won: false };
  let k = 0;
  for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) { const c = deck[k++]; c.up = false; S.tab[j].push(c); }
  S.tab.forEach(col => (top(col).up = true));
  S.stock = deck.slice(k).map(c => ((c.up = false), c));
  history = [];
}

function snapshot() {
  const p = a => a.map(c => [c.uid, c.up ? 1 : 0]);
  return { stock: p(S.stock), waste: p(S.waste), found: S.found.map(p), tab: S.tab.map(p), score: S.score, moves: S.moves, draw3: S.draw3, usedUndo: S.usedUndo };
}
function restore(snap) {
  const u = a => a.map(([id, up]) => { const c = byUid.get(id); c.up = !!up; return c; });
  S.stock = u(snap.stock); S.waste = u(snap.waste); S.found = snap.found.map(u); S.tab = snap.tab.map(u);
  S.score = snap.score; S.moves = snap.moves; S.draw3 = snap.draw3;
}
function persist() {
  if (!S || S.won) { store.d.solSave = null; store.save(); return; }
  store.d.solSave = { ...snapshot(), time: S.time, started: S.started, deck: [...byUid.values()].map(c => c.uid) };
  store.save();
}
function loadSave(sv) {
  const deck = newDeck(1);
  byUid = new Map(deck.map(c => [c.uid, c]));
  S = { found: [], tab: [], stock: [], waste: [], time: sv.time || 0, started: sv.started, won: false, usedUndo: sv.usedUndo };
  restore(sv);
  history = [];
}

function pushHistory() { history.push(snapshot()); if (history.length > 300) history.shift(); }

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  const pad = Math.max(8, Math.min(W, H) * 0.02);
  let cw = Math.min((W - pad * 2) / 7.7, (H - pad * 2) / (1.4 * 4.2), 124);
  cw = Math.max(34, cw);
  const ch = cw * 1.4;
  const gap = cw * 0.11;
  const totalW = 7 * cw + 6 * gap;
  const x0 = (W - totalW) / 2;
  const colX = i => x0 + i * (cw + gap);
  const y0 = pad;
  const ty = y0 + ch + Math.max(gap * 1.6, 12);
  L = { W, H, cw, ch, gap, colX, y0, ty, pad, bottom: H - pad };
  layer.setSize(cw, ch);
  renderSlots();
}

function renderSlots() {
  const { colX, y0, ty } = L;
  const mk = (x, y, cls, inner = '') => `<div class="slot-mark ${cls}" style="--x:${x}px;--y:${y}px">${inner}</div>`;
  const ring = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg>`;
  let h = mk(colX(0), y0, 'stock', ring);
  for (let i = 0; i < 4; i++) h += mk(colX(3 + i), y0, `found f${i}`, `<svg viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="56" font-family="Fredoka" font-weight="600" fill="currentColor">A</text></svg>`);
  for (let i = 0; i < 7; i++) h += mk(colX(i), ty, `tabslot t${i}`, `<svg viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="56" font-family="Fredoka" font-weight="600" fill="currentColor">K</text></svg>`);
  slotsEl.innerHTML = h;
  slotsEl.querySelector('.stock').addEventListener('click', () => drawStock());
}

function fanOffsets(col) {
  const { ch, ty, bottom } = L;
  let dn = ch * 0.1, up = ch * 0.27;
  const downs = col.filter(c => !c.up).length, ups = col.length - downs;
  const need = downs * dn + Math.max(0, ups - 1) * up;
  const avail = bottom - ty - ch - (mascotEl.classList.contains('away') ? 0 : 6);
  if (need > avail && need > 0) { const k = avail / need; dn *= k; up *= k; }
  return { dn, up };
}

function render({ instant = false, except = null } = {}) {
  if (!S) return;
  const { colX, y0, ty, cw } = L;
  S.stock.forEach((c, i) => layer.place(c, { x: colX(0) - Math.floor(i / 8) * 0.8, y: y0 - Math.floor(i / 8) * 0.8, z: i + 1, up: false, instant }));
  const fanN = S.draw3 ? 3 : 1;
  const wl = S.waste.length;
  S.waste.forEach((c, i) => {
    const fromTop = wl - 1 - i;
    const slot = fromTop < fanN ? fanN - 1 - fromTop : 0;
    const off = Math.min(slot, wl - 1) * cw * 0.26;
    layer.place(c, { x: colX(1) + (S.draw3 ? Math.max(0, Math.min(fanN, wl) - 1 - fromTop) * cw * 0.26 : 0), y: y0, z: 100 + i, up: true, instant });
  });
  S.found.forEach((f, fi) => f.forEach((c, i) => layer.place(c, { x: colX(3 + fi), y: y0, z: 200 + i, up: true, instant })));
  S.tab.forEach((col, ci) => {
    const { dn, up } = fanOffsets(col);
    let y = ty;
    col.forEach((c, i) => {
      if (except && except.has(c.uid)) { y += c.up ? up : dn; return; }
      layer.place(c, { x: colX(ci), y, z: 300 + ci * 30 + i, up: c.up, instant });
      y += c.up ? up : dn;
    });
  });
  document.getElementById('sol-moves').textContent = S.moves;
  document.getElementById('sol-score').textContent = fmt(S.score);
  undoBtn.disabled = !history.length;
  autoBtn.hidden = !canAutoFinish() || S.won;
  if (!autoBtn.hidden && !autoBtn._said) { autoBtn._said = true; talk('solAuto', 'happy', 2); }
}

// ---------- Regeln ----------
function where(card) {
  if (S.stock.includes(card)) return { t: 'stock', i: 0, idx: S.stock.indexOf(card) };
  if (S.waste.includes(card)) return { t: 'waste', i: 0, idx: S.waste.indexOf(card) };
  for (let i = 0; i < 4; i++) { const k = S.found[i].indexOf(card); if (k >= 0) return { t: 'f', i, idx: k }; }
  for (let i = 0; i < 7; i++) { const k = S.tab[i].indexOf(card); if (k >= 0) return { t: 'tab', i, idx: k }; }
  return null;
}
const pileArr = p => p.t === 'stock' ? S.stock : p.t === 'waste' ? S.waste : p.t === 'f' ? S.found[p.i] : S.tab[p.i];
const canFound = (c, f) => (f.length ? (top(f).suit === c.suit && top(f).rank === c.rank - 1) : c.rank === 1);
const canTab = (c, col) => (col.length ? (top(col).up && isRed(top(col)) !== isRed(c) && top(col).rank === c.rank + 1) : c.rank === 13);

function movable(card) {
  const p = where(card);
  if (!p) return null;
  const arr = pileArr(p);
  if (p.t === 'stock') return null;
  if (p.t === 'waste' || p.t === 'f') return p.idx === arr.length - 1 ? { from: p, cards: [card] } : null;
  if (!card.up) return null;
  return { from: p, cards: arr.slice(p.idx) };
}

function doMove(from, to, n) {
  pushHistory();
  const src = pileArr(from), dst = pileArr(to);
  const cards = src.splice(src.length - n, n);
  dst.push(...cards);
  // Punkte (klassisch)
  if (from.t === 'waste' && to.t === 'tab') S.score += 5;
  if (to.t === 'f' && from.t !== 'f') S.score += 10;
  if (from.t === 'f' && to.t === 'tab') S.score = Math.max(0, S.score - 15);
  S.moves++;
  let flipped = false;
  if (from.t === 'tab' && src.length && !top(src).up) { top(src).up = true; S.score += 5; flipped = true; }
  startTimer();
  sfx.place();
  if (to.t === 'f') {
    const c = cards[0];
    if (c.rank === 1 && Math.random() < .35) talk('solAce', 'happy', 1);
    else if (Math.random() < .08) talk('solFoundation', 'happy', 1);
    const el = layer.elOf(c);
    setTimeout(() => { if (el) { const r = el.getBoundingClientRect(); sparkleAt(r.left + r.width / 2, r.top + r.height / 2); } }, 300);
  } else if (to.t === 'tab' && dst.length === n && cards[0].rank === 13 && Math.random() < .3) talk('solKingEmpty', 'idle', 1);
  render();
  persist();
  checkWin();
  return flipped;
}

function drawStock() {
  if (busy || S.won) return;
  if (!S.stock.length) {
    if (!S.waste.length) return;
    pushHistory();
    S.stock = S.waste.reverse().map(c => ((c.up = false), c));
    S.waste = [];
    S.score = Math.max(0, S.score - (S.draw3 ? 20 : 100));
    S.moves++;
    sfx.shuffle();
    if (Math.random() < .3) talk('solRecycle', 'think', 1);
  } else {
    pushHistory();
    const n = Math.min(S.draw3 ? 3 : 1, S.stock.length);
    for (let i = 0; i < n; i++) { const c = S.stock.pop(); c.up = true; S.waste.push(c); }
    S.moves++;
    sfx.deal();
  }
  startTimer();
  render(); persist();
}

function autoTarget(card, m) {
  const one = m.cards.length === 1;
  if (one && m.from.t !== 'f') for (let i = 0; i < 4; i++) if (canFound(card, S.found[i])) return { t: 'f', i };
  const opts = [];
  for (let i = 0; i < 7; i++) {
    if (m.from.t === 'tab' && m.from.i === i) continue;
    if (!canTab(card, S.tab[i])) continue;
    if (!S.tab[i].length && m.from.t === 'tab' && m.from.idx === 0) continue; // König von leerem Platz zu leerem Platz bringt nichts
    opts.push({ t: 'tab', i, empty: !S.tab[i].length });
  }
  opts.sort((a, b) => a.empty - b.empty);
  return opts[0] || null;
}

function tryAuto(card) {
  const m = movable(card);
  if (!m) return false;
  const to = autoTarget(card, m);
  if (!to) return false;
  doMove(m.from, to, m.cards.length);
  return true;
}

// ---------- Eingabe: Ziehen & Antippen ----------
function onDown(e) {
  if (busy || !S || S.won || drag) return;
  const el = e.target.closest('.card');
  if (!el) return;
  const card = byUid.get(el.dataset.uid);
  if (!card) return;
  clearHint();
  const p = where(card);
  if (p.t === 'stock') { drawStock(); return; }
  const m = movable(card);
  if (!m) { if (!card.up) { sfx.nope(); } return; }
  e.preventDefault();
  const rect = table.getBoundingClientRect();
  const els = m.cards.map(c => layer.elOf(c));
  const starts = m.cards.map(c => { const s = layer.get(c); return { x: s.x, y: s.y }; });
  drag = { card, m, els, starts, sx: e.clientX, sy: e.clientY, rect, moved: false, id: e.pointerId };
  el.setPointerCapture?.(e.pointerId);
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 7) return;
  if (!drag.moved) {
    drag.moved = true;
    drag.els.forEach((el, i) => { el.classList.add('dragging'); el.style.zIndex = 3000 + i; });
  }
  drag.els.forEach((el, i) => {
    el.style.setProperty('--x', `${drag.starts[i].x + dx}px`);
    el.style.setProperty('--y', `${drag.starts[i].y + dy}px`);
  });
  highlightDrop(dropTarget(drag, dx, dy));
}

function dropTarget(d, dx, dy) {
  const { cw, ch, colX, y0, ty } = L;
  const cx = d.starts[0].x + dx, cy = d.starts[0].y + dy;
  const overlap = (x, y, w, h) => Math.max(0, Math.min(cx + cw, x + w) - Math.max(cx, x)) * Math.max(0, Math.min(cy + ch, y + h) - Math.max(cy, y));
  let best = null, bestA = 0;
  const card = d.card, one = d.m.cards.length === 1;
  if (one) for (let i = 0; i < 4; i++) {
    if (d.m.from.t === 'f' && d.m.from.i === i) continue;
    const a = overlap(colX(3 + i), y0, cw, ch);
    if (a > bestA && canFound(card, S.found[i])) { best = { t: 'f', i }; bestA = a; }
  }
  for (let i = 0; i < 7; i++) {
    if (d.m.from.t === 'tab' && d.m.from.i === i) continue;
    const col = S.tab[i];
    const last = col.length ? layer.get(top(col)) : { x: colX(i), y: ty };
    const a = overlap(colX(i), ty, cw, Math.max(last.y - ty + ch, ch));
    if (a > bestA && canTab(card, col)) { best = { t: 'tab', i }; bestA = a; }
  }
  return bestA > cw * ch * 0.08 ? best : null;
}

let hl = null;
function highlightDrop(t) {
  const key = t ? `${t.t}${t.i}` : null;
  if (key === hl) return;
  hl = key;
  slotsEl.querySelectorAll('.drop-ok').forEach(s => s.classList.remove('drop-ok'));
  if (t) slotsEl.querySelector(t.t === 'f' ? `.f${t.i}` : `.t${t.i}`)?.classList.add('drop-ok');
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  highlightDrop(null);
  d.els.forEach(el => el.classList.remove('dragging'));
  if (!d.moved) {
    if (!tryAuto(d.card)) { sfx.nope(); vibrate(15); d.els.forEach(el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }); }
    return;
  }
  const t = dropTarget(d, e.clientX - d.sx, e.clientY - d.sy);
  if (t) { doMove(d.m.from, t, d.m.cards.length); vibrate(8); }
  else { render(); }
}

// ---------- Undo, Tipp, Auto ----------
function undo() {
  if (!history.length || busy || S.won) return;
  restore(history.pop());
  S.usedUndo = true; S.moves++;
  sfx.whoosh();
  if (Math.random() < .3) talk('solUndo', 'smug', 1);
  render(); persist();
}

function findHint() {
  const tops = [];
  if (S.waste.length) tops.push(top(S.waste));
  S.tab.forEach(col => col.length && tops.push(top(col)));
  for (const c of tops) for (let i = 0; i < 4; i++) if (canFound(c, S.found[i])) return { cards: [c], slot: `.f${i}`, target: top(S.found[i]) };
  // Stapel verschieben, der eine verdeckte Karte freilegt (oder König auf leeren Platz)
  for (let ci = 0; ci < 7; ci++) {
    const col = S.tab[ci];
    const k = col.findIndex(c => c.up);
    if (k < 0) continue;
    const c = col[k];
    if (k === 0 && c.rank === 13) continue;
    for (let i = 0; i < 7; i++) if (i !== ci && canTab(c, S.tab[i]) && (k > 0 || S.tab[i].length)) return { cards: [c], slot: `.t${i}`, target: top(S.tab[i]) };
  }
  if (S.waste.length) { const c = top(S.waste); for (let i = 0; i < 7; i++) if (canTab(c, S.tab[i])) return { cards: [c], slot: `.t${i}`, target: top(S.tab[i]) }; }
  if (S.stock.length || S.waste.length) return { stock: true };
  return null;
}
let hintTimer = null;
function clearHint() { document.querySelectorAll('#sol-table .hint').forEach(e => e.classList.remove('hint')); clearTimeout(hintTimer); }
function hint() {
  if (!S || S.won) return;
  clearHint(); sfx.tap();
  const h = findHint();
  if (!h) { talk('solNoMoves', 'sad', 3); return; }
  // Quelle: der ganze Stapel, der bewegt würde; Ziel: oberste Karte oder leerer Platz
  let src = [], dst = null;
  if (h.stock) src = [S.stock.length ? layer.elOf(top(S.stock)) : slotsEl.querySelector('.stock')];
  else {
    const m = movable(h.cards[0]);
    src = (m ? m.cards : h.cards).map(c => layer.elOf(c));
    dst = h.target ? layer.elOf(h.target) : slotsEl.querySelector(h.slot);
  }
  [...src, dst].forEach(e => e && e.classList.add('hint'));
  hopHint(src, dst);
  hintTimer = setTimeout(clearHint, 3000);
  talk(h.stock ? 'solStuck' : 'solHint', 'wink', 2);
}

// Tipp-Animation: Die Quellkarten hüpfen dreimal, danach nickt das Ziel zweimal.
// Animiert wird das innere Element, damit die Positionierung der Karte unberührt bleibt.
function hopHint(src, dst) {
  if (!store.d.settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const inner = el => el?.querySelector('.inner') || el;
  src.forEach((el, i) => {
    const t = inner(el); if (!t) return;
    t.animate([
      { translate: '0 0', scale: '1' },
      { translate: '0 -22%', scale: '1.06', offset: 0.35 },
      { translate: '0 0', scale: '1', offset: 0.7 },
      { translate: '0 -6%', scale: '1.02', offset: 0.85 },
      { translate: '0 0', scale: '1' },
    ], { duration: 560, iterations: 3, delay: i * 40, easing: 'cubic-bezier(.3,.7,.4,1)' });
  });
  sfx.flip();
  setTimeout(() => sfx.flip(), 560);
  setTimeout(() => sfx.flip(), 1120);
  const t = inner(dst);
  if (t) setTimeout(() => {
    t.animate([
      { translate: '0 0', rotate: '0deg' },
      { translate: '0 -8%', rotate: '-4deg', offset: 0.3 },
      { translate: '0 0', rotate: '3deg', offset: 0.6 },
      { translate: '0 0', rotate: '0deg' },
    ], { duration: 480, iterations: 2, easing: 'ease-in-out' });
    sfx.place();
  }, 1700);
}

const canAutoFinish = () => S && !S.stock.length && !S.waste.length && S.tab.every(col => col.every(c => c.up)) && S.found.some(f => f.length < 13);
async function autoFinish() {
  if (busy) return;
  busy = true; autoBtn.hidden = true;
  while (!S.won) {
    let moved = false;
    let best = null;
    for (let ci = 0; ci < 7; ci++) {
      const c = top(S.tab[ci]); if (!c) continue;
      for (let i = 0; i < 4; i++) if (canFound(c, S.found[i]) && (!best || c.rank < best.c.rank)) best = { c, from: { t: 'tab', i: ci }, to: { t: 'f', i } };
    }
    if (best) { busy = false; doMove(best.from, best.to, 1); busy = true; moved = true; }
    if (!moved) break;
    await sleep(95);
  }
  busy = false;
}

// ---------- Zeit & Sieg ----------
function startTimer() {
  if (S.started) return;
  S.started = true;
  store.d.stats.sol.played++; store.save();
}
function tick() {
  if (!S || !S.started || S.won || document.hidden) return;
  if (!$('#screen-solitaire').hasAttribute('data-active')) return;
  S.time++;
  $('#sol-time').textContent = clock(S.time);
  if (S.time % 10 === 0) persist();
}
const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function checkWin() {
  if (S.won || !S.found.every(f => f.length === 13)) return;
  S.won = true;
  const bonus = S.time > 30 ? Math.round(700000 / S.time) : 0;
  S.score += bonus;
  const st = store.d.stats.sol;
  st.won++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
  if (!st.bestTime || S.time < st.bestTime) st.bestTime = S.time;
  st.bestScore = Math.max(st.bestScore, S.score);
  // Chip-Prämie: Grundbetrag plus Boni, sofort gutgeschrieben
  const reward = [['Sieg', 100]];
  if (S.time < 180) reward.push(['Unter 3 Minuten', 50]);
  if (!S.usedUndo) reward.push(['Ohne Zurück', 50]);
  if (S.draw3) reward.push(['3 Karten ziehen', 50]);
  const chips = reward.reduce((a, [, v]) => a + v, 0);
  store.d.balance += chips;
  st.chips = (st.chips || 0) + chips;
  store.d.solSave = null; store.save(true);
  updateBalance();
  unlock('sol_first');
  if (S.time < 180) unlock('sol_fast');
  if (S.draw3) unlock('sol_draw3');
  if (!S.usedUndo) unlock('sol_noundo');
  if (st.streak >= 3) unlock('sol_streak3');
  if (st.won >= 10) unlock('sol_ten');
  render();
  setTimeout(() => winShow(bonus, reward, chips), 500);
}

async function winShow(bonus, reward = [], chips = 0) {
  sfx.bigWin(); vibrate([30, 60, 30]);
  celebrate(true);
  setTimeout(() => batSwarm(10), 900);
  talk(S.time < 180 ? 'solFast' : 'solWin', 'love', 3);
  // Karten springen nacheinander von den Ablagestapeln und hüpfen mit Spur über den Tisch
  if (store.d.settings.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await sleep(700);
    const launches = [];
    for (let r = 12; r >= 0; r--) for (let fi = 0; fi < 4; fi++) {
      const c = S.found[fi][r];
      if (c) launches.push({ card: c, x: L.colX(3 + fi), y: L.y0, el: layer.elOf(c) });
    }
    mascotEl.classList.add('peek');
    await runCascade(table, launches, { cw: L.cw, ch: L.ch });
  } else await sleep(1400);
  const ov = document.createElement('div');
  ov.className = 'overlay-card';
  ov.innerHTML = `<h3>Gewonnen!</h3><p>${S.usedUndo ? 'Sauber sortiert.' : 'Ganz ohne Zurück. Beeindruckend.'}</p>
    <div class="stats-row"><div><b>${clock(S.time)}</b><span>Zeit</span></div><div><b>${S.moves}</b><span>Züge</span></div><div><b>${fmt(S.score)}</b><span>Punkte${bonus ? ' inkl. Zeitbonus' : ''}</span></div></div>
    ${chips ? `<div class="sol-reward"><b>+${fmt(chips)} Chips</b><span>${reward.map(([t, v]) => `${t} +${v}`).join(' · ')}</span></div>` : ''}
    <div class="row"><button class="btn primary" data-act="new">Neues Spiel</button></div>`;
  table.appendChild(ov);
  if (chips) toast(`+${fmt(chips)} Chips`, 'Prämie für den Solitaire-Sieg');
  ov.querySelector('[data-act=new]').addEventListener('click', () => { ov.remove(); startNew(); });
}

// ---------- Maskottchen ----------
let peekT = null;
function talk(key, mood, priority = 1) {
  if (!store.d.settings.mascotSol) return;
  mascotEl.classList.add('peek');
  clearTimeout(peekT);
  say(M, pick(key), { mood, priority });
  peekT = setTimeout(() => mascotEl.classList.remove('peek'), 4200);
}

// ---------- Neues Spiel ----------
async function startNew() {
  if (busy) return;
  table.querySelector('.overlay-card')?.remove();
  if (S && S.started && !S.won) { store.d.stats.sol.streak = 0; }
  busy = true;
  autoBtn._said = false;
  newGame();
  layer.clear();
  computeLayout();
  $('#sol-time').textContent = '0:00';
  // alle Karten auf den Stock, dann austeilen
  const all = [...S.tab.flat(), ...S.stock];
  all.forEach((c, i) => layer.place(c, { x: L.colX(0), y: L.y0, z: i, up: false, instant: true }));
  sfx.shuffle();
  await sleep(350);
  let d = 0;
  for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) {
    const c = S.tab[col][row];
    const { dn } = fanOffsets(S.tab[col]);
    const isTop = row === col;
    layer.place(c, { x: L.colX(col), y: L.ty + row * dn, z: 300 + col * 30 + row, up: false, delay: d * 38, dur: 360 });
    if (isTop) setTimeout(() => layer.place(c, { x: L.colX(col), y: L.ty + row * dn, z: 300 + col * 30 + row, up: true }), d * 38 + 330);
    setTimeout(() => sfx.deal(), d * 38);
    d++;
  }
  await sleep(d * 38 + 500);
  busy = false;
  render();
  persist();
}

// ---------- Init ----------
let inited = false;
export function enterSolitaire() {
  const first = !inited;
  if (!inited) {
    inited = true;
    mountMascot(mascotEl, M);
    const layerEl = $('#sol-cards');
    layerEl.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
    $('#sol-new').addEventListener('click', () => { sfx.tap(); talk('solNew', 'smug', 1); startNew(); });
    undoBtn.addEventListener('click', () => undo());
    $('#sol-hint').addEventListener('click', hint);
    autoBtn.addEventListener('click', autoFinish);
    setInterval(tick, 1000);
    new ResizeObserver(() => { if (table.clientWidth && S && !busy) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!$('#screen-solitaire').hasAttribute('data-active') || document.querySelector('.sheet.show')) return;
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey)) || e.key === 'u') { e.preventDefault(); undo(); }
      else if (e.key === ' ' ) { e.preventDefault(); drawStock(); }
      else if (e.key === 'h') hint();
    });
  }
  mascotEl.classList.toggle('away', !store.d.settings.mascotSol);
  computeLayout();
  if (first) {
    const sv = store.d.solSave;
    if (sv && sv.deck) { loadSave(sv); layer.clear(); render({ instant: true }); $('#sol-time').textContent = clock(S.time); setTimeout(() => talk('solResume', 'wink', 2), 700); }
    else { startNew(); setTimeout(() => talk('solEnter', 'smug', 2), 900); }
  } else {
    // Einstellung "3 Karten ziehen" greift beim nächsten Spiel
    render({ instant: true });
    setTimeout(() => talk('solEnter', 'smug', 1), 700);
  }
}

export function solitaireSettingChanged() {
  if (!S) return;
  mascotEl.classList.toggle('away', !store.d.settings.mascotSol);
  if (!S.started && S.draw3 !== store.d.settings.draw3) { S.draw3 = store.d.settings.draw3; render(); persist(); }
}
