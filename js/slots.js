// Kortomis Spukautomat — Spielautomat mit 3 Walzen × 3 Reihen und 5 Gewinnlinien (im Upgrade-Shop freischaltbar).
// Einsatz pro Drehung wählen (gilt für alle 5 Linien zusammen), drehen, Gewinne aller Linien werden addiert.
// Kortomi ist der Joker und ersetzt jedes Symbol.
//
// ---------- Mathematik (Auszahlungsquote) ----------
// Jede Walze hat einen festen Streifen mit 20 Feldern (REELS). Pro Drehung wird je Walze ein Halt
// gleichverteilt gewählt; sichtbar sind die Felder [halt, halt+1, halt+2] (zyklisch) als obere/mittlere/untere Reihe.
// Damit gibt es genau 20³ = 8.000 gleich wahrscheinliche Ergebnisse, über die sich alles exakt abzählen lässt
// (siehe `rtp()` weiter unten, die genau das tut).
// Linien: 1 = Mitte, 2 = oben, 3 = unten, 4 = Diagonale ↘, 5 = Diagonale ↗.
// Eine Linie gewinnt bei drei gleichen Symbolen (Joker zählt als jedes Symbol, drei Joker = Joker-Gewinn)
// oder, schwächer, bei zwei Bonbons ganz links (Joker zählt mit). Faktoren gelten für den GESAMTEINSATZ:
//   3× Kortomi 50 · 3× Mond 15 · 3× Trank 6 · 3× Totenkopf 3 · 3× Fledermaus 1,6 · 3× Bonbon 0,6 · 2× Bonbon 0,2
// Abgezählt über alle 8.000 Ergebnisse:
//   Auszahlungsquote (RTP) = 7.643 / 8.000 = 95,54 %   (Hausvorteil 4,46 %)
//   Trefferquote (irgendein Gewinn) ≈ 42 %, davon ≈ 15 % unter dem Einsatz („Trostgewinn“)
//   ≥ 5-facher Einsatz ≈ 1 von 27 Drehungen, ≥ 20-fach ≈ 1 von 350, drei Kortomis auf einer Linie = 1 von 1.600.
// Alle Faktoren sind Vielfache von 0,2 und alle Chips Vielfache von 5, daher sind Auszahlungen immer ganze Chips.
import { kortomiHeadEmblem, chipSVG } from './art.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock, chipValues } from './store.js';
import { rescueIfBroke } from './rescue.js';
import { mountMascot, say, setMood, jump, pickLocal, dealer } from './mascot.js';
import { celebrate, sparkleAt } from './fx.js';
import { fmt, updateBalance } from './ui.js';
import { maybeTutorial, helpButton } from './tutorial.js';
import { noteResult } from './streaks.js';
import { sleep } from './cards.js';

const M = 'sl';

