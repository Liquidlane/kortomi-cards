// Spider-Solitaire (im Upgrade-Shop freischaltbar): 104 Karten, 10 Spalten, 1, 2 oder 4 Farben.
// Absteigend auf jede Farbe legen, aber nur gleichfarbige Folgen bewegen sich gemeinsam.
// Volle Folgen König bis Ass fliegen von selbst auf die Ablage. Neue Reihe nur ohne leere Spalte.
import { CardLayer, sleep } from './cards.js';
import { sfx, vibrate } from './audio.js';
import { store, unlock } from './store.js';
import { pickLocal } from './mascot.js';
import { sparkleAt } from './fx.js';
import { fmt, updateBalance } from './ui.js';
import { maybeTutorial, helpButton } from './tutorial.js';
import { spiderDeck, spRunFrom, spCanDrop, spCompleteRun, spCanDeal } from './patience-rules.js';
import { top, clock, overlap, shake, bindDrag, hopHint, makeTalker, winShow, overlay } from './patience.js';

const M = 'sp';
const COLS = 10;
const $ = s => document.querySelector(s);
const screen = $('#screen-spider');
const table = $('#sp-table');
const layerEl = $('#sp-cards');
const layer = new CardLayer(layerEl);
const slotsEl = $('#sp-slots');
const mascotEl = $('#sp-mascot');
const undoBtn = $('#sp-undo');
const dealBtn = $('#sp-deal');
const kortomi = makeTalker(mascotEl, M);

let S = null;
let byUid = new Map();
let history = [];
let L = {};
let busy = false;

const LINES = {
  enter: ['Spider! Acht Beine, zehn Spalten, null Mitleid.', 'Sortier mir die Spinnweben. König bis Ass, schön ordentlich.', 'Willkommen in meinem Netz. Hehehe.'],
  resume: ['Dein Netz hängt noch genau so, wie du es verlassen hast.', 'Weiter geht’s. Die Spinne hat gewartet.'],
  run: ['Eine Folge komplett! Ab ins Körbchen.', 'König bis Ass. Sauber gesponnen.', 'Schwupps, weg damit. Mehr davon!', 'Ooh, das hat geflutscht.'],
  deal: ['Neue Reihe! Zehn frische Probleme.', 'Austeilen? Mutig.', 'Hier, noch mehr Karten. Gern geschehen.'],
  dealBlocked: ['Erst jede Lücke füllen, dann gibt’s Nachschub. Regeln sind Regeln.', 'Leere Spalte! So teile ich nicht aus.'],
  stockEmpty: ['Der Stapel ist leer. Jetzt zählt nur noch Köpfchen.'],
  hint: ['Psst. Da drüben.', 'Ich hab nichts gesagt. Aber schau mal hier.', 'Gleiche Farbe auf gleiche Farbe, Schätzchen.'],
  noMoves: ['Hm. Ich seh nichts mehr. Neues Netz?', 'Festgesponnen. Das passiert den Besten.'],
  undo: ['Zurück? Ich hab’s gesehen.', 'Rückwärts krabbeln zählt auch.'],
  empty: ['Eine leere Spalte! Gold wert. Nicht verschwenden.'],
  win: ['Alle acht Folgen! Ich bin fast stolz auf dich.', 'Das Netz ist leer. Du bist eine echte Spinnenkönigin.', 'Gewonnen! Die Spinnen applaudieren. Mit allen Beinen.'],
  four: ['VIER Farben?! Okay, ich verneige mich. Ein bisschen.'],
  newGame: ['Frisch gemischt. Zwei Decks voller Chaos.', 'Neues Netz, neues Glück.'],
};
const line = k => pickLocal('sp', LINES, k);
const talk = (k, mood, prio = 1) => kortomi.say(line(k), mood, prio);

