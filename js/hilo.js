// Höher oder Tiefer gegen Kortomi — im Upgrade-Shop freischaltbar.
// Einsatz wählen, erste Karte liegt offen, dann raten. Jeder Treffer multipliziert den Gewinn
// (fair nach Wahrscheinlichkeit, mit kleinem Hausvorteil). Gleiche Karte zählt nicht. Daneben = Einsatz weg.
import { CardLayer, newDeck, shuffle, sleep } from './cards.js';
import { chipSVG } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock, chipValues } from './store.js';
import { mountMascot, say, setMood, jump } from './mascot.js';
import { celebrate } from './fx.js';
import { fmt, updateBalance } from './ui.js';

const M = 'hl';
const EDGE = 0.97, TRAIL = 6;
const $ = s => document.querySelector(s);
const table = $('#hl-table');
const layer = new CardLayer($('#hl-cards'));
const badges = $('#hl-badges');
const rack = $('#hl-rack');
const actions = $('#hl-actions');
const dealerSpot = $('#hl-dealer');

let deck = [], trail = [], current = null, deckCard = null;
let phase = 'idle'; // idle | playing | busy
let stake = 0, mult = 1, streak = 0;
let L = {};
let lastTag = null;

const LINES = {
  enter: ['Höher oder tiefer? Ganz einfach. Bis es nicht mehr einfach ist.', 'Ich zeig dir eine Karte. Du rätst. Ich lache.', 'Oh, du hast das Spiel gekauft? Wie süß. Setz dich.'],
  right: ['Hm. Glück gehabt.', 'Richtig. Schon wieder. Verdächtig.', 'Okay, okay. Noch eine?', 'Du liest wohl Gedanken?', 'Nicht schlecht für einen Menschen.'],
  wrong: ['Daneben! Hehehe.', 'Ach, wie schade. Für dich.', 'Die Karte mochte dich nicht.', 'Gier ist eine Todsünde. Und meine Lieblingssünde.', 'Und weg ist es.'],
  tie: ['Gleich! Zählt nicht. Nochmal.', 'Unentschieden. Langweilig.'],
  cash: ['Feigling! …Kluger Feigling.', 'Du nimmst es mit? Spielverderberin.', 'Na schön. Hier, deine Chips.'],
  big: ['WAS? Gib das sofort zurück!', 'Das ist Diebstahl! Legaler Diebstahl!'],
};
const line = k => { const a = LINES[k]; return a[Math.floor(Math.random() * a.length)]; };

// ---------- Wahrscheinlichkeiten ----------
function odds(rank) {
  const p = { up: (13 - rank) / 12, down: (rank - 1) / 12 };
  const f = q => (q <= 0 ? 0 : Math.max(1, Math.floor((EDGE / q) * 100) / 100));
  return { up: f(p.up), down: f(p.down) };
}
const fx = n => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function draw(up = true) {
  if (deck.length < 8) deck = shuffle(newDeck(2));
  const c = deck.pop(); c.up = up; return c;
}

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  let cw = Math.max(48, Math.min(W / 4.4, (H * 0.58) / 1.4, 150));
  const ch = cw * 1.4;
  const mh = Math.max(84, Math.min(H * 0.34, 210));
  const cx = W / 2 - cw / 2 + Math.min(cw * 0.4, W * 0.06);
  const cy = Math.max(mh * 0.55, (H - ch) / 2 - 6);
  L = { W, H, cw, ch, mh, cx, cy, deckX: W - cw - Math.max(12, W * 0.04), deckY: 14 };
  layer.setSize(cw, ch);
  dealerSpot.style.height = `${mh}px`; dealerSpot.style.width = `${mh * 0.8}px`;
}

function render({ instant = false } = {}) {
  if (!L.W) return;
  if (!deckCard) deckCard = { uid: 'hl-deck', face: '1S', rank: 1, suit: 'S', up: false };
  layer.place(deckCard, { x: L.deckX, y: L.deckY, r: 3, z: 1, up: false, instant: true });
  trail.forEach((c, i) => {
    const k = trail.length - i; // 1 = jüngste
    layer.place(c, { x: L.cx - L.cw * 0.62 - (k - 1) * L.cw * 0.24, y: L.cy + k * 4, r: -4 - k * 2, z: 50 - k, up: true, instant });
  });
  if (current) layer.place(current, { x: L.cx, y: L.cy, r: 0, z: 100, up: true, instant });
  renderBadge();
}