// ---------- Symbole (eigene SVGs, viewBox 0 0 100 100; Kortomi nutzt das Kopf-Emblem) ----------
const SYM = {
  K: { name: 'Kortomi', vb: '30 2 180 180', body: () => `<circle cx="120" cy="98" r="86" fill="#ff5fa2" opacity=".22"/><circle cx="120" cy="98" r="86" fill="none" stroke="#e8c27a" stroke-width="6" stroke-dasharray="4 10" stroke-linecap="round"/>${kortomiHeadEmblem()}<path d="M190 28 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#ffd76e"/>` },
  M: { name: 'Mond', body: () => `<path d="M47.5 18 A34 34 0 1 0 77.2 65.5 A28 28 0 1 1 47.5 18Z" fill="#e8c27a" stroke="#b98a3e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 52 q5 4 10 0" fill="none" stroke="#3a1d10" stroke-width="2.6" stroke-linecap="round"/><path d="M27 66 q4 3 8 0" fill="none" stroke="#3a1d10" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="22" cy="61" rx="4.5" ry="3" fill="#ff7ab4" opacity=".6"/>
    <path d="M80 16 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6z" fill="#fff4fa"/><circle cx="88" cy="42" r="2.4" fill="#fff4fa" opacity=".8"/>` },
  P: { name: 'Zaubertrank', body: () => `<rect x="42" y="16" width="16" height="20" rx="3" fill="#e7dcff" stroke="#8d5cff" stroke-width="2.5"/><rect x="39" y="9" width="22" height="10" rx="3.5" fill="#b98a3e"/>
    <circle cx="50" cy="61" r="27" fill="#e7dcff" stroke="#8d5cff" stroke-width="2.5"/>
    <path d="M25.5 63 Q37 55 50 61 T74.5 61 A25 25 0 0 1 25.5 63Z" fill="#6fdcab"/>
    <circle cx="42" cy="72" r="3.4" fill="#fff" opacity=".75"/><circle cx="57" cy="77" r="2.2" fill="#fff" opacity=".7"/><circle cx="60" cy="67" r="1.6" fill="#fff" opacity=".7"/>
    <path d="M33 54 Q35 44 43 40" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
    <path d="M44 26 h12" stroke="#ff5fa2" stroke-width="3"/>` },
  S: { name: 'Totenkopf', body: () => `<path d="M50 18 C30 18 20 32 20 48 C20 58 26 64 32 66 L32 76 C32 80 36 83 40 83 L60 83 C64 83 68 80 68 76 L68 66 C74 64 80 58 80 48 C80 32 70 18 50 18Z" fill="#fff4fa" stroke="#bba6cf" stroke-width="2.5"/>
    <ellipse cx="38" cy="50" rx="8" ry="9" fill="#2a1238"/><ellipse cx="62" cy="50" rx="8" ry="9" fill="#2a1238"/>
    <circle cx="40.5" cy="47" r="2.4" fill="#ff7ab4"/><circle cx="64.5" cy="47" r="2.4" fill="#ff7ab4"/>
    <path d="M50 58 l-4 7 h8z" fill="#2a1238"/><path d="M41 74 v9 M47 74 v9 M53 74 v9 M59 74 v9" stroke="#bba6cf" stroke-width="2"/>
    <path d="M71 23 L60 15 L60 31Z M71 23 L82 15 L82 31Z" fill="#ff5fa2"/><circle cx="71" cy="23" r="3.6" fill="#e0307a"/>` },
  B: { name: 'Fledermaus', body: () => `<path d="M50 40 C42 30 28 27 10 34 C17 40 17 47 13 55 C22 51 29 53 33 60 C38 54 44 56 50 64 C56 56 62 54 67 60 C71 53 78 51 87 55 C83 47 83 40 90 34 C72 27 58 30 50 40Z" fill="#4a2363" stroke="#8d5cff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M41 39 L38 24 L48 33Z M59 39 L62 24 L52 33Z" fill="#24102f"/><ellipse cx="50" cy="47" rx="11.5" ry="13" fill="#24102f"/>
    <circle cx="45.5" cy="45" r="3.2" fill="#ff5fa2"/><circle cx="54.5" cy="45" r="3.2" fill="#ff5fa2"/><circle cx="46.3" cy="44" r="1" fill="#fff"/><circle cx="55.3" cy="44" r="1" fill="#fff"/>
    <path d="M46.5 53 l1.6 4 1.6-4Z M50.5 53 l1.6 4 1.6-4Z" fill="#fff4fa"/>` },
  C: { name: 'Bonbon', body: () => `<path d="M30 50 L9 35 Q5 50 9 65 Z" fill="#ffb3d4" stroke="#e0307a" stroke-width="2" stroke-linejoin="round"/><path d="M70 50 L91 35 Q95 50 91 65 Z" fill="#ffb3d4" stroke="#e0307a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="23" fill="#ff5fa2" stroke="#e0307a" stroke-width="2"/>
    <path d="M38 31 Q52 50 39 69 M53 27.5 Q67 50 55 72.5" fill="none" stroke="#fff4fa" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="42" cy="38" rx="6" ry="3.5" fill="#fff" opacity=".45" transform="rotate(-30 42 38)"/>` },
};
const symSVG = (k, attrs = '') => `<svg viewBox="${SYM[k].vb || '0 0 100 100'}" ${attrs} aria-hidden="true">${SYM[k].body()}</svg>`;

// Gewinntabelle: Faktor × Gesamteinsatz (siehe Mathematik oben)
export const PAY = [['K', 50], ['M', 15], ['P', 6], ['S', 3], ['B', 1.6], ['C', 0.6]];
const PAY_OF = Object.fromEntries(PAY);
const TWO_CANDY = 0.2;
const REELS = ['CCCCCBBBBSSSPPMKCBSB', 'CCCCCBBBBSSSPPMKCBSP', 'CCCCCBBBBSSSPPMKCBSM'];
const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]]; // Reihe je Walze
const LINE_COLOR = ['#ff5fa2', '#b89cff', '#e8c27a', '#6fdcab', '#ff9b5e'];
const BADGE_Y = [50, 22, 78, 7, 93]; // Position der Liniennummern links (in % der Höhe)
const BIG = 5, HUGE = 20;