const STEPS = [
  { t: 'Spider, Schätzchen', d: 'Zehn Spalten, zwei Decks. Leg Karten <b>absteigend</b> aufeinander, die Farbe ist dabei egal. Kein Stress. Noch nicht.', el: '#sp-table' },
  { t: 'Gleiche Farbe zählt', d: 'Zusammen bewegen kannst du nur Folgen in <b>einer</b> Farbe. Gemischte Stapel kleben fest wie Spinnweben.', el: '#sp-table' },
  { t: 'König bis Ass', d: 'Eine volle Folge von <b>König bis Ass</b> in einer Farbe fliegt von selbst hier hoch. Acht davon und du hast gewonnen.', el: '#sp-slots .found' },
  { t: 'Nachschub', d: 'Tipp auf den Stapel für eine neue Reihe, eine Karte pro Spalte. Aber nur, wenn <b>keine Spalte leer</b> ist.', el: '#sp-slots .stock' },
  { t: 'Farben wählen', d: 'Bei <b>Neues Spiel</b> wählst du 1, 2 oder 4 Farben. Eine Farbe ist gemütlich, vier sind gemein. Ich mag gemein.', el: '#sp-new' },
  { t: 'Notfall-Knöpfe', d: '<b>Tipp</b> zeigt dir einen Zug, <b>Zurück</b> nimmt einen zurück. Ich zähle trotzdem mit.', el: '#sp-hint' },
];

// ---------- Zustand ----------
function newGame(suits) {
  const deck = shuffleDeck(spiderDeck(suits));
  byUid = new Map(deck.map(c => [c.uid, c]));
  S = { suits, tab: Array.from({ length: COLS }, () => []), stock: [], found: [], score: 500, moves: 0, time: 0, usedUndo: false, started: false, won: false };
  let k = 0;
  for (let i = 0; i < 54; i++) { const c = deck[k++]; c.up = false; S.tab[i % COLS].push(c); }
  S.tab.forEach(col => (top(col).up = true));
  S.stock = deck.slice(k).map(c => ((c.up = false), c));
  history = [];
}
function shuffleDeck(a) {
  const rnd = new Uint32Array(a.length);
  crypto.getRandomValues(rnd);
  for (let i = a.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function snapshot() {
  const p = a => a.map(c => [c.uid, c.up ? 1 : 0]);
  return { tab: S.tab.map(p), stock: p(S.stock), found: S.found.map(p), score: S.score, moves: S.moves };
}
function restore(snap) {
  const u = a => a.map(([id, up]) => { const c = byUid.get(id); c.up = !!up; return c; });
  S.tab = snap.tab.map(u); S.stock = u(snap.stock); S.found = snap.found.map(u);
  S.score = snap.score; S.moves = snap.moves;
}
function persist() {
  if (!S || S.won) { store.d.spSave = null; store.save(); return; }
  store.d.spSave = { ...snapshot(), suits: S.suits, time: S.time, started: S.started, usedUndo: S.usedUndo };
  store.save();
}
function loadSave(sv) {
  const deck = spiderDeck(sv.suits);
  byUid = new Map(deck.map(c => [c.uid, c]));
  S = { suits: sv.suits, tab: [], stock: [], found: [], score: 500, moves: 0, time: sv.time || 0, usedUndo: !!sv.usedUndo, started: !!sv.started, won: false };
  restore(sv);
  history = [];
}
const pushHistory = () => { history.push(snapshot()); if (history.length > 300) history.shift(); };

// ---------- Layout ----------
// Zehn Spalten müssen auch auf dem iPhone hochkant passen: schmale Karten, enger Abstand.
function computeLayout() {
  const W = table.clientWidth, H = table.clientHeight;
  const pad = Math.max(4, Math.min(W, H) * 0.014);
  const gapK = W < 520 ? 0.06 : 0.1;
  let cw = Math.min((W - pad * 2) / (COLS + (COLS - 1) * gapK), (H - pad * 2) / (1.4 * 5.2), 108);
  cw = Math.max(24, cw);
  const ch = cw * 1.4;
  const gap = cw * gapK;
  const x0 = (W - (COLS * cw + (COLS - 1) * gap)) / 2;
  const colX = i => x0 + i * (cw + gap);
  const y0 = pad;
  const ty = y0 + ch + Math.max(gap * 2, 10);
  L = { W, H, cw, ch, gap, colX, y0, ty, pad, bottom: H - pad, fStep: Math.min(cw * 0.42, ((colX(5) + cw) - colX(0) - cw) / 7) };
  layer.setSize(cw, ch);
  renderSlots();
}
const foundX = i => L.colX(0) + i * L.fStep;
const stockX = k => L.colX(COLS - 1) - k * L.cw * 0.2;

function renderSlots() {
  const { colX, y0, ty, cw, fStep } = L;
  const mk = (x, y, cls, inner = '', w) => `<div class="slot-mark ${cls}" style="--x:${x}px;--y:${y}px${w ? `;width:${w}px` : ''}">${inner}</div>`;
  const glyph = t => `<svg viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="56" font-family="Fredoka" font-weight="600" fill="currentColor">${t}</text></svg>`;
  let h = mk(colX(0), y0, 'found pat-found', `<span class="pat-found-lbl">K–A</span>`, cw + fStep * 7);
  h += mk(colX(COLS - 1), y0, 'stock', glyph('↻'));
  for (let i = 0; i < COLS; i++) h += mk(colX(i), ty, `tabslot t${i}`);
  slotsEl.innerHTML = h;
  slotsEl.querySelector('.stock').addEventListener('click', () => deal());
}

function fanOffsets(col) {
  const { ch, ty, bottom } = L;
  let dn = ch * 0.09, up = ch * 0.26;
  const downs = col.filter(c => !c.up).length, ups = col.length - downs;
  const need = downs * dn + Math.max(0, ups - 1) * up;
  const avail = bottom - ty - ch - (mascotEl.classList.contains('away') ? 0 : 6);
  if (need > avail && need > 0) { const k = avail / need; dn *= k; up *= k; }
  return { dn, up };
}

function render({ instant = false, except = null, delays = null } = {}) {
  if (!S) return;
  const { y0, ty, colX } = L;
  const dl = c => (delays && delays.get(c.uid)) || 0;
  S.stock.forEach((c, i) => layer.place(c, { x: stockX(Math.floor((S.stock.length - 1 - i) / 10)), y: y0, z: 1 + i, up: false, instant }));
  S.found.forEach((run, fi) => run.forEach((c, i) => layer.place(c, { x: foundX(fi), y: y0, z: 100 + fi * 15 + (12 - i), up: true, instant, delay: dl(c) })));
  S.tab.forEach((col, ci) => {
    const { dn, up } = fanOffsets(col);
    let y = ty;
    col.forEach((c, i) => {
      if (!(except && except.has(c.uid))) layer.place(c, { x: colX(ci), y, z: 300 + ci * 110 + i, up: c.up, instant, delay: dl(c) });
      y += c.up ? up : dn;
    });
  });
  $('#sp-moves').textContent = S.moves;
  $('#sp-score').textContent = fmt(S.score);
  undoBtn.disabled = !history.length || S.won;
  dealBtn.disabled = !S.stock.length || S.won;
  slotsEl.querySelector('.stock')?.classList.toggle('pat-empty', !S.stock.length);
}

// ---------- Regeln ----------
function where(card) {
  for (let i = 0; i < COLS; i++) { const k = S.tab[i].indexOf(card); if (k >= 0) return { t: 'tab', i, idx: k }; }
  if (S.stock.includes(card)) return { t: 'stock' };
  return { t: 'found' };
}
function movable(card) {
  const p = where(card);
  if (p.t !== 'tab' || !spRunFrom(S.tab[p.i], p.idx)) return null;
  return { from: p, cards: S.tab[p.i].slice(p.idx) };
}

// Volle Folgen einsammeln (nach jedem Zug und nach dem Austeilen)
function collectRuns() {
  const delays = new Map();
  let n = 0;
  for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci];
    const i = spCompleteRun(col);
    if (i < 0) continue;
    const run = col.splice(i, 13);
    run.forEach((c, k) => delays.set(c.uid, 140 + (12 - k) * 45 + n * 300));
    S.found.push(run);
    S.score += 100;
    if (col.length && !top(col).up) top(col).up = true;
    n++;
  }
  return n ? delays : null;
}