function renderBadge() {
  badges.querySelectorAll('.hand-badge').forEach(b => b.remove());
  if (!current || phase === 'idle') return;
  const b = document.createElement('div');
  b.className = 'hand-badge' + (streak ? ' active' : '');
  b.style.setProperty('--x', `${L.cx + L.cw / 2}px`);
  b.style.setProperty('--y', `${L.cy + L.ch + 20}px`);
  b.textContent = streak ? `×${fx(mult)} · ${fmt(Math.floor(stake * mult))}` : `Einsatz ${fmt(stake)}`;
  badges.appendChild(b);
}

function tag(text, sub, kind) {
  lastTag?.remove();
  const t = document.createElement('div');
  t.className = `result-tag ${kind}`;
  t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  t.style.setProperty('--x', `${L.cx + L.cw / 2}px`);
  t.style.setProperty('--y', `${L.cy + L.ch * 0.45}px`);
  badges.appendChild(t);
  lastTag = t;
}

// ---------- Einsatz (Chip wählen) ----------
function renderRack() {
  rack.innerHTML = '';
  rack.classList.toggle('hidden', phase !== 'idle');
  const sel = store.d.sideBet.hl;
  for (const v of chipValues()) {
    const b = document.createElement('button');
    b.className = 'chip-btn' + (v === sel ? ' sel' : '');
    b.innerHTML = chipSVG(v);
    b.setAttribute('aria-label', `Einsatz ${v}`);
    b.setAttribute('aria-pressed', v === sel);
    b.disabled = store.d.balance < v;
    b.addEventListener('click', () => { store.d.sideBet.hl = v; store.save(); sfx.chip(1); renderRack(); renderActions(); });
    rack.appendChild(b);
  }
}

function btn(label, cls, fn, { sub = '', disabled = false } = {}) {
  const b = document.createElement('button');
  b.className = `btn ${cls}`;
  b.innerHTML = `${label}${sub ? `<small>${sub}</small>` : ''}`;
  b.disabled = disabled;
  b.addEventListener('click', fn);
  actions.appendChild(b);
}

function renderActions() {
  actions.innerHTML = '';
  if (phase === 'idle' || !current) {
    const v = store.d.sideBet.hl;
    btn('Los geht’s', 'primary', start, { sub: `Einsatz ${fmt(v)}`, disabled: phase !== 'idle' || store.d.balance < v });
    return;
  }
  const o = odds(current.rank);
  const busy = phase !== 'playing';
  btn('▲ Höher', '', () => guess('up'), { sub: o.up ? `×${fx(o.up)}` : 'geht nicht', disabled: busy || !o.up });
  btn('▼ Tiefer', '', () => guess('down'), { sub: o.down ? `×${fx(o.down)}` : 'geht nicht', disabled: busy || !o.down });
  btn('Kassieren', 'gold', cashout, { sub: streak ? fmt(Math.floor(stake * mult)) : 'erst raten', disabled: busy || !streak });
}

// ---------- Ablauf ----------
async function sweep() {
  const old = [...trail, current].filter(Boolean);
  trail = []; current = null; lastTag?.remove(); lastTag = null;
  old.forEach((c, i) => layer.place(c, { x: -L.cw * 1.3, y: L.cy - L.ch * 0.2, r: -20, z: 60 + i, up: false, delay: i * 25, dur: 420 }));
  if (old.length) sfx.whoosh();
  setTimeout(() => old.forEach(c => layer.remove(c)), 520 + old.length * 25);
}

async function start() {
  const v = store.d.sideBet.hl;
  if (phase !== 'idle' || store.d.balance < v) { sfx.nope(); return; }
  store.d.balance -= v; store.d.pendingHl = v; store.save(true);
  stake = v; mult = 1; streak = 0;
  updateBalance(); sfx.chip(2); vibrate(6);
  phase = 'busy'; renderRack(); renderActions();
  sweep();
  await sleep(280);
  const c = draw(false);
  layer.place(c, { x: L.deckX, y: L.deckY, r: 3, z: 120, up: false, instant: true });
  await sleep(30);
  current = c; c.up = true;
  layer.place(c, { x: L.cx, y: L.cy, r: 0, z: 100, up: true, flySound: true });
  await sleep(400);
  phase = 'playing'; renderBadge(); renderActions();
  store.d.stats.hl.rounds++; store.save();
}

