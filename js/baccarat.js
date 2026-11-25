// Baccarat (Punto Banco) bei Kortomi — im Upgrade-Shop freischaltbar.
// Wetten auf Spieler, Bank oder Unentschieden. 8-Deck-Schuh, dritte Karte nach fester Tabelle (js/baccarat-rules.js).
// Variante ohne Kommission: Spieler 1:1, Bank 1:1 (gewinnt die Bank mit 6: nur 1:2), Unentschieden 8:1.
import { CardLayer, newDeck, shuffle, sleep } from './cards.js';
import { chipSVG, chipSideSVG, chipBreakdown } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock, chipValues } from './store.js';
import { mountMascot, say, setMood, jump, pickLocal, dealer } from './mascot.js';
import { celebrate } from './fx.js';
import { fmt, updateBalance } from './ui.js';
import { maybeTutorial, helpButton } from './tutorial.js';
import { playRound, handTotal, payout } from './baccarat-rules.js';
import { noteResult } from './streaks.js';

const M = 'bac';
const DECKS = 8, RESHUFFLE = 16, MAX_SPOT = 5000, ROAD = 36;
const SIDES = ['P', 'T', 'B'];
const NAME = { P: 'Spieler', B: 'Bank', T: 'Unentschieden' };
const $ = s => document.querySelector(s);
const table = $('#bac-table');
const cardsEl = $('#bac-cards');
const layer = new CardLayer(cardsEl);
const badges = $('#bac-badges');
const rack = $('#bac-rack');
const actions = $('#bac-actions');
const spotsEl = $('#bac-spots');
const roadEl = $('#bac-road');
const dealerSpot = $('#bac-dealer');

let shoe = [], seq = 0;
let phase = 'bet'; // bet | deal
let bets = { P: 0, T: 0, B: 0 };
let onTable = { P: [], B: [] }, result = null;
let L = {};
let lastTag = null;

const LINES = {
  enter: ['Baccarat. Das Spiel der Reichen. Du darfst trotzdem mitspielen.', 'Spieler oder Bank? Such dir aus, wem du vertraust. Tipp: nicht mir.', 'Hier entscheidest du gar nichts. Nur wohin dein Geld geht. Hehe.'],
  bet: ['Mutig.', 'Notiert.', 'Klimper, klimper.', 'Bist du sicher? …Egal, ich nehm’s.'],
  tieBet: ['Auf Unentschieden? Du bist ja eine Spielerin!', 'Acht zu eins. Träum weiter.'],
  natural: ['Natural! Keine weitere Karte.', 'Acht oder neun gleich am Anfang. Tja.'],
  third: ['Noch eine Karte. Nicht meine Idee, steht so in den Regeln.', 'Dritte Karte. Spannung!', 'Ich zieh, weil ich muss. Nicht, weil ich will.'],
  win: ['Hmpf. Gewonnen.', 'Na schön. Hier.', 'Glück. Reines Glück.', 'Das war knapp. Für mich.'],
  lose: ['Falsche Seite! Hehehe.', 'Die Neun mag dich nicht.', 'Danke für die Spende.', 'Ach, wie bedauerlich. Für dich.'],
  push: ['Unentschieden. Alle kriegen ihr Geld zurück. Langweilig.', 'Gleichstand. Ich gähne.'],
  tieWin: ['UNENTSCHIEDEN? Und du hast drauf gesetzt?!', 'Acht zu eins… Wer hat dir das verraten?!'],
  bank6: ['Bank gewinnt mit sechs. Zahlt nur die Hälfte. Kleingedrucktes, Liebes.', 'Sechs! Halbe Auszahlung. Ich liebe diese Regel.'],
  big: ['Gib das sofort zurück!', 'Das ist kein Baccarat, das ist Raub!'],
  shoe: ['Neuer Schuh. Acht Decks, frisch gemischt.', 'Ich misch neu. Acht Decks. Das dauert. Für dich nicht.'],
};
// Choccypuddin redet anders; fehlt ein Schlüssel, nimmt er Kortomis Satz.
const CHOC_L = {
  enter: ['Baccarat. Klingt fancy. Ist eigentlich nur Kartenzählen bis neun.', 'Setz einfach irgendwo hin. Ich teil aus. Ganz langsam.'],
  win: ['Gewonnen. Schön für dich.', 'Ausgezahlt. Ich nick anerkennend.'],
  lose: ['Weg. Wie mein Schlaf.', 'Falsche Seite. Passiert mir auch ständig.'],
  push: ['Unentschieden. Wie meine Noten.'],
  tieWin: ['Unentschieden getroffen?! Okay, jetzt bin ich wach.'],
  bank6: ['Bank mit sechs, halbe Auszahlung. Hab ich nicht erfunden.'],
  shoe: ['Neue Karten. Acht Decks. Ich brauch erstmal Kaffee.'],
};
const line = k => (dealer() === 'choc' && CHOC_L[k] ? pickLocal('bacc', CHOC_L, k) : pickLocal('bac', LINES, k));

