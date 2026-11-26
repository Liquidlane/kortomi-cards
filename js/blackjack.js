// Blackjack gegen Kortomi — 6 Decks, Dealer steht auf Soft 17, BJ 3:2, Double, Split bis 4 Hände, Versicherung.
import { CardLayer, newDeck, shuffle, sleep } from './cards.js';
import { chipSVG, chipSideSVG, chipBreakdown } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock, chipValues } from './store.js';
import { mountMascot, say, pick, setMood, jump } from './mascot.js';
import { celebrate, burst } from './fx.js';
import { fmt, updateBalance, toast } from './ui.js';
import { noteResult } from './streaks.js';
import { rescueIfBroke } from './rescue.js';

const DECKS = 6, MIN_BET = 5, MAX_BET = 5000, MAX_HANDS = 4, CUT = 0.25;
const M = 'bj';

const $ = s => document.querySelector(s);
const table = $('#bj-table');
const layer = new CardLayer($('#bj-cards'));
const badges = $('#bj-badges');
const betEl = $('#bj-bet');
const rack = $('#bj-rack');
const actions = $('#bj-actions');
const shoeEl = $('#bj-shoe');
const dealerSpot = $('#bj-dealer');

let shoe = [], shoeTotal = 0;
let phase = 'betting'; // betting | dealing | insurance | playing | dealer | settled
let bet = 0;            // Einsatz im Kreis (Betting-Phase)
let hands = [];         // {cards, bet, doubled, done, splitAces, result}
let active = 0;
let dealer = [];
let insurance = 0;
let busy = false;
let L = {};             // aktuelles Layout
let onTable = [];       // Karten, die noch auf dem Tisch liegen

// ---------- Hand-Werte ----------
export function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { if (c.rank === 1) { aces++; total += 11; } else total += Math.min(10, c.rank); }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isBJ = cards => cards.length === 2 && handValue(cards).total === 21;
const cardVal = c => c.rank === 1 ? 11 : Math.min(10, c.rank);

// ---------- Basisstrategie (6 Decks, S17, DAS) ----------
export function bookMove(cards, up, { canDouble, canSplit }) {
  const u = up.rank === 1 ? 11 : Math.min(10, up.rank);
  const { total, soft } = handValue(cards);
  if (canSplit && cards.length === 2 && cardVal(cards[0]) === cardVal(cards[1])) {
    const p = cardVal(cards[0]);
    const split = { 11: true, 10: false, 9: ![7, 10, 11].includes(u), 8: true, 7: u <= 7, 6: u <= 6, 5: false, 4: u === 5 || u === 6, 3: u <= 7, 2: u <= 7 }[p];
    if (split) return 'P';
  }
  const D = alt => (canDouble ? 'D' : alt);
  if (soft) {
    if (total >= 19) return 'S';
    if (total === 18) return u >= 3 && u <= 6 ? D('S') : u <= 8 ? 'S' : 'H';
    if (total === 17) return u >= 3 && u <= 6 ? D('H') : 'H';
    if (total >= 15) return u >= 4 && u <= 6 ? D('H') : 'H';
    return u >= 5 && u <= 6 ? D('H') : 'H';
  }
  if (total >= 17) return 'S';
  if (total >= 13) return u <= 6 ? 'S' : 'H';
  if (total === 12) return u >= 4 && u <= 6 ? 'S' : 'H';
  if (total === 11) return u <= 10 ? D('H') : 'H';
  if (total === 10) return u <= 9 ? D('H') : 'H';
  if (total === 9) return u >= 3 && u <= 6 ? D('H') : 'H';
  return 'H';
}
const MOVE_NAME = { H: 'ziehen', S: 'halten', D: 'verdoppeln', P: 'teilen' };

