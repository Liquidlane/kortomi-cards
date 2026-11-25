// Video-Poker (Jacks or Better) bei Kortomi — im Upgrade-Shop freischaltbar.
// Einsatz wählen, fünf Karten, beliebige halten, einmal nachziehen. Ausgezahlt wird nach Tabelle (Einsatz × Faktor).
import { CardLayer, newDeck, shuffle, sleep } from './cards.js';
import { chipSVG } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock, chipValues } from './store.js';
import { mountMascot, say, setMood, jump, pick, pickLocal } from './mascot.js';
import { celebrate } from './fx.js';
import { fmt, updateBalance } from './ui.js';
import { noteResult } from './streaks.js';

const M = 'vp';
const $ = s => document.querySelector(s);
const table = $('#vp-table');
const cardsEl = $('#vp-cards');
const layer = new CardLayer(cardsEl);
const badges = $('#vp-badges');
const rack = $('#vp-rack');
const actions = $('#vp-actions');
const payEl = $('#vp-pay');
const dealerSpot = $('#vp-dealer');

export const PAY = [
  ['royal', 'Royal Flush', 250], ['sflush', 'Straight Flush', 50], ['quads', 'Vierling', 25],
  ['full', 'Full House', 9], ['flush', 'Flush', 6], ['straight', 'Straße', 4],
  ['trips', 'Drilling', 3], ['twopair', 'Zwei Paare', 2], ['jacks', 'Buben oder besser', 1],
];
const PAY_OF = Object.fromEntries(PAY.map(([k, n, m]) => [k, { name: n, mult: m }]));

let deck = [], hand = [], held = [false, false, false, false, false];
let phase = 'idle'; // idle | hold | busy
let stake = 0, lastResult = null;
let L = {};
let lastTag = null;

const LINES = {
  enter: ['Video-Poker. Keine Mimik, kein Bluff. Nur du, ich und die Mathematik.', 'Buben oder besser. Also besser als du, hihi.', 'Halt, was du magst. Wirf weg, was du hasst.'],
  win: ['Na gut, das zählt.', 'Hmpf. Ausgezahlt.', 'Nicht übel.'],
  lose: ['Nichts. Absolut nichts. Herrlich.', 'Die Karten haben gesprochen. Sie sagen „nein“.', 'Oh je. Nochmal?'],
  big: ['Das… das darf nicht wahr sein!', 'WER hat diese Karten gemischt?!'],
  royal: ['ROYAL FLUSH?! Ich kündige!'],
};
const line = k => pickLocal('vp', LINES, k);

// ---------- Auswertung ----------
export function evaluate(cards) {
  const rs = cards.map(c => c.rank).sort((a, b) => a - b);
  const counts = {}; rs.forEach(r => (counts[r] = (counts[r] || 0) + 1));
  const vals = Object.values(counts).sort((a, b) => b - a);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const uniq = new Set(rs).size === 5;
  const broadway = uniq && rs.join() === '1,10,11,12,13';
  const straight = uniq && (rs[4] - rs[0] === 4 || broadway);
  if (flush && broadway) return 'royal';
  if (flush && straight) return 'sflush';
  if (vals[0] === 4) return 'quads';
  if (vals[0] === 3 && vals[1] === 2) return 'full';
  if (flush) return 'flush';
  if (straight) return 'straight';
  if (vals[0] === 3) return 'trips';
  if (vals[0] === 2 && vals[1] === 2) return 'twopair';
  if (vals[0] === 2) { const pr = +Object.keys(counts).find(k => counts[k] === 2); if (pr === 1 || pr >= 11) return 'jacks'; }
  return null;
}

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  const gap = Math.max(6, W * 0.015);
  let cw = Math.max(44, Math.min((W - 24 - gap * 4) / 5, (H * 0.46) / 1.4, 132));
  const ch = cw * 1.4;
  const mh = Math.max(76, Math.min(H * 0.3, 180));
  const rowW = cw * 5 + gap * 4;
  const x0 = (W - rowW) / 2;
  const y = H - ch - 40;
  L = { W, H, cw, ch, mh, gap, x0, y, deckX: W - cw * 0.8 - 10, deckY: -ch * 0.9 };
  layer.setSize(cw, ch);
  dealerSpot.style.height = `${mh}px`; dealerSpot.style.width = `${mh * 0.8}px`;
  payEl.style.left = `${mh * 0.8 + 10}px`;
  payEl.style.maxHeight = `${Math.max(60, y - 22)}px`;
}
const slotX = i => L.x0 + i * (L.cw + L.gap);