// ---------- Kortomis Sprüche ----------
const TALK = {
  enter: ['Mein Spukautomat. Er frisst Chips und rülpst manchmal welche aus.', 'Drei Gleiche auf einer Linie. Klingt einfach, oder? Hihi.', 'Na los, dreh schon. Ich guck nur ein bisschen.'],
  spin: ['Dreh, dreh, dreh…', 'Die Walzen flüstern deinen Namen. Und kichern.', 'Ich hab die Geister extra gefüttert.', 'Und los!'],
  win: ['Pff. Kleingeld.', 'Ein paar Chips. Freu dich nicht zu früh.', 'Der Automat hatte Mitleid.', 'Na gut. Nimm.'],
  big: ['Hey! Der Automat ist kaputt!', 'Wer hat den so eingestellt? ICH war das nicht!', 'Das war ein Versehen. Gib es zurück!'],
  jackpot: ['DREIMAL ICH?! Klar gewinnst du da. Ich bin einfach zu gut.', 'Mein Gesicht, dreimal! Der schönste Jackpot der Unterwelt.'],
  lose: ['Nichts. Herrlich.', 'Die Fledermäuse sagen danke.', 'Leere Walzen, volle Kasse. Meine Kasse.', 'Nochmal? Du willst doch nochmal.'],
  near: ['Uuuh, fast! Fast zählt nicht.', 'Zweimal ich… und dann nicht. Tragisch!'],
};
// Wenn Choc den Croupier macht (eigener Präfix, damit die Mischbeutel nicht durcheinanderkommen)
const TALK_CHOC = {
  enter: ['Ein Spielautomat. Endlich ein Spiel, bei dem ich nichts tun muss.', 'Dreh einfach. Ich halte so lange die Augen offen. Vielleicht.'],
  spin: ['Dreh, dreh… *gähn*', 'Das Klackern ist so beruhigend. Zzz…'],
  win: ['Oh, Gewinn. Nice.', 'Ein paar Chips. Gönn dir.'],
  big: ['Wow! Davon könnt ich ein Semester bezahlen!', 'So viel?! Ich bin plötzlich wach!'],
  jackpot: ['Dreimal Kortomi?! Sie wird schreien. Ich nehm Ohropax.'],
  lose: ['Nix. Sorry.', 'Diesmal nicht. Wie meine Prüfungen.', 'Leer. Wie mein Kühlschrank.'],
  near: ['Fast! Echt knapp.'],
};
const line = k => (dealer() === 'choc' ? pickLocal('slc', TALK_CHOC, k) : pickLocal('sl', TALK, k));

// ---------- Tutorial ----------
const STEPS = [
  { t: 'Mein Spukautomat', d: 'Drei Walzen, drei Reihen, <b>fünf Linien</b>. Ich erklär’s dir einmal. Also hör gut zu.' },
  { t: 'Einsatz wählen', d: 'Tipp einen Chip an. Das ist dein Einsatz <b>pro Drehung</b>, er gilt für alle fünf Linien zusammen.', el: '#sl-rack' },
  { t: 'Die Linien', d: 'Gezählt werden die drei Reihen und die zwei Diagonalen. <b>Drei Gleiche</b> auf einer Linie gewinnen, mehrere Linien zählen zusammen.', el: '#sl-reels' },
  { t: 'Ich bin der Joker', d: 'Mein hübsches Gesicht <b>ersetzt jedes Symbol</b>. Dreimal ich auf einer Linie zahlt den <b>50-fachen Einsatz</b>. Die Tabelle zeigt, was jede Linie bringt.', el: '#sl-pay' },
  { t: 'Drehen!', d: 'Tipp auf <b>Drehen</b> (oder drück die Leertaste). Viel Glück. Du wirst es brauchen.', el: '#sl-actions' },
];