// ---------- Schuh ----------
function freshShoe() {
  shoe = shuffle(newDeck(DECKS)); shoeTotal = shoe.length;
  updateShoe();
}
function updateShoe() { shoeEl.querySelector('.shoe-fill').style.transform = `scaleY(${shoe.length / shoeTotal})`; }
function draw(up = true) { const c = shoe.pop(); c.up = up; updateShoe(); return c; }

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  let cw = Math.min(W / 5, (H - 30) / 5.25, 132);
  cw = Math.max(40, cw);
  const ch = cw * 1.4;
  const mh = Math.max(84, Math.min(Math.max(ch * 1.2, H * 0.25), 230));
  const betD = cw * 0.9;
  const dealerY = mh * 0.84;
  const betY = H - betD - 26;
  const playerY = Math.max(dealerY + ch + 34, betY - ch * 0.78);
  L = { W, H, cw, ch, mh, betD, dealerY, playerY, betY };
  layer.setSize(cw, ch);
  dealerSpot.style.height = `${mh}px`; dealerSpot.style.width = `${mh * 0.8}px`;
  // Auf schmalen Bildschirmen steht Kortomi links, damit die Sprechblase daneben Platz hat
  dealerSpot.style.left = W < 560 ? `${mh * 0.4 + 4}px` : '50%';
  Object.assign(shoeEl.style, { width: `${cw * 0.78}px`, height: `${ch * 0.62}px`, right: `${Math.max(10, W * 0.03)}px`, top: `${10}px` });
  Object.assign(betEl.style, { width: `${betD}px`, height: `${betD}px`, left: `${W / 2 - betD / 2}px`, top: `${betY}px` });
  L.shoeX = W - Math.max(10, W * 0.03) - cw * 0.89; L.shoeY = 10 - ch * 0.1;
}

function handPositions(cards, cx, y, off) {
  const w = L.cw + (cards.length - 1) * off;
  return cards.map((c, i) => ({ x: cx - w / 2 + i * off, y: y - (i % 2) * 2, r: c._r ?? (c._r = (Math.random() - .5) * 4) }));
}

function render({ instant = false } = {}) {
  const { W, cw, dealerY, playerY } = L;
  // Dealer
  const offD = cw * 0.5;
  handPositions(dealer, W / 2, dealerY, offD).forEach((p, i) => layer.place(dealer[i], { ...p, z: i + 1, instant }));
  // Spieler
  const n = Math.max(1, hands.length);
  const slot = Math.min(cw * 2.1, (W - 16) / n);
  const maxCards = Math.max(2, ...hands.map(h => h.cards.length));
  const off = Math.max(cw * 0.16, Math.min(cw * 0.42, (slot - cw - 10) / (maxCards - 1)));
  hands.forEach((h, hi) => {
    const cx = W / 2 + (hi - (n - 1) / 2) * slot;
    h._cx = cx;
    const lift = phase === 'playing' && hi === active && hands.length > 1 ? -10 : 0;
    handPositions(h.cards, cx, playerY + lift, off).forEach((p, i) => {
      const c = h.cards[i];
      layer.place(c, { ...p, r: h.doubled && i === 2 ? 90 : p.r, z: 10 + hi * 20 + i, instant });
    });
  });
  renderBadges();
}