function afterChange(fromCol) {
  if (fromCol != null) { const src = S.tab[fromCol]; if (src.length && !top(src).up) top(src).up = true; }
  const delays = collectRuns();
  render({ delays });
  if (delays) {
    sfx.sparkle();
    talk('run', 'happy', 2);
    setTimeout(() => { const r = slotsEl.querySelector('.found')?.getBoundingClientRect(); if (r) sparkleAt(r.left + r.width * Math.min(1, S.found.length / 8), r.top + r.height / 2); }, 700);
  } else if (fromCol != null && !S.tab[fromCol].length && Math.random() < .4) talk('empty', 'wink', 1);
  persist();
  checkWin();
}

function doMove(from, to, n) {
  pushHistory();
  const src = S.tab[from.i], dst = S.tab[to.i];
  dst.push(...src.splice(src.length - n, n));
  S.moves++; S.score = Math.max(0, S.score - 1);
  startTimer();
  sfx.place();
  afterChange(from.i);
}

function deal() {
  if (busy || !S || S.won) return;
  if (!S.stock.length) { sfx.nope(); talk('stockEmpty', 'think', 2); return; }
  if (!spCanDeal(S.tab, S.stock)) {
    shake(S.tab.map((col, i) => col.length ? null : slotsEl.querySelector(`.t${i}`)));
    talk('dealBlocked', 'smug', 3);
    return;
  }
  pushHistory();
  const delays = new Map();
  for (let i = 0; i < COLS; i++) { const c = S.stock.pop(); c.up = true; S.tab[i].push(c); delays.set(c.uid, i * 55); setTimeout(() => sfx.deal(), i * 55); }
  S.moves++; S.score = Math.max(0, S.score - 1);
  startTimer();
  render({ delays });
  if (Math.random() < .3) talk('deal', 'smug', 1);
  busy = true;
  setTimeout(() => { busy = false; afterChange(null); }, COLS * 55 + 380);
}