// Tutorial (js/tutorial.js)
export const STEPS = [
  { t: 'Baccarat', d: 'Hier spielst du nicht selbst – du <b>wettest</b>. Auf den Spieler, auf die Bank oder auf ein Unentschieden. Ich teile aus, du schwitzt.', el: '#bac-dealer' },
  { t: 'Wer gewinnt?', d: 'Spieler und Bank bekommen je zwei Karten. Gewonnen hat die Hand, die <b>näher an der 9</b> liegt. Mehr nicht. Selbst du schaffst das.', el: '#bac-table' },
  { t: 'Nur die letzte Ziffer', d: 'Ass zählt 1, Zehner und Bilder zählen <b>0</b>. Über 9? Dann zählt nur die letzte Ziffer: 7 + 8 = 15 → <b>5</b>.' },
  { t: 'Die dritte Karte', d: 'Ob noch eine Karte kommt, regelt eine feste Tabelle – <b>ich ziehe automatisch</b>, du musst nichts tun. 8 oder 9 mit den ersten zwei Karten ist ein <b>Natural</b>: sofort Schluss.' },
  { t: 'Setzen', d: 'Chip wählen, dann aufs Feld tippen. Spieler zahlt <b>1:1</b>, Bank <b>1:1</b> – gewinnt sie mit 6, nur <b>1:2</b>. Unentschieden zahlt <b>8:1</b>.', el: '#bac-spots' },
  { t: 'Die Straße', d: 'Oben stehen die letzten Ergebnisse. Muster? Die Karten haben kein Gedächtnis. Ich schon. Hehe.', el: '#bac-road' },
];

// ---------- Schuh ----------
function newShoe() { shoe = shuffle(newDeck(DECKS)); }
function draw() {
  if (!shoe.length) newShoe();
  const c = shoe.pop();
  c.uid = `bac-${seq++}`; c.up = false;
  return c;
}

// ---------- Layout ----------
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  const mh = Math.max(70, Math.min(H * 0.22, 150));
  const bz = Math.max(70, Math.min(H * 0.2, 118));
  const top = Math.max(mh * 0.82, 84);
  const spotsTop = H - bz - 10;
  const room = spotsTop - top - 52; // Platz für Karten, quer liegende dritte Karte und Punkte
  const cw = Math.max(40, Math.min(W * 0.27, room / 2.45, 128));
  const ch = cw * 1.4;
  const block = ch + 8 + cw;
  const y = top + Math.max(0, (room - block) / 2);
  const off = Math.min(W * 0.23, 250);
  L = { W, H, cw, ch, mh, bz, y, pc: W / 2 - off, bc: W / 2 + off, spotsTop };
  layer.setSize(cw, ch);
  dealerSpot.style.height = `${mh}px`; dealerSpot.style.width = `${mh * 0.8}px`;
  spotsEl.style.height = `${bz}px`;
  roadEl.style.left = `${mh * 0.8 + 10}px`;
}

// Position der i-ten Karte einer Hand (0, 1 nebeneinander, 2 quer darunter)
function slot(side, i) {
  const hc = side === 'P' ? L.pc : L.bc;
  if (i < 2) return { x: hc - L.cw * 0.78 + i * L.cw * 0.56, y: L.y, r: i ? 3 : -3 };
  const cy = L.y + L.ch + 8 + L.cw / 2;
  return { x: hc - L.cw / 2, y: cy - L.ch / 2, r: 90 };
}
const shoePos = () => ({ x: L.W + L.cw * 0.2, y: -L.ch * 0.9, r: 20 });