// ---------- Auswertung ----------
function evalLine(s) {
  const plain = s.filter(x => x !== 'K');
  if (!plain.length) return { sym: 'K', n: 3, mult: PAY_OF.K };
  if (plain.every(x => x === plain[0])) return { sym: plain[0], n: 3, mult: PAY_OF[plain[0]] };
  if ((s[0] === 'C' || s[0] === 'K') && (s[1] === 'C' || s[1] === 'K')) return { sym: 'C', n: 2, mult: TWO_CANDY };
  return null;
}
const gridOf = stops => stops.map((o, i) => [0, 1, 2].map(r => REELS[i][(o + r) % REELS[i].length]));
function evaluate(grid) {
  const wins = [];
  LINES.forEach((rows, li) => {
    const w = evalLine(rows.map((r, x) => grid[x][r]));
    if (w) wins.push({ line: li, ...w, jackpot: w.sym === 'K' });
  });
  return { wins, mult: Math.round(wins.reduce((a, w) => a + w.mult, 0) * 10) / 10 };
}

// Exakte Auszahlungsquote durch Abzählen aller 8.000 Ergebnisse (zum Nachprüfen in der Konsole).
export function rtp() {
  let sum = 0, hits = 0, n = 0;
  const [a, b, c] = REELS.map(r => r.length);
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) {
    const r = evaluate(gridOf([i, j, k])); sum += r.mult; n++; if (r.mult) hits++;
  }
  return { rtp: sum / n, hitRate: hits / n, outcomes: n };
}

// ---------- Zustand ----------
let els = null;
let stops = [0, 5, 10];
let phase = 'idle'; // idle | spin
let S = 80; // Kantenlänge einer Walzen-Zelle in px
let lastTag = null, tickT = null;

const $ = s => document.querySelector(s);
const reduced = () => !store.d.settings.motion;

// Kleine Vorschau für Lobby und Shop
export function slotsArt() {
  const cell = (k, x) => `<rect x="${x}" y="22" width="30" height="34" rx="5" fill="#f4ecfa"/><svg x="${x + 2}" y="25" width="26" height="28" viewBox="${SYM[k].vb || '0 0 100 100'}">${SYM[k].body()}</svg>`;
  return `<svg class="slm-art" viewBox="0 0 120 80" aria-hidden="true">
    <rect x="6" y="4" width="108" height="72" rx="14" fill="#3a1a4d" stroke="#e8c27a" stroke-width="3"/>
    <rect x="12" y="18" width="96" height="42" rx="8" fill="#170b20"/>
    ${cell('M', 15)}${cell('K', 45)}${cell('M', 75)}
    <path d="M15 39 H105" stroke="#ff5fa2" stroke-width="2.4" opacity=".85"/>
    <circle cx="30" cy="11" r="2.4" fill="#ff5fa2"/><circle cx="60" cy="11" r="2.4" fill="#e8c27a"/><circle cx="90" cy="11" r="2.4" fill="#b89cff"/>
    <rect x="40" y="64" width="40" height="6" rx="3" fill="#e8c27a" opacity=".8"/>
  </svg>`;
}

// ---------- Aufbau ----------
function build() {
  const m = $('#sl-machine');
  m.innerHTML = `
    <div class="slm-marquee"><span>Kortomis</span><b>Spukautomat</b></div>
    <div class="slm-window">
      <div class="slm-nums" aria-hidden="true">${LINES.map((_, i) => `<i data-l="${i}" style="top:${BADGE_Y[i]}%;--c:${LINE_COLOR[i]}">${i + 1}</i>`).join('')}</div>
      <div class="slm-reels" id="sl-reels" role="img" aria-label="Walzen">
        ${REELS.map((_, i) => `<div class="slm-reel"><div class="slm-strip" data-r="${i}"></div></div>`).join('')}
        <svg class="slm-lines" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
          ${LINES.map((rows, i) => `<polyline data-l="${i}" style="--c:${LINE_COLOR[i]}" points="${rows.map((r, x) => `${x * 100 + 50},${r * 100 + 50}`).join(' ')}" vector-effect="non-scaling-stroke"/>`).join('')}
        </svg>
        <div class="slm-glass"></div>
      </div>
    </div>
    <div class="slm-led" id="sl-led" aria-live="polite"></div>`;
  els = {
    table: $('#sl-table'), machine: m, pay: $('#sl-pay'), dealer: $('#sl-dealer'), badges: $('#sl-badges'),
    rack: $('#sl-rack'), actions: $('#sl-actions'), led: $('#sl-led'), reels: $('#sl-reels'),
    strips: [...m.querySelectorAll('.slm-strip')], lines: [...m.querySelectorAll('.slm-lines polyline')], nums: [...m.querySelectorAll('.slm-nums i')],
  };
  // Linien vom Mittelpunkt der äußeren Zellen bis zum Rand verlängern
  els.lines.forEach((p, i) => {
    const rows = LINES[i], y = r => r * 100 + 50;
    const dy = (y(rows[2]) - y(rows[0])) / 200;
    p.setAttribute('points', `0,${y(rows[0]) - 50 * dy} ${rows.map((r, x) => `${x * 100 + 50},${y(r)}`).join(' ')} 300,${y(rows[2]) + 50 * dy}`);
  });
}