// Bestes Ziel fürs Antippen: gleiche Farbe vor anderer Farbe vor leerer Spalte
function autoTarget(m) {
  const card = m.cards[0];
  let best = null, bestS = -1;
  for (let i = 0; i < COLS; i++) {
    if (i === m.from.i) continue;
    const col = S.tab[i];
    if (!spCanDrop(card, col)) continue;
    let s;
    if (!col.length) { if (m.from.idx === 0) continue; s = 0; }
    else s = top(col).suit === card.suit ? 2 : 1;
    if (s > bestS) { best = { t: 'tab', i }; bestS = s; }
  }
  return best;
}

// ---------- Eingabe ----------
function dropTarget(d, cx, cy) {
  const { cw, ch, colX, ty } = L;
  let best = null, bestA = 0;
  for (let i = 0; i < COLS; i++) {
    if (i === d.m.from.i) continue;
    const col = S.tab[i];
    const lastY = col.length ? layer.get(top(col)).y : ty;
    const a = overlap(cx, cy, cw, ch, colX(i) - L.gap / 2, ty, cw + L.gap, Math.max(lastY - ty + ch, ch));
    if (a > bestA && spCanDrop(d.card, col)) { best = { t: 'tab', i }; bestA = a; }
  }
  return bestA > cw * ch * 0.08 ? best : null;
}
let hl = null;
function highlightDrop(t) {
  const key = t ? `t${t.i}` : null;
  if (key === hl) return;
  hl = key;
  slotsEl.querySelectorAll('.drop-ok').forEach(s => s.classList.remove('drop-ok'));
  if (t) slotsEl.querySelector(`.t${t.i}`)?.classList.add('drop-ok');
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
  let best = null, bestS = 0;
  for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci];
    for (let idx = col.length - 1; idx >= 0; idx--) {
      if (!spRunFrom(col, idx)) break;
      const c = col[idx], below = col[idx - 1];
      // Liegt schon auf der passenden Karte gleicher Farbe: nichts zu gewinnen
      if (below && below.up && below.rank === c.rank + 1 && below.suit === c.suit) continue;
      const frees = idx === 0 ? 0 : !below.up ? 3 : 1;
      for (let i = 0; i < COLS; i++) {
        if (i === ci) continue;
        const dst = S.tab[i];
        if (!dst.length) continue;
        if (!spCanDrop(c, dst)) continue;
        const same = top(dst).suit === c.suit;
        // Von einer passenden fremden Farbe auf die nächste fremde Farbe bringt nichts
        if (!same && below && below.up && below.rank === c.rank + 1) continue;
        const s = (same ? 4 : 1) + frees + (13 - col.length + idx) * 0.01;
        if (s > bestS) { bestS = s; best = { cards: col.slice(idx), target: top(dst), col: i }; }
      }
    }
  }
  if (best) return best;
  // Leere Spalte nutzen, um eine verdeckte Karte freizulegen
  const empty = S.tab.findIndex(col => !col.length);
  if (empty >= 0) for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci];
    for (let idx = col.length - 1; idx > 0; idx--) {
      if (!spRunFrom(col, idx)) break;
      if (spRunFrom(col, idx - 1)) continue;
      return { cards: col.slice(idx), slot: `.t${empty}`, col: empty };
    }
  }
  if (S.stock.length && empty < 0) return { stock: true };
  if (S.stock.length) {
    // Vor dem Austeilen muss die Lücke weg: oberste Karte der längsten Spalte hinein
    let ci = -1;
    S.tab.forEach((col, i) => { if (col.length > 1 && (ci < 0 || col.length > S.tab[ci].length)) ci = i; });
    if (ci >= 0) return { cards: [top(S.tab[ci])], slot: `.t${empty}`, col: empty, fill: true };
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
  let src = [], dst = null;
  if (h.stock) src = [S.stock.length ? layer.elOf(top(S.stock)) : slotsEl.querySelector('.stock')];
  else { src = h.cards.map(c => layer.elOf(c)); dst = h.target ? layer.elOf(h.target) : slotsEl.querySelector(h.slot); }
  [...src, dst].forEach(e => e && e.classList.add('hint'));
  hopHint(src, dst);
  hintTimer = setTimeout(clearHint, 3000);
  if (h.fill) talk('dealBlocked', 'think', 2); else talk(h.stock ? 'deal' : 'hint', 'wink', 2);
}