function render({ instant = false } = {}) {
  if (!L.W) return;
  hand.forEach((c, i) => layer.place(c, { x: slotX(i), y: L.y - (held[i] ? Math.min(16, L.ch * 0.1) : 0), r: 0, z: 10 + i, up: c.up, instant }));
  hand.forEach((c, i) => layer.elOf(c)?.classList.toggle('held', held[i]));
  renderBadges();
}

function renderBadges() {
  badges.querySelectorAll('.hold-tag').forEach(b => b.remove());
  if (phase !== 'hold') return;
  hand.forEach((c, i) => {
    const b = document.createElement('div');
    b.className = 'hand-badge hold-tag' + (held[i] ? ' active' : '');
    b.textContent = held[i] ? 'Halten' : 'Tippen';
    b.style.setProperty('--x', `${slotX(i) + L.cw / 2}px`);
    b.style.setProperty('--y', `${L.y + L.ch + 18}px`);
    badges.appendChild(b);
  });
}

function renderPay(hit = null) {
  const bet = phase === 'idle' ? store.d.sideBet.vp : stake;
  payEl.innerHTML = PAY.map(([k, n, m]) => `<div class="pay-row ${k === hit ? 'hit' : ''}"><span>${n}</span><b>${fmt(m * bet)}</b></div>`).join('');
}

function tag(text, sub, kind) {
  lastTag?.remove();
  const t = document.createElement('div');
  t.className = `result-tag ${kind}`;
  t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  t.style.setProperty('--x', `${L.W / 2}px`);
  t.style.setProperty('--y', `${L.y + L.ch * 0.45}px`);
  badges.appendChild(t);
  lastTag = t;
}