const cellHTML = k => `<div class="slm-cell" data-s="${k}">${symSVG(k)}</div>`;
// Ruhestellung: ein Feld über und eins unter dem Fenster, damit beim Nachfedern nichts leer ist
function paintStrip(i) {
  const R = REELS[i], o = stops[i], n = R.length;
  els.strips[i].innerHTML = [-1, 0, 1, 2, 3].map(d => cellHTML(R[(o + d + n) % n])).join('');
  els.strips[i].style.transform = `translateY(${-S}px)`;
}
const cellAt = (i, row) => els.strips[i].children[row + 1];

function computeLayout() {
  const W = els.table.clientWidth, H = els.table.clientHeight;
  if (!W) return false;
  const mh = Math.max(72, Math.min(H * 0.27, 170));
  els.dealer.style.height = `${mh}px`; els.dealer.style.width = `${mh * 0.8}px`;
  els.pay.style.left = `${mh * 0.8 + 8}px`;
  const top = Math.max(mh * 0.8, els.pay.offsetHeight + 14);
  const aw = W - 12, ah = H - top - 8;
  // Breite ≈ 3,62 Zellen (Rahmen + Nummernspalte), Höhe ≈ 4,4 Zellen (Schild + Fenster + Anzeige)
  S = Math.floor(Math.max(40, Math.min(aw / 3.62, ah / 4.4, 128)));
  const m = els.machine;
  m.style.setProperty('--s', `${S}px`);
  m.style.top = `${top + Math.max(0, (ah - S * 4.4) / 2)}px`;
  return true;
}

function renderAll() {
  if (!computeLayout()) return;
  if (phase !== 'spin') els.strips.forEach((_, i) => paintStrip(i));
  renderPay();
}

function renderPay(hitSyms = []) {
  const bet = store.d.sideBet.sl;
  const row = (k, n, mult) => `<div class="slm-pr${hitSyms.includes(`${k}${n}`) ? ' hit' : ''}"><em>${n}×</em><i>${symSVG(k)}</i><b>${fmt(mult * bet)}</b></div>`;
  els.pay.innerHTML = PAY.map(([k, m]) => row(k, 3, m)).join('') + row('C', 2, TWO_CANDY)
    + `<div class="slm-pr note"><i>${symSVG('K')}</i><span>ersetzt alles</span></div>`;
}

function led(html) { els.led.innerHTML = html; }
function ledIdle() { led(`5 Linien · Einsatz <b>${fmt(store.d.sideBet.sl)}</b>`); }

function clearWins() {
  lastTag?.remove(); lastTag = null;
  els.machine.classList.remove('won');
  els.lines.forEach(p => p.classList.remove('on'));
  els.nums.forEach(n => n.classList.remove('on'));
  els.machine.querySelectorAll('.slm-cell.win').forEach(c => c.classList.remove('win'));
}

function tag(text, sub, kind) {
  lastTag?.remove();
  const t = document.createElement('div');
  t.className = `result-tag ${kind}`;
  t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  const tr = els.table.getBoundingClientRect(), rr = els.reels.getBoundingClientRect();
  t.style.setProperty('--x', `${rr.left - tr.left + rr.width / 2}px`);
  t.style.setProperty('--y', `${rr.top - tr.top + rr.height / 2}px`);
  els.badges.appendChild(t);
  // Nach kurzer Zeit ausblenden, damit die Gewinnlinien sichtbar bleiben (Anzeige unten nennt den Betrag weiter)
  setTimeout(() => { if (!t.isConnected) return; t.style.animation = 'none'; t.style.transition = 'opacity .35s'; requestAnimationFrame(() => (t.style.opacity = '0')); }, 1500);
  lastTag = t;
}