// ---------- Zeit & Sieg ----------
function startTimer() {
  if (S.started) return;
  S.started = true;
  store.d.stats.sp.played++; store.save();
}
function tick() {
  if (screen.hasAttribute('data-active')) kortomi.sync();
  if (!S || !S.started || S.won || document.hidden || !screen.hasAttribute('data-active')) return;
  S.time++;
  $('#sp-time').textContent = clock(S.time);
  if (S.time % 10 === 0) persist();
}

function checkWin() {
  if (S.won || S.found.length < 8) return;
  S.won = true;
  const st = store.d.stats.sp;
  st.won++;
  if (!st.bestTime || S.time < st.bestTime) st.bestTime = S.time;
  st.bestScore = Math.max(st.bestScore || 0, S.score);
  if (S.suits === 2) st.won2 = (st.won2 || 0) + 1;
  if (S.suits === 4) st.won4 = (st.won4 || 0) + 1;
  const reward = [['Sieg', S.suits === 4 ? 400 : S.suits === 2 ? 200 : 100]];
  if (S.suits > 1) reward[0][0] = `Sieg (${S.suits} Farben)`;
  if (!S.usedUndo) reward.push(['Ohne Zurück', 50]);
  if (S.time < 600) reward.push(['Unter 10 Minuten', 50]);
  const chips = reward.reduce((a, [, v]) => a + v, 0);
  store.d.balance += chips;
  st.chips = (st.chips || 0) + chips;
  store.d.spSave = null; store.save(true);
  updateBalance();
  unlock('sp_first');
  if (S.suits === 4) unlock('sp_four');
  render();
  setTimeout(async () => {
    talk(S.suits === 4 ? 'four' : 'win', 'love', 3);
    const launches = [];
    for (let r = 12; r >= 0; r--) S.found.forEach((run, fi) => { const c = run[12 - r]; if (c) launches.push({ card: c, x: foundX(fi), y: L.y0, el: layer.elOf(c) }); });
    await winShow({
      table, launches, cw: L.cw, ch: L.ch, mascotEl, gameName: 'Spider', reward, chips,
      text: S.usedUndo ? 'Das Netz ist sauber.' : 'Ganz ohne Zurück. Respekt, Spinnenkönigin.',
      stats: [[clock(S.time), 'Zeit'], [S.moves, 'Züge'], [fmt(S.score), 'Punkte']],
      extra: suitSeg(S.suits),
      onNew: ov => { const v = readSeg(ov); ov.remove(); startNew(v); },
    }).then(ov => bindSeg(ov));
  }, 900);
}

// ---------- Neues Spiel (mit Farbwahl) ----------
const suitSeg = cur => `<div class="pat-seg-row"><span>Farben</span><span class="seg" data-sp-suits>${[1, 2, 4].map(n => `<button type="button" aria-pressed="${cur === n}" data-v="${n}">${n} ${n === 1 ? 'Farbe' : 'Farben'}</button>`).join('')}</span></div>`;
const readSeg = ov => parseInt(ov.querySelector('[data-sp-suits] [aria-pressed="true"]')?.dataset.v || store.d.settings.spiderSuits || 1, 10);
function bindSeg(ov) {
  ov.querySelector('[data-sp-suits]')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    ov.querySelectorAll('[data-sp-suits] button').forEach(x => x.setAttribute('aria-pressed', x === b));
    store.d.settings.spiderSuits = parseInt(b.dataset.v, 10); store.save();
    sfx.tap();
  });
}
function askNew() {
  if (busy) return;
  sfx.tap();
  const ov = overlay(table, `<h3>Neues Spiel</h3><p>Wie gemein darf’s sein?</p>${suitSeg(store.d.settings.spiderSuits || 1)}
    <div class="row"><button class="btn ghost" data-act="cancel">Weiterspielen</button><button class="btn primary" data-act="go">Austeilen</button></div>`);
  bindSeg(ov);
  ov.querySelector('[data-act=cancel]').addEventListener('click', () => { sfx.tap(); ov.remove(); });
  ov.querySelector('[data-act=go]').addEventListener('click', () => { const v = readSeg(ov); ov.remove(); talk('newGame', 'smug', 1); startNew(v); });
}