// ---------- Einsatz ----------
function renderRack() {
  rack.innerHTML = '';
  rack.classList.toggle('hidden', phase !== 'idle');
  const sel = store.d.sideBet.vp;
  for (const v of chipValues()) {
    const b = document.createElement('button');
    b.className = 'chip-btn' + (v === sel ? ' sel' : '');
    b.innerHTML = chipSVG(v);
    b.setAttribute('aria-label', `Einsatz ${v}`);
    b.setAttribute('aria-pressed', v === sel);
    b.disabled = store.d.balance < v;
    b.addEventListener('click', () => { store.d.sideBet.vp = v; store.save(); sfx.chip(1); renderRack(); renderActions(); renderPay(); });
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
  if (phase === 'idle' || (phase === 'busy' && !hand.some(c => c.up))) {
    const v = store.d.sideBet.vp;
    btn('Geben', 'primary', deal, { sub: `Einsatz ${fmt(v)}`, disabled: phase !== 'idle' || store.d.balance < v });
  } else {
    const n = held.filter(h => !h).length;
    btn('Ziehen', 'primary', drawCards, { sub: n ? `${n} neue Karte${n === 1 ? '' : 'n'}` : 'alle halten', disabled: phase !== 'hold' });
  }
}

// ---------- Ablauf ----------
function sweep() {
  const old = hand; hand = []; held = [false, false, false, false, false];
  lastTag?.remove(); lastTag = null;
  old.forEach((c, i) => layer.place(c, { x: -L.cw * 1.3, y: L.y - L.ch * 0.3, r: -20, z: 60 + i, up: false, delay: i * 25, dur: 420 }));
  if (old.length) sfx.whoosh();
  setTimeout(() => old.forEach(c => layer.remove(c)), 520 + old.length * 25);
}

function fromDeck(c, z) {
  layer.place(c, { x: L.deckX, y: L.deckY, r: 10, z, up: false, instant: true });
}

async function deal() {
  const v = store.d.sideBet.vp;
  if (phase !== 'idle' || store.d.balance < v) { sfx.nope(); return; }
  store.d.balance -= v; store.d.pendingVp = v; store.save(true);
  stake = v; updateBalance(); sfx.chip(2); vibrate(6);
  phase = 'busy'; renderRack(); renderActions(); renderPay();
  sweep();
  await sleep(300);
  deck = shuffle(newDeck(1));
  hand = Array.from({ length: 5 }, () => { const c = deck.pop(); c.up = false; return c; });
  hand.forEach((c, i) => fromDeck(c, 20 + i));
  await sleep(30);
  for (let i = 0; i < 5; i++) {
    hand[i].up = true;
    layer.place(hand[i], { x: slotX(i), y: L.y, r: 0, z: 10 + i, up: true, flySound: true, delay: i * 90 });
  }
  await sleep(5 * 90 + 380);
  phase = 'hold';
  const pre = evaluate(hand);
  renderPay(pre); renderBadges(); renderActions();
  if (pre && PAY_OF[pre].mult >= 9) say(M, pick('vpTease'), { mood: 'shock', priority: 2 });
}

function toggleHold(i) {
  if (phase !== 'hold') return;
  held[i] = !held[i];
  sfx.place?.(); vibrate(5);
  render(); renderActions();
}

async function drawCards() {
  if (phase !== 'hold') return;
  phase = 'busy'; renderActions(); renderBadges();
  const out = [];
  for (let i = 0; i < 5; i++) {
    if (held[i]) continue;
    const old = hand[i];
    out.push(old);
    layer.place(old, { x: -L.cw * 1.3, y: L.y - L.ch * 0.3, r: -20, z: 60 + i, up: false, dur: 380, delay: out.length * 40 });
    const c = deck.pop(); c.up = false; hand[i] = c; fromDeck(c, 30 + i);
  }
  if (out.length) { sfx.whoosh(); setTimeout(() => out.forEach(c => layer.remove(c)), 700); }
  await sleep(260);
  let k = 0;
  for (let i = 0; i < 5; i++) {
    if (held[i]) continue;
    hand[i].up = true;
    layer.place(hand[i], { x: slotX(i), y: L.y, r: 0, z: 10 + i, up: true, flySound: true, delay: k++ * 90 });
  }
  hand.forEach((c, i) => {
    if (!held[i]) return;
    layer.elOf(c)?.classList.remove('held');
    layer.place(c, { x: slotX(i), y: L.y, r: 0, z: 10 + i, up: true });
  });
  held = [false, false, false, false, false];
  await sleep(k * 90 + 420);
  settle();
}

function settle() {
  const res = evaluate(hand);
  const s = store.d.stats.vp; s.hands++;
  store.d.pendingVp = 0;
  phase = 'idle';
  renderPay(res);
  if (res) {
    const p = PAY_OF[res], win = stake * p.mult;
    store.d.balance += win; s.wins++;
    s.biggestWin = Math.max(s.biggestWin, win - stake);
    const rank = PAY.findIndex(x => x[0] === res);
    if (!s.best || rank < PAY.findIndex(x => x[0] === s.best)) s.best = res;
    if (res === 'quads') unlock('vp_quads');
    if (res === 'royal') unlock('vp_royal');
    updateBalance(true);
    hand.forEach(c => layer.elOf(c)?.classList.add('win'));
    tag(p.name, `+${fmt(win)}`, p.mult >= 9 ? 'bj' : p.mult === 1 ? 'push' : 'win');
    if (p.mult >= 25) { celebrate(true); sfx.bigWin(); say(M, line(res === 'royal' ? 'royal' : 'big'), { mood: 'shock', priority: 3 }); }
    else if (p.mult >= 4) { celebrate(false); sfx.win(); say(M, line('big'), { mood: 'shock', priority: 2 }); }
    else { sfx.win(); if (p.mult > 1 && Math.random() < 0.5) say(M, line('win'), { mood: 'sad' }); }
  } else {
    sfx.lose(); tag('Nichts', `−${fmt(stake)}`, 'lose');
    if (Math.random() < 0.5) { jump(M); say(M, line('lose'), { mood: 'happy' }); } else setMood(M, 'smug', 1400);
  }
  store.save(true);
  noteResult('vp', !res ? 'loss' : PAY_OF[res].mult > 1 ? 'win' : 'push', res ? stake * (PAY_OF[res].mult - 1) : stake);
  renderRack(); renderActions();
}

// ---------- Einstieg ----------
let inited = false;
export function enterPoker() {
  if (!inited) {
    inited = true;
    mountMascot(dealerSpot, M);
    cardsEl.addEventListener('click', e => {
      const el = e.target.closest('.card'); if (!el) return;
      const i = hand.findIndex(c => c.uid === el.dataset.uid);
      if (i >= 0) toggleHold(i);
    });
    new ResizeObserver(() => { if (table.clientWidth) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!document.getElementById('screen-poker').hasAttribute('data-active') || document.querySelector('.sheet.show')) return;
      if (/^[1-5]$/.test(e.key)) { toggleHold(+e.key - 1); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); phase === 'idle' ? deal() : drawCards(); }
    });
  }
  computeLayout(); render({ instant: true }); renderRack(); renderActions(); renderPay();
  setTimeout(() => say(M, line('enter'), { mood: 'smug', priority: 2 }), 600);
}