function render({ instant = false } = {}) {
  if (!L.W) return;
  for (const s of ['P', 'B']) onTable[s].forEach((c, i) => layer.place(c, { ...slot(s, i), z: 10 + i, up: c.up, instant }));
  renderBadges();
}

function renderBadges() {
  badges.querySelectorAll('.hand-badge').forEach(b => b.remove());
  for (const s of ['P', 'B']) {
    const cards = onTable[s].filter(c => c.up);
    const b = document.createElement('div');
    b.className = 'hand-badge bac-badge bac-' + s + (result && result.winner === s ? ' bj' : '');
    b.style.setProperty('--x', `${s === 'P' ? L.pc : L.bc}px`);
    b.style.setProperty('--y', `${L.y + L.ch + 8 + L.cw + 18}px`);
    b.textContent = cards.length ? `${NAME[s]} · ${handTotal(cards)}` : NAME[s];
    badges.appendChild(b);
  }
}

function tag(text, sub, kind) {
  lastTag?.remove();
  const t = document.createElement('div');
  t.className = `result-tag ${kind}`;
  t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  t.style.setProperty('--x', `${L.W / 2}px`);
  t.style.setProperty('--y', `${L.y + L.ch * 0.55}px`);
  badges.appendChild(t);
  lastTag = t;
}

// ---------- Straße (letzte Ergebnisse) ----------
function renderRoad() {
  const road = store.d.bac.road || [];
  const letter = { P: 'S', B: 'B', T: 'U' };
  roadEl.innerHTML = road.map(r => `<i class="bead b-${r[0]}${r[1] === 'n' ? ' nat' : ''}" title="${NAME[r[0]]}${r[1] === 'n' ? ' (Natural)' : ''}">${letter[r[0]]}</i>`).join('')
    || '<span class="road-empty">Noch keine Ergebnisse</span>';
  roadEl.scrollLeft = roadEl.scrollWidth;
}

// ---------- Einsätze ----------
const total = () => bets.P + bets.T + bets.B;

function renderSpots() {
  spotsEl.querySelectorAll('.bac-spot').forEach(sp => {
    const s = sp.dataset.side, v = bets[s];
    sp.classList.toggle('has', v > 0);
    sp.classList.toggle('win', !!result && phase === 'bet' && !total() && result.winner === s);
    sp.disabled = phase !== 'bet';
    sp.querySelector('.bac-amt').textContent = v ? fmt(v) : '';
    const chips = chipBreakdown(v).slice(0, 10).reverse();
    sp.querySelector('.bac-stack').innerHTML = chips.map((c, i) => `<div class="chip" style="bottom:${i * 9}%;z-index:${i}">${i === chips.length - 1 ? chipSVG(c) : chipSideSVG(c)}</div>`).join('');
  });
}