// ---------- Einsatz ----------
function renderRack() {
  const rack = els.rack;
  rack.innerHTML = '';
  rack.classList.toggle('hidden', phase !== 'idle');
  const sel = store.d.sideBet.sl;
  for (const v of chipValues()) {
    const b = document.createElement('button');
    b.className = 'chip-btn' + (v === sel ? ' sel' : '');
    b.innerHTML = chipSVG(v);
    b.setAttribute('aria-label', `Einsatz ${v}`);
    b.setAttribute('aria-pressed', v === sel);
    b.disabled = store.d.balance < v;
    b.addEventListener('click', () => { store.d.sideBet.sl = v; store.save(); sfx.chip(1); renderRack(); renderActions(); renderPay(); ledIdle(); });
    rack.appendChild(b);
  }
}

function renderActions() {
  const a = els.actions;
  a.innerHTML = '';
  const v = store.d.sideBet.sl;
  const b = document.createElement('button');
  b.className = 'btn primary slm-spin';
  b.innerHTML = `${phase === 'spin' ? 'Dreht…' : 'Drehen'}<small>Einsatz ${fmt(v)}</small>`;
  b.disabled = phase !== 'idle' || store.d.balance < v;
  b.addEventListener('click', spin);
  a.appendChild(b);
}

// ---------- Walzen drehen ----------
// Streifen von oben nach unten: [halt-1, halt, …] bis zum alten Fenster; dann von alt nach neu schieben (Symbole fallen nach unten).
function spinReel(i, to, dur) {
  const R = REELS[i], n = R.length, from = stops[i];
  const minCells = 14 + i * 7;
  let steps = (from - to + n) % n; // so viele Felder rücken nach unten
  while (steps + 4 < minCells) steps += n;
  const cells = [];
  for (let d = -1; d <= steps + 3; d++) cells.push(R[(to + d + n * 4) % n]);
  const strip = els.strips[i];
  strip.innerHTML = cells.map(cellHTML).join('');
  const y0 = -(steps + 1) * S, y1 = -S;
  strip.style.transform = `translateY(${y0}px)`;
  strip.parentElement.classList.add('spinning');
  const anim = strip.animate([{ transform: `translateY(${y0}px)` }, { transform: `translateY(${y1}px)` }],
    { duration: dur, easing: 'cubic-bezier(.32,.02,.28,1.04)', fill: 'forwards' });
  // Bewegungsunschärfe nur, solange die Walze schnell ist
  setTimeout(() => strip.parentElement.classList.remove('spinning'), dur * 0.72);
  return Promise.race([anim.finished.catch(() => { }), sleep(dur + 250)]).then(() => {
    stops[i] = to;
    anim.cancel();
    paintStrip(i);
    stopFx(i);
  });
}
function stopFx(i) {
  sfx.reelStop?.(); vibrate(5);
  const reel = els.strips[i].parentElement;
  reel.classList.remove('thud'); void reel.offsetWidth; reel.classList.add('thud');
}

async function spin() {
  if (phase !== 'idle') return;
  const bet = store.d.sideBet.sl;
  if (store.d.balance < bet) {
    sfx.nope();
    rescueIfBroke(M, () => { renderRack(); renderActions(); });
    return;
  }
  store.d.balance -= bet; store.d.pendingSl = bet; store.save(true);
  updateBalance(); sfx.chip(2); vibrate(6);
  phase = 'spin'; clearWins(); renderRack(); renderActions();
  led('Viel Glück…');
  if (Math.random() < 0.3) say(M, line('spin'), { mood: 'wink' });
  else setMood(M, 'think', 1600);

  const next = REELS.map(r => Math.floor(Math.random() * r.length));
  const grid = gridOf(next);
  const res = evaluate(grid);

  if (reduced()) {
    // Ohne Bewegung: Walzen nacheinander einfach umschalten
    for (let i = 0; i < 3; i++) {
      await sleep(i ? 160 : 60);
      stops[i] = next[i]; paintStrip(i);
      els.strips[i].classList.add('fade'); setTimeout(() => els.strips[i].classList.remove('fade'), 200);
      sfx.reelStop?.();
    }
  } else {
    sfx.reelStart?.();
    clearInterval(tickT);
    tickT = setInterval(() => sfx.reelTick?.(), 95);
    // Naht fast ein Joker-Jackpot (zwei Kortomis auf einer Linie), dreht die letzte Walze etwas länger
    const tease = LINES.some(rows => grid[0][rows[0]] === 'K' && grid[1][rows[1]] === 'K');
    await Promise.all(next.map((to, i) => spinReel(i, to, 850 + i * 380 + (i === 2 && tease ? 650 : 0))));
    clearInterval(tickT);
  }
  finish(bet, res);
}