async function guess(dir) {
  if (phase !== 'playing') return;
  phase = 'busy'; renderActions(); sfx.tap();
  const o = odds(current.rank);
  const next = draw(false);
  layer.place(next, { x: L.deckX, y: L.deckY, r: 3, z: 120, up: false, instant: true });
  await sleep(30);
  // Alte Karte wandert in die Spur
  trail.push(current);
  if (trail.length > TRAIL) { const gone = trail.shift(); layer.remove(gone); }
  current = next; next.up = true;
  render();
  layer.place(next, { x: L.cx, y: L.cy, r: 0, z: 100, up: true, flySound: true });
  await sleep(460);
  const prev = trail[trail.length - 1].rank;
  if (next.rank === prev) {
    setMood(M, 'think', 1500);
    say(M, line('tie'), { mood: 'think', priority: 2 });
    phase = 'playing'; renderBadge(); renderActions();
    return;
  }
  const right = dir === 'up' ? next.rank > prev : next.rank < prev;
  if (right) {
    mult = Math.round(mult * o[dir] * 100) / 100;
    if (o[dir] > 1) streak++; // Sichere Tipps (×1,00) zählen nicht zur Serie
    sfx.chip(1); vibrate(8);
    const s = store.d.stats.hl; s.bestStreak = Math.max(s.bestStreak, streak);
    if (streak >= 5) unlock('hl_streak5');
    store.save();
    if (Math.random() < 0.45) say(M, line('right'), { mood: 'shock' });
    else setMood(M, 'shock', 1200);
    phase = 'playing'; renderBadge(); renderActions();
  } else {
    store.d.pendingHl = 0; store.save(true);
    phase = 'idle';
    $('#hl-cards').querySelector(`[data-uid="${next.uid}"]`)?.classList.add('shake');
    sfx.nope?.(); vibrate(20);
    tag('Daneben', `−${fmt(stake)}`, 'lose');
    jump(M); say(M, line('wrong'), { mood: 'happy', priority: 2 });
    renderBadge(); renderRack(); renderActions();
  }
}

function cashout() {
  if (phase !== 'playing' || !streak) return;
  const win = Math.floor(stake * mult);
  store.d.balance += win; store.d.pendingHl = 0;
  const s = store.d.stats.hl; s.cashouts++; s.biggestWin = Math.max(s.biggestWin, win - stake);
  if (mult >= 10) unlock('hl_x10');
  store.save(true);
  updateBalance(true); sfx.chip(4); sfx.sparkle();
  phase = 'idle';
  tag('Kassiert', `+${fmt(win)}`, mult >= 5 ? 'bj' : 'win');
  if (mult >= 5) { celebrate(mult >= 10); say(M, line('big'), { mood: 'shock', priority: 3 }); }
  else say(M, line('cash'), { mood: 'sad', priority: 2 });
  renderBadge(); renderRack(); renderActions();
}

// ---------- Einstieg ----------
let inited = false;
export function enterHilo() {
  if (!inited) {
    inited = true;
    mountMascot(dealerSpot, M);
    deck = shuffle(newDeck(2));
    new ResizeObserver(() => { if (table.clientWidth) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!document.getElementById('screen-hilo').hasAttribute('data-active') || document.querySelector('.sheet.show')) return;
      const k = e.key.toLowerCase();
      if (phase === 'idle' && (k === 'enter' || k === ' ')) { e.preventDefault(); start(); }
      else if (phase === 'playing' && (k === 'arrowup' || k === 'h')) { e.preventDefault(); guess('up'); }
      else if (phase === 'playing' && (k === 'arrowdown' || k === 't')) { e.preventDefault(); guess('down'); }
      else if (phase === 'playing' && (k === 'k' || k === 'enter')) { e.preventDefault(); cashout(); }
    });
  }
  computeLayout(); render({ instant: true }); renderRack(); renderActions();
  setTimeout(() => say(M, line('enter'), { mood: 'smug', priority: 2 }), 600);
}