async function startNew(suits = store.d.settings.spiderSuits || 1) {
  if (busy) return;
  table.querySelector('.overlay-card')?.remove();
  busy = true;
  newGame([1, 2, 4].includes(suits) ? suits : 1);
  layer.clear();
  computeLayout();
  $('#sp-time').textContent = '0:00';
  const all = [...S.stock, ...S.tab.flat()];
  all.forEach((c, i) => layer.place(c, { x: stockX(0), y: L.y0, z: i, up: false, instant: true }));
  render({ instant: true, except: new Set(S.tab.flat().map(c => c.uid)) });
  sfx.shuffle();
  await sleep(300);
  let d = 0;
  const step = 22;
  for (let row = 0; row < 6; row++) for (let ci = 0; ci < COLS; ci++) {
    const col = S.tab[ci], c = col[row];
    if (!c) continue;
    const { dn } = fanOffsets(col);
    layer.place(c, { x: L.colX(ci), y: L.ty + row * dn, z: 300 + ci * 110 + row, up: false, delay: d * step, dur: 320 });
    if (c.up) setTimeout(() => layer.place(c, { x: L.colX(ci), y: L.ty + row * dn, z: 300 + ci * 110 + row, up: true }), d * step + 300);
    if (d % 2 === 0) setTimeout(() => sfx.deal(), d * step);
    d++;
  }
  await sleep(d * step + 450);
  busy = false;
  render();
  persist();
}

// ---------- Init ----------
let inited = false;
export function enterSpider() {
  const first = !inited;
  if (first) {
    inited = true;
    kortomi.mount();
    screen.querySelector('.topbar-actions').prepend(helpButton('spider', STEPS));
    bindDrag({
      layerEl, layer, byUid: () => byUid, busy: () => busy || !S || S.won,
      press: card => {
        clearHint();
        const p = where(card);
        if (p.t === 'stock') { deal(); return false; }
        if (p.t === 'found') return false;
        return movable(card);
      },
      onTap: (card, m, els) => { const to = autoTarget(m); if (to) { doMove(m.from, to, m.cards.length); vibrate(8); } else shake(els); },
      onHover: (d, x, y) => highlightDrop(dropTarget(d, x, y)),
      onDrop: (d, x, y) => { highlightDrop(null); const t = dropTarget(d, x, y); if (t) { doMove(d.m.from, t, d.m.cards.length); vibrate(8); } else render(); },
      onCancel: () => { highlightDrop(null); render(); },
    });
    $('#sp-new').addEventListener('click', askNew);
    undoBtn.addEventListener('click', undo);
    $('#sp-hint').addEventListener('click', hint);
    dealBtn.addEventListener('click', () => { sfx.tap(); deal(); });
    setInterval(tick, 1000);
    new ResizeObserver(() => { if (table.clientWidth && S && !busy) { computeLayout(); table.classList.add('no-anim'); render({ instant: true }); requestAnimationFrame(() => table.classList.remove('no-anim')); } }).observe(table);
    addEventListener('keydown', e => {
      if (!screen.hasAttribute('data-active') || document.querySelector('.sheet.show, .tut.show')) return;
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey)) || e.key === 'u') { e.preventDefault(); undo(); }
      else if (e.key === ' ') { e.preventDefault(); deal(); }
      else if (e.key === 'h') hint();
    });
  }
  kortomi.sync();
  computeLayout();
  if (first) {
    const sv = store.d.spSave;
    if (sv && sv.tab) { loadSave(sv); layer.clear(); render({ instant: true }); $('#sp-time').textContent = clock(S.time); setTimeout(() => talk('resume', 'wink', 2), 700); }
    else { startNew(); setTimeout(() => talk('enter', 'smug', 2), 900); }
  } else {
    render({ instant: true });
    setTimeout(() => talk('enter', 'smug', 1), 700);
  }
  maybeTutorial('spider', STEPS, 1200);
}