function renderRack() {
  rack.innerHTML = '';
  rack.classList.toggle('hidden', phase !== 'bet');
  const vals = chipValues();
  if (!vals.includes(store.d.bac.chip)) store.d.bac.chip = vals[1];
  const sel = store.d.bac.chip;
  for (const v of vals) {
    const b = document.createElement('button');
    b.className = 'chip-btn' + (v === sel ? ' sel' : '');
    b.innerHTML = chipSVG(v);
    b.setAttribute('aria-label', `Chip ${v} wählen`);
    b.setAttribute('aria-pressed', v === sel);
    b.disabled = store.d.balance < v;
    b.addEventListener('click', () => { store.d.bac.chip = v; store.save(); sfx.chip(1); renderRack(); });
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

const lastSum = () => { const l = store.d.bac.last; return l ? (l.P || 0) + (l.T || 0) + (l.B || 0) : 0; };

function renderActions() {
  actions.innerHTML = '';
  if (phase !== 'bet') { btn('Kortomi teilt aus …', 'ghost', () => { }, { disabled: true }); return; }
  const t = total();
  if (t) {
    btn('Löschen', 'ghost', clearBets);
    btn('Geben', 'primary', deal, { sub: `Einsatz ${fmt(t)}` });
    return;
  }
  const ls = lastSum();
  if (ls) btn(result ? 'Nochmal' : 'Wie zuletzt', 'primary', () => { if (placeLast()) deal(); }, { sub: store.d.balance >= ls ? `${fmt(ls)} setzen` : 'zu wenig Chips', disabled: store.d.balance < ls });
  btn('Geben', ls ? 'ghost' : 'primary', deal, { sub: 'Feld antippen', disabled: true });
}

function sweepIfDone() {
  if (!result) return;
  result = null;
  lastTag?.remove(); lastTag = null;
  const old = [...onTable.P, ...onTable.B];
  onTable = { P: [], B: [] };
  old.forEach((c, i) => layer.place(c, { x: -L.cw * 1.4, y: L.y - L.ch * 0.2, r: -20, z: 60 + i, up: false, delay: i * 25, dur: 420 }));
  if (old.length) sfx.whoosh();
  setTimeout(() => old.forEach(c => layer.remove(c)), 520 + old.length * 25);
  renderBadges();
}

function place(side) {
  if (phase !== 'bet') return;
  const v = store.d.bac.chip;
  if (store.d.balance < v || bets[side] + v > MAX_SPOT) { sfx.nope(); return; }
  sweepIfDone();
  store.d.balance -= v; bets[side] += v;
  store.d.pendingBac = total(); store.save();
  updateBalance(); sfx.chip(1); vibrate(5);
  if (bets[side] === v && Math.random() < 0.35) say(M, line(side === 'T' ? 'tieBet' : 'bet'), { mood: 'smug' });
  renderSpots(); renderRack(); renderActions();
}

function clearBets() {
  if (phase !== 'bet' || !total()) return;
  store.d.balance += total(); bets = { P: 0, T: 0, B: 0 };
  store.d.pendingBac = 0; store.save();
  updateBalance(); sfx.chip(2);
  renderSpots(); renderRack(); renderActions();
}

function placeLast() {
  const l = store.d.bac.last, ls = lastSum();
  if (!ls || store.d.balance < ls) { sfx.nope(); return false; }
  sweepIfDone();
  bets = { P: l.P || 0, T: l.T || 0, B: l.B || 0 };
  store.d.balance -= ls; store.d.pendingBac = ls; store.save();
  updateBalance(); sfx.chip(3);
  renderSpots(); renderRack();
  return true;
}

// ---------- Runde ----------
async function deal() {
  const stake = total();
  if (phase !== 'bet' || !stake) { sfx.nope(); return; }
  sweepIfDone();
  phase = 'deal';
  store.d.bac.last = { ...bets }; store.save(true);
  renderSpots(); renderRack(); renderActions();
  if (shoe.length < RESHUFFLE) {
    newShoe(); sfx.shuffle(); say(M, line('shoe'), { mood: 'smug', priority: 2 });
    await sleep(650);
  } else await sleep(260);

  const r = playRound(draw);
  // Ersten vier Karten offen austeilen: Spieler, Bank, Spieler, Bank
  for (let k = 0; k < r.steps.length; k++) {
    const [side, c] = r.steps[k];
    if (k === 4) {
      // Dritte Karte(n): kurze Pause, dann quer anlegen
      await sleep(520);
      if (Math.random() < 0.35) say(M, line('third'), { mood: 'think' });
    }
    const i = onTable[side].length;
    onTable[side].push(c);
    layer.place(c, { ...shoePos(), z: 40, up: false, instant: true });
    await sleep(30);
    c.up = true;
    layer.place(c, { ...slot(side, i), z: 10 + i, up: true, flySound: true });
    await sleep(k < 4 ? 360 : 460);
    renderBadges();
  }
  if (r.natural) {
    const s = r.pt >= 8 && r.pt >= r.bt ? 'P' : 'B';
    onTable[s].forEach(c => layer.elOf(c)?.classList.add('win'));
    sfx.sparkle();
    say(M, line('natural'), { mood: 'shock' });
  }
  await sleep(380);
  resolve(r, stake);
}

function resolve(r, stake) {
  const back = payout(bets, r);
  const net = back - stake;
  const st = store.d.stats.bac;
  st.rounds++;
  if (r.natural) st.naturals++;
  if (net > 0) { st.wins++; st.biggestWin = Math.max(st.biggestWin, net); }
  st[r.winner === 'P' ? 'player' : r.winner === 'B' ? 'bank' : 'ties']++;
  const tieWon = r.winner === 'T' && bets.T > 0;
  if (tieWon) st.tieWins++;
  store.d.balance += back; store.d.pendingBac = 0;
  const road = store.d.bac.road || (store.d.bac.road = []);
  road.push(r.winner + (r.natural ? 'n' : ''));
  if (road.length > ROAD) road.splice(0, road.length - ROAD);
  unlock('bac_first');
  if (tieWon) unlock('bac_tie');
  if (net > 0 && r.natural && ((r.winner === 'P' && r.pt === 9 && bets.P) || (r.winner === 'B' && r.bt === 9 && bets.B))) unlock('bac_nine');
  store.save(true);

  result = r;
  bets = { P: 0, T: 0, B: 0 };
  phase = 'bet';
  if (r.winner !== 'T') onTable[r.winner].forEach(c => layer.elOf(c)?.classList.add('win'));
  updateBalance(net > 0);
  noteResult(M, net > 0 ? 'win' : net < 0 ? 'loss' : 'push', net);
  const title = r.winner === 'T' ? 'Unentschieden' : `${NAME[r.winner]} gewinnt`;
  const sub = `${r.pt} : ${r.bt} · ${net > 0 ? '+' + fmt(net) : net < 0 ? '−' + fmt(-net) : '±0'}`;
  const big = tieWon || net >= Math.max(500, stake * 2);
  tag(title, sub, net > 0 ? (big ? 'bj' : 'win') : net < 0 ? 'lose' : 'push');
  if (net > 0) {
    sfx.chip(4);
    if (big) { celebrate(tieWon && net >= 1000); sfx.bigWin ? sfx.bigWin() : sfx.win(); say(M, line(tieWon ? 'tieWin' : 'big'), { mood: 'shock', priority: 3 }); }
    else { sfx.win(); if (r.winner === 'B' && r.bt === 6) say(M, line('bank6'), { mood: 'wink', priority: 2 }); else if (Math.random() < 0.5) say(M, line('win'), { mood: 'sad' }); }
  } else if (net < 0) {
    sfx.lose();
    if (back > 0 && r.winner === 'B' && r.bt === 6) say(M, line('bank6'), { mood: 'wink', priority: 2 });
    else if (Math.random() < 0.55) { jump(M); say(M, line('lose'), { mood: 'happy' }); } else setMood(M, 'smug', 1400);
  } else {
    sfx.push(); say(M, line('push'), { mood: 'think' });
  }
  renderBadges(); renderRoad(); renderSpots(); renderRack(); renderActions();
}

// ---------- Einstieg ----------
let inited = false;
export function enterBaccarat() {
  if (!inited) {
    inited = true;
    mountMascot(dealerSpot, M);
    newShoe();
    $('#screen-baccarat .topbar-actions').prepend(helpButton('baccarat', STEPS));
    spotsEl.addEventListener('click', e => { const sp = e.target.closest('.bac-spot'); if (sp) place(sp.dataset.side); });
    new ResizeObserver(() => { if (table.clientWidth) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!document.getElementById('screen-baccarat').hasAttribute('data-active') || document.querySelector('.sheet.show') || document.querySelector('.tut.show')) return;
      const k = e.key.toLowerCase();
      if (k === 's') place('P');
      else if (k === 'b') place('B');
      else if (k === 'u') place('T');
      else if (k === 'backspace') clearBets();
      else if (k === 'enter' || k === ' ') {
        e.preventDefault();
        if (phase !== 'bet') return;
        if (total()) deal(); else if (lastSum() && placeLast()) deal();
      }
    });
  }
  computeLayout(); render({ instant: true }); renderRoad(); renderSpots(); renderRack(); renderActions();
  if (!maybeTutorial('baccarat', STEPS)) setTimeout(() => say(M, line('enter'), { mood: 'smug', priority: 2 }), 600);
}