function renderBadges() {
  badges.innerHTML = '';
  const { W, cw, ch, dealerY, playerY } = L;
  if (dealer.length) {
    const vis = dealer.filter(c => c.up);
    const v = handValue(vis);
    const allUp = vis.length === dealer.length;
    const label = allUp ? (isBJ(dealer) ? 'Blackjack' : v.total > 21 ? `${v.total} · überkauft` : softLabel(v)) : softLabel(v);
    badge(W / 2, dealerY + ch + 14, label, allUp && isBJ(dealer) ? 'bj' : v.total > 21 ? 'bust' : '');
  }
  hands.forEach((h, i) => {
    if (!h.cards.length) return;
    const v = handValue(h.cards);
    let label = isBJ(h.cards) && hands.length === 1 ? 'Blackjack' : v.total > 21 ? `${v.total} · überkauft` : softLabel(v, h.done);
    if (hands.length > 1) label += ` · ${fmt(h.bet)}`;
    const cls = [phase === 'playing' && i === active ? 'active' : '', v.total > 21 ? 'bust' : '', isBJ(h.cards) && hands.length === 1 ? 'bj' : ''].join(' ');
    badge(h._cx ?? W / 2, playerY - 16 - (phase === 'playing' && i === active && hands.length > 1 ? 10 : 0), label, cls);
    if (h.result) resultTag(h._cx ?? W / 2, playerY + ch * 0.62, h.result, h.payout);
  });
}
const softLabel = (v, done) => (v.soft && v.total < 21 && !done ? `${v.total - 10} / ${v.total}` : String(v.total));
function badge(x, y, text, cls) {
  const b = document.createElement('div');
  b.className = `hand-badge ${cls}`;
  b.textContent = text;
  b.style.setProperty('--x', `${x}px`); b.style.setProperty('--y', `${y}px`);
  badges.appendChild(b);
}
const RESULT_TEXT = { win: 'Gewonnen', lose: 'Verloren', push: 'Unentschieden', bj: 'Blackjack!', bust: 'Überkauft' };
function resultTag(x, y, res, payout) {
  const t = document.createElement('div');
  const cls = res === 'bust' ? 'lose' : res;
  t.className = `result-tag ${cls}`;
  const sub = payout > 0 ? `+${fmt(payout)}` : payout < 0 ? `−${fmt(-payout)}` : 'Einsatz zurück';
  t.innerHTML = `${RESULT_TEXT[res]}<small>${sub}</small>`;
  t.style.setProperty('--x', `${x}px`); t.style.setProperty('--y', `${y}px`);
  badges.appendChild(t);
}

// ---------- Einsatz & Chips ----------
function renderBet() {
  const total = phase === 'betting' ? bet : hands.reduce((s, h) => s + h.bet, 0);
  betEl.classList.toggle('empty', total === 0);
  betEl.querySelector('.bet-amount').textContent = total ? fmt(total) + (insurance ? ` + ${fmt(insurance)} Vers.` : '') : '';
  let stack = betEl.querySelector('.stack');
  if (!stack) { stack = document.createElement('div'); stack.className = 'stack'; betEl.appendChild(stack); }
  const chips = chipBreakdown(total).slice(0, 14).reverse();
  stack.innerHTML = chips.map((v, i) => `<div class="chip" style="top:${-i * 7 + 8}%;z-index:${i}">${i === chips.length - 1 ? chipSVG(v) : chipSideSVG(v)}</div>`).join('');
}

function renderRack() {
  rack.innerHTML = '';
  for (const v of chipValues()) {
    const b = document.createElement('button');
    b.className = 'chip-btn'; b.innerHTML = chipSVG(v);
    b.setAttribute('aria-label', `${v} setzen`);
    b.disabled = store.d.balance < v || bet + v > MAX_BET;
    b.addEventListener('click', () => addChip(v, b));
    rack.appendChild(b);
  }
}

async function sweepTable() {
  if (!onTable.length) return;
  const cards = onTable; onTable = [];
  badges.innerHTML = '';
  cards.forEach((c, i) => layer.place(c, { x: -L.cw * 1.2, y: L.dealerY - L.ch * 0.2, r: -20, z: 200 + i, up: false, delay: i * 25, dur: 420 }));
  sfx.whoosh();
  setTimeout(() => cards.forEach(c => layer.remove(c)), 500 + cards.length * 25);
  hands = []; dealer = [];
}

function addChip(v, from) {
  if (phase !== 'betting' && phase !== 'settled') return;
  if (phase === 'settled') toBetting(false);
  if (store.d.balance < v || bet + v > MAX_BET) { sfx.nope(); return; }
  if (onTable.length) sweepTable();
  store.d.balance -= v; bet += v; store.d.pendingBet = bet; store.save();
  updateBalance();
  flyChip(from.getBoundingClientRect(), betEl.getBoundingClientRect(), v);
  sfx.chip(1); vibrate(6);
  setTimeout(renderBet, 260);
  renderRack(); renderActions();
  if (bet >= 1000 && bet - v < 1000) say(M, pick('bjBigBet'), { mood: 'love' });
  else if (Math.random() < 0.12) say(M, pick('bjBet'), { mood: 'smug' });
}