function finish(bet, res) {
  const pay = Math.round(bet * res.mult);
  const s = store.d.stats.sl;
  s.spins++; s.wagered += bet; s.paid += pay;
  store.d.pendingSl = 0;
  if (pay) {
    store.d.balance += pay; s.wins++;
    s.biggestWin = Math.max(s.biggestWin, pay);
    if (res.wins.some(w => w.jackpot)) s.jackpots++;
  }
  store.save(true);
  phase = 'idle';
  noteResult(M, pay > bet ? 'win' : pay < bet ? 'loss' : 'push', pay - bet);

  if (!pay) {
    const near = LINES.some(rows => rows.filter((r, x) => cellSym(x, r) === 'K').length === 2);
    led('Kein Gewinn');
    tag('Nichts', `−${fmt(bet)}`, 'lose');
    if (near) say(M, line('near'), { mood: 'happy', priority: 2 });
    else if (Math.random() < 0.45) { jump(M); say(M, line('lose'), { mood: 'happy' }); }
    else setMood(M, 'smug', 1400);
  } else {
    showWins(res);
    updateBalance(true);
    unlock('sl_first');
    const jack = res.wins.some(w => w.jackpot);
    if (jack) unlock('sl_jackpot');
    if (res.mult >= HUGE) unlock('sl_huge');
    const sub = res.wins.length > 1 ? `${res.wins.length} Linien · +${fmt(pay)}` : `+${fmt(pay)}`;
    tag(res.mult >= BIG ? 'Großer Gewinn' : 'Gewinn', sub, res.mult >= BIG ? 'bj' : 'win');
    if (res.mult >= HUGE || jack) { celebrate(true); sfx.bigWin(); say(M, line(jack ? 'jackpot' : 'big'), { mood: 'shock', priority: 3 }); }
    else if (res.mult >= BIG) { celebrate(false); sfx.bigWin(); say(M, line('big'), { mood: 'shock', priority: 2 }); }
    else {
      sfx.win(); sfx.chip(Math.min(4, 1 + Math.floor(res.mult)));
      if (Math.random() < 0.4) say(M, line('win'), { mood: 'sad' }); else setMood(M, 'sad', 1200);
    }
  }
  renderRack(); renderActions();
  rescueIfBroke(M, () => { renderRack(); renderActions(); }, 1600);
}
const cellSym = (x, r) => REELS[x][(stops[x] + r) % REELS[x].length];

function showWins(res) {
  els.machine.classList.add('won');
  for (const w of res.wins) {
    els.lines[w.line].classList.add('on');
    els.nums[w.line].classList.add('on');
    LINES[w.line].slice(0, w.n).forEach((r, x) => cellAt(x, r)?.classList.add('win'));
  }
  renderPay(res.wins.map(w => `${w.sym}${w.n}`));
  const pay = Math.round(store.d.sideBet.sl * res.mult);
  if (res.wins.length === 1) {
    const w = res.wins[0];
    led(`Linie ${w.line + 1} · ${w.n}× ${SYM[w.sym].name} · <b>+${fmt(pay)}</b>`);
  } else led(`${res.wins.length} Linien · <b>+${fmt(pay)}</b>`);
  if (!reduced()) {
    const r = els.reels.getBoundingClientRect();
    sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
  }
}

// ---------- Einstieg ----------
let inited = false;
export function enterSlots() {
  if (!inited) {
    inited = true;
    build();
    mountMascot(els.dealer, M);
    $('#screen-slots .topbar-actions')?.prepend(helpButton('slots', STEPS));
    new ResizeObserver(() => { if (els.table.clientWidth) renderAll(); }).observe(els.table);
    addEventListener('keydown', e => {
      if (!document.getElementById('screen-slots').hasAttribute('data-active') || document.querySelector('.sheet.show, .tut.show')) return;
      if (e.target.closest?.('button')) return; // fokussierter Knopf löst selbst aus
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); spin(); }
    });
  }
  renderAll(); renderRack(); renderActions();
  if (phase === 'idle') { clearWins(); ledIdle(); }
  if (phase === 'idle' && rescueIfBroke(M, () => { renderRack(); renderActions(); }, 700)) return;
  if (!maybeTutorial('slots', STEPS, 600)) setTimeout(() => say(M, line('enter'), { mood: 'smug', priority: 2 }), 600);
}