function clearBet() {
  if (phase !== 'betting' || !bet) return;
  store.d.balance += bet; bet = 0; store.d.pendingBet = 0; store.save();
  updateBalance(); renderBet(); renderRack(); renderActions(); sfx.chip(3);
}

export function flyChip(fromRect, toRect, v, delay = 0) {
  const el = document.createElement('div');
  el.innerHTML = chipSVG(v);
  const size = Math.min(fromRect.width, 56);
  Object.assign(el.style, { position: 'fixed', zIndex: 65, width: `${size}px`, height: `${size}px`, left: `${fromRect.left + fromRect.width / 2 - size / 2}px`, top: `${fromRect.top + fromRect.height / 2 - size / 2}px`, pointerEvents: 'none' });
  document.body.appendChild(el);
  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
  const a = el.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px, ${dy * .5 - 40}px) scale(.9) rotate(180deg)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.7) rotate(360deg)`, opacity: .2 },
  ], { duration: 420, delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' });
  a.onfinish = () => el.remove();
}

// ---------- Aktionen ----------
function btn(label, cls, fn, { disabled = false, sub = '', key } = {}) {
  const b = document.createElement('button');
  b.className = `btn ${cls}`;
  b.innerHTML = sub ? `${label}<small>${sub}</small>` : label;
  b.disabled = disabled;
  if (key) b.dataset.key = key;
  b.addEventListener('click', () => { if (!busy) { sfx.tap(); fn(); } });
  actions.appendChild(b);
  return b;
}

function renderActions() {
  actions.innerHTML = '';
  rack.classList.toggle('hidden', !(phase === 'betting' || phase === 'settled'));
  if (phase === 'betting' || phase === 'settled') {
    if (phase === 'settled') {
      const can = store.d.lastBet <= store.d.balance;
      btn('Nochmal', 'primary', () => rebetAndDeal(), { disabled: !can, sub: can ? `${fmt(store.d.lastBet)} setzen` : 'zu wenig Chips', key: 'Enter' });
      btn('Neuer Einsatz', 'ghost', () => toBetting(false));
    } else {
      btn('Löschen', 'ghost', clearBet, { disabled: !bet, key: 'Backspace' });
      if (store.d.lastBet && !bet && store.d.balance >= store.d.lastBet) btn('Wie zuletzt', 'ghost', () => placeAmount(store.d.lastBet), { sub: fmt(store.d.lastBet) });
      else if (bet && store.d.balance >= bet && bet * 2 <= MAX_BET) btn('Verdoppeln', 'ghost', () => placeAmount(bet), { sub: `auf ${fmt(bet * 2)}` });
      btn('Geben', 'primary', deal, { disabled: bet < MIN_BET, key: 'Enter' });
    }
  } else if (phase === 'insurance') {
    const cost = Math.floor(hands[0].bet / 2);
    btn('Versichern', 'gold', () => resolveInsurance(true), { disabled: store.d.balance < cost, sub: fmt(cost) });
    btn('Nein danke', 'ghost', () => resolveInsurance(false));
  } else if (phase === 'playing') {
    const h = hands[active];
    const can = options(h);
    btn('Ziehen', 'primary', hit, { key: 'h' });
    btn('Halten', '', stand, { key: 's' });
    btn('Verdoppeln', 'gold', double, { disabled: !can.canDouble, key: 'd' });
    btn('Teilen', '', split, { disabled: !can.canSplit, key: 'p' });
  }
}

function options(h) {
  const two = h.cards.length === 2;
  return {
    canDouble: two && !h.splitAces && store.d.balance >= h.bet,
    canSplit: two && hands.length < MAX_HANDS && cardVal(h.cards[0]) === cardVal(h.cards[1]) && store.d.balance >= h.bet && !(h.splitAces),
  };
}

function placeAmount(amount) {
  if (store.d.balance < amount) { sfx.nope(); return; }
  if (onTable.length) sweepTable();
  store.d.balance -= amount; bet += amount; store.d.pendingBet = bet; store.save();
  updateBalance(); sfx.chip(chipBreakdown(amount).length);
  flyChip(rack.getBoundingClientRect(), betEl.getBoundingClientRect(), chipBreakdown(amount)[0] || 5);
  setTimeout(renderBet, 260); renderRack(); renderActions();
}

function rebetAndDeal() {
  const amt = store.d.lastBet;
  toBetting(false);
  placeAmount(amt);
  setTimeout(deal, 300);
}

function toBetting(prefill = false) {
  phase = 'betting'; bet = 0; insurance = 0;
  if (prefill && store.d.lastBet <= store.d.balance) placeAmount(store.d.lastBet);
  renderBet(); renderRack(); renderActions();
}

// ---------- Spielablauf ----------
async function deal() {
  if (busy || bet < MIN_BET) return;
  busy = true;
  await sweepTable();
  if (shoe.length < shoeTotal * CUT) {
    say(M, pick('bjShuffle'), { mood: 'think', priority: 2 });
    freshShoe(); sfx.shuffle(); await sleep(900);
  }
  store.d.lastBet = bet;
  hands = [{ cards: [], bet, doubled: false, done: false, splitAces: false, result: null, payout: 0 }];
  bet = 0; active = 0; dealer = []; insurance = 0;
  phase = 'dealing';
  renderActions(); renderBet();
  const seq = [[hands[0].cards, true], [dealer, true], [hands[0].cards, true], [dealer, false]];
  for (const [arr, up] of seq) {
    const c = draw(false);
    arr.push(c); onTable.push(c);
    layer.place(c, { x: L.shoeX, y: L.shoeY, r: 0, z: 300, up: false, instant: true });
    await sleep(30);
    c.up = up;
    render(); sfx.deal();
    await sleep(330);
  }
  const s = store.d.stats.bj;
  const up = dealer[0];
  const pBJ = isBJ(hands[0].cards);
  // Versicherung anbieten
  if (up.rank === 1 && !pBJ && store.d.balance >= Math.floor(hands[0].bet / 2) && Math.floor(hands[0].bet / 2) > 0) {
    phase = 'insurance'; busy = false;
    say(M, pick('bjInsurance'), { mood: 'smug', priority: 2 });
    renderActions();
    return;
  }
  await afterInsurance();
}

async function resolveInsurance(take) {
  if (phase !== 'insurance') return;
  busy = true;
  if (take) {
    insurance = Math.floor(hands[0].bet / 2);
    store.d.balance -= insurance; store.d.pendingBet = hands[0].bet + insurance; store.save();
    updateBalance(); sfx.chip(2); renderBet();
  }
  phase = 'dealing'; renderActions();
  await afterInsurance();
}

async function afterInsurance() {
  const up = dealer[0];
  const pBJ = isBJ(hands[0].cards);
  // Dealer schaut nach Blackjack
  if (up.rank === 1 || cardVal(up) === 10) {
    setMood(M, 'think');
    await sleep(650);
    if (isBJ(dealer)) {
      dealer[1].up = true; render(); await sleep(450);
      if (insurance) { store.d.balance += insurance * 3; unlock('bj_insured'); say(M, pick('bjInsured'), { mood: 'sad', priority: 3 }); }
      else say(M, pick('bjDealerBJ'), { mood: 'happy', priority: 3 });
      hands[0].done = true;
      return settle();
    }
    if (insurance) { say(M, pick('bjInsLost'), { mood: 'smug', priority: 2 }); insurance = 0; renderBet(); }
    else if (up.rank === 1) say(M, pick('bjNoBJ'), { mood: 'idle', priority: 1 });
    setMood(M, 'idle');
  }
  if (pBJ) {
    hands[0].done = true;
    dealer[1].up = true; render(); await sleep(400);
    say(M, pick('bjPlayerBJ'), { mood: 'shock', priority: 3 });
    return settle();
  }
  phase = 'playing'; busy = false;
  render(); renderActions();
  maybeAutoAdvance();
}

function maybeAutoAdvance() {
  const h = hands[active];
  if (!h) return;
  const v = handValue(h.cards).total;
  if (h.done || v >= 21) { if (!h.done) h.done = true; nextHand(); }
}

function checkBook(move) {
  if (!store.d.settings.tips) return;
  const h = hands[active];
  const book = bookMove(h.cards, dealer[0], options(h));
  if (book !== move) say(M, pick('bjDeviate', { a: MOVE_NAME[book] }), { mood: 'smug', priority: 1 });
}

async function hit() {
  if (phase !== 'playing' || busy) return;
  const h = hands[active];
  const before = handValue(h.cards).total;
  checkBook('H');
  busy = true;
  if (before >= 17 && !handValue(h.cards).soft) say(M, pick('bjHitHigh', { n: before }), { mood: 'shock', priority: 2 });
  await dealTo(h);
  const v = handValue(h.cards).total;
  busy = false;
  if (v > 21) {
    h.done = true; sfx.lose(); vibrate(30);
    say(M, pick('bjBust'), { mood: 'happy', priority: 2 });
    render(); await sleep(500); nextHand();
  } else if (v === 21) { h.done = true; render(); await sleep(350); nextHand(); }
  else { render(); renderActions(); }
}

async function dealTo(h) {
  const c = draw(false);
  h.cards.push(c); onTable.push(c);
  layer.place(c, { x: L.shoeX, y: L.shoeY, r: 0, z: 300, up: false, instant: true });
  await sleep(20);
  c.up = true; render(); sfx.deal();
  await sleep(360);
}

function stand() {
  if (phase !== 'playing' || busy) return;
  const h = hands[active];
  const v = handValue(h.cards);
  checkBook('S');
  if (v.total < 12 && Math.random() < .7) say(M, pick('bjStandLow', { n: v.total }), { mood: 'smug', priority: 2 });
  h.done = true; nextHand();
}

async function double() {
  if (phase !== 'playing' || busy) return;
  const h = hands[active];
  if (!options(h).canDouble) return;
  checkBook('D');
  busy = true;
  store.d.balance -= h.bet; h.bet *= 2; h.doubled = true;
  store.d.pendingBet = hands.reduce((s, x) => s + x.bet, 0) + insurance; store.save();
  updateBalance(); renderBet(); sfx.chip(3);
  if (Math.random() < .5) say(M, pick('bjDouble'), { mood: 'shock', priority: 1 });
  await dealTo(h);
  h.done = true; busy = false;
  if (handValue(h.cards).total > 21) { sfx.lose(); say(M, pick('bjBust'), { mood: 'happy', priority: 2 }); }
  render(); await sleep(400); nextHand();
}

async function split() {
  if (phase !== 'playing' || busy) return;
  const h = hands[active];
  if (!options(h).canSplit) return;
  checkBook('P');
  busy = true;
  store.d.balance -= h.bet;
  store.d.stats.bj.splits = (store.d.stats.bj.splits || 0) + 1;
  const aces = h.cards[0].rank === 1;
  const nh = { cards: [h.cards.pop()], bet: h.bet, doubled: false, done: false, splitAces: aces, result: null, payout: 0, fromSplit: true };
  h.splitAces = aces; h.fromSplit = true;
  hands.splice(active + 1, 0, nh);
  store.d.pendingBet = hands.reduce((s, x) => s + x.bet, 0) + insurance; store.save();
  updateBalance(); renderBet(); sfx.chip(2);
  say(M, pick('bjSplit'), { mood: 'think', priority: 1 });
  render(); await sleep(380);
  await dealTo(h);
  if (aces) {
    await dealTo(nh);
    h.done = true; nh.done = true;
    busy = false; return nextHand();
  }
  busy = false; render(); renderActions();
  maybeAutoAdvance();
}

function nextHand() {
  while (active < hands.length && hands[active].done) {
    active++;
    if (active < hands.length) {
      const h = hands[active];
      if (h.cards.length === 1) {
        // zweite Karte für die Split-Hand
        busy = true;
        dealTo(h).then(() => {
          busy = false;
          if (h.splitAces || handValue(h.cards).total === 21) h.done = true;
          render(); renderActions();
          if (h.done) nextHand();
        });
        return;
      }
    }
  }
  if (active >= hands.length) return dealerTurn();
  render(); renderActions();
}

async function dealerTurn() {
  phase = 'dealer'; busy = true; renderActions();
  await sleep(250);
  dealer[1].up = true; render(); sfx.flip();
  await sleep(600);
  const live = hands.some(h => handValue(h.cards).total <= 21);
  if (live) {
    setMood(M, 'think');
    while (handValue(dealer).total < 17) {
      const c = draw(false); dealer.push(c); onTable.push(c);
      layer.place(c, { x: L.shoeX, y: L.shoeY, r: 0, z: 300, up: false, instant: true });
      await sleep(20); c.up = true; render(); sfx.deal();
      await sleep(620);
    }
  }
  settle();
}

function settle() {
  phase = 'settled';
  const s = store.d.stats.bj;
  const d = handValue(dealer);
  const dBJ = isBJ(dealer);
  let net = 0, returned = 0, wins = 0, losses = 0, pushes = 0;
  const single = hands.length === 1;
  for (const h of hands) {
    const v = handValue(h.cards).total;
    const pBJ = single && isBJ(h.cards);
    let res, ret = 0;
    if (pBJ && !dBJ) { res = 'bj'; ret = h.bet * 2.5; }
    else if (pBJ && dBJ) { res = 'push'; ret = h.bet; }
    else if (v > 21) res = 'bust';
    else if (dBJ) res = 'lose';
    else if (d.total > 21 || v > d.total) { res = 'win'; ret = h.bet * 2; }
    else if (v === d.total) { res = 'push'; ret = h.bet; }
    else res = 'lose';
    ret = Math.floor(ret);
    h.result = res; h.payout = ret - h.bet;
    returned += ret; net += ret - h.bet;
    if (res === 'win' || res === 'bj') wins++; else if (res === 'push') pushes++; else losses++;
    s.hands++;
    if (res === 'bj') { s.blackjacks++; unlock('bj_natural'); }
    if (res === 'bust') s.busts++;
    if ((res === 'win') && h.doubled) unlock('bj_double');
    if ((res === 'win') && h.cards.length >= 5) { unlock('bj_charlie'); }
    if (h.bet >= 1000) unlock('bj_highroller');
  }
  if (hands.length >= 2 && hands.every(h => h.result === 'win')) unlock('bj_split');
  if (d.total > 21) { s.dealerBusts++; if (s.dealerBusts >= 25) unlock('bj_dealerbust'); }
  s.wins += wins; s.losses += losses; s.pushes += pushes;
  if (wins && !losses) { s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); if (s.streak >= 5) unlock('bj_streak5'); }
  else if (losses) s.streak = 0;
  if (net > s.biggestWin) s.biggestWin = net;
  store.d.balance += returned;
  store.d.pendingBet = 0;
  s.peak = Math.max(s.peak, store.d.balance);
  if (store.d.balance >= 10000) unlock('bj_rich');
  unlock('bj_first');
  store.save();
  noteResult('bj', net > 0 ? 'win' : net < 0 ? 'loss' : 'push', net);

  render();
  renderBet();
  // Chips fliegen
  const betRect = betEl.getBoundingClientRect();
  const dealerRect = dealerSpot.getBoundingClientRect();
  const pill = document.querySelector('#screen-blackjack .balance-pill').getBoundingClientRect();
  if (returned > 0) {
    chipBreakdown(Math.max(5, net)).slice(0, 6).forEach((v, i) => net > 0 && flyChip(dealerRect, betRect, v, i * 60));
    setTimeout(() => chipBreakdown(returned).slice(0, 8).forEach((v, i) => flyChip(betRect, pill, v, i * 50)), net > 0 ? 450 : 100);
    setTimeout(() => { updateBalance(true); sfx.chip(4); }, 700);
  } else {
    chipBreakdown(hands.reduce((a, h) => a + h.bet, 0)).slice(0, 6).forEach((v, i) => flyChip(betRect, dealerRect, v, i * 50));
    updateBalance();
  }
  setTimeout(() => { betEl.querySelector('.stack').innerHTML = ''; betEl.querySelector('.bet-amount').textContent = ''; betEl.classList.add('empty'); }, 200);

  // Reaktion
  const anyBJ = hands.some(h => h.result === 'bj');
  if (net > 0) {
    const big = net >= 500 || anyBJ;
    big ? sfx.bigWin() : sfx.win();
    vibrate([20, 40, 20]);
    celebrate(big);
    if (!anyBJ) {
      if (d.total > 21) say(M, pick('bjDealerBust'), { mood: 'sad', priority: 2 });
      else if (s.streak >= 3) say(M, pick('bjStreak', { n: s.streak }), { mood: 'shock', priority: 2 });
      else if (hands.some(h => h.result === 'win' && h.cards.length >= 5)) say(M, pick('bjFiveCard'), { mood: 'shock', priority: 2 });
      else say(M, pick(net >= 500 ? 'bjBigWin' : 'bjWin'), { mood: 'sad', priority: 2 });
    }
  } else if (net < 0) {
    sfx.lose();
    if (!hands.every(h => h.result === 'bust')) say(M, pick('bjLose'), { mood: 'happy', priority: 2 });
    if (hands.every(h => h.result === 'lose' || h.result === 'bust')) jump(M);
  } else { sfx.push(); say(M, pick('bjPush'), { mood: 'idle', priority: 2 }); }

  // Pleite?
  rescueIfBroke(M, () => { renderActions(); renderRack(); }, 1600);

  busy = false;
  renderRack(); renderActions();
}

// ---------- Tipp ----------
function hint() {
  sfx.tap();
  if (phase === 'playing') {
    const h = hands[active];
    const m = bookMove(h.cards, dealer[0], options(h));
    say(M, pick('bjTipBook', { a: MOVE_NAME[m] }), { mood: 'wink', priority: 3 });
    const label = { H: 'Ziehen', S: 'Halten', D: 'Verdoppeln', P: 'Teilen' }[m];
    [...actions.children].forEach(b => { if (b.textContent.startsWith(label)) { b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 500, iterations: 2 }); } });
  } else if (phase === 'insurance') say(M, pick('bjTipIns'), { mood: 'wink', priority: 3 });
  else say(M, pick('bjTipBet'), { mood: 'wink', priority: 3 });
}

// ---------- Init ----------
let inited = false;
export function enterBlackjack() {
  if (!inited) {
    inited = true;
    mountMascot(dealerSpot, M);
    freshShoe();
    betEl.addEventListener('click', clearBet);
    $('#bj-hint').addEventListener('click', hint);
    new ResizeObserver(() => { if (table.clientWidth) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!document.getElementById('screen-blackjack').hasAttribute('data-active') || document.querySelector('.sheet.show')) return;
      const b = [...actions.querySelectorAll('[data-key]')].find(b => b.dataset.key.toLowerCase() === e.key.toLowerCase());
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    });
    toBetting(true);
  }
  computeLayout(); render({ instant: true }); renderRack(); renderActions(); renderBet();
  if (rescueIfBroke(M, () => { renderRack(); renderActions(); }, 700)) return;
  setTimeout(() => say(M, pick('bjEnter'), { mood: 'smug', priority: 2 }), 600);
}
export function leaveBlackjack() { }
