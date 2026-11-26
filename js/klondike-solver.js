// Klondike-Löser für die Tagesaufgabe (1 Karte ziehen, beliebig viele Durchgänge). Ohne DOM, auch in Node testbar.
// Weil man bei „1 ziehen“ unbegrenzt durch den Stapel blättern kann, ist jede Talon-Karte jederzeit erreichbar:
// Der Talon wird daher als Menge behandelt. Jede gefundene Lösung ist echt spielbar.
// Ergebnis: true = lösbar, false = sicher unlösbar, null = Budget erschöpft (unbekannt).

const SUIT_IDX = { S: 0, H: 1, C: 2, D: 3 }; // ungerade = rot
const rk = c => c % 13 + 1, st = c => (c / 13) | 0, red = c => st(c) & 1;

export function solveKlondike(deck, budget = 150000) {
  const cards = deck.map(c => SUIT_IDX[c.suit] * 13 + c.rank - 1);
  const down = [[], [], [], [], [], [], []], up = [[], [], [], [], [], [], []];
  let k = 0;
  for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) down[j].push(cards[k++]);
  for (const col of down) up[down.indexOf(col)].push(col.pop());
  const start = { down, up, found: [0, 0, 0, 0], talon: cards.slice(k) };

  const seen = new Set();
  let nodes = 0, exhausted = false;

  const clone = s => ({ down: s.down.map(a => a.slice()), up: s.up.map(a => a.slice()), found: s.found.slice(), talon: s.talon.slice() });
  const canF = (s, c) => s.found[st(c)] === rk(c) - 1;
  const canT = (col, c) => col.length ? (red(col[col.length - 1]) !== red(c) && rk(col[col.length - 1]) === rk(c) + 1) : rk(c) === 13;
  const safe = (s, c) => {
    const r = rk(c);
    if (r <= 2) return true;
    const o = red(c) ? [0, 2] : [1, 3];
    return s.found[o[0]] >= r - 1 && s.found[o[1]] >= r - 1;
  };
  const flip = (s, i) => { if (!s.up[i].length && s.down[i].length) s.up[i].push(s.down[i].pop()); };

  // Sichere Ablagen ohne Verzweigung
  function auto(s) {
    for (let moved = true; moved;) {
      moved = false;
      for (let i = 0; i < 7; i++) {
        const col = s.up[i]; if (!col.length) continue;
        const c = col[col.length - 1];
        if (canF(s, c) && safe(s, c)) { col.pop(); s.found[st(c)]++; flip(s, i); moved = true; }
      }
      for (let t = 0; t < s.talon.length; t++) {
        const c = s.talon[t];
        if (canF(s, c) && safe(s, c)) { s.talon.splice(t, 1); s.found[st(c)]++; t--; moved = true; }
      }
    }
  }
  const enc = a => String.fromCharCode(...a.map(c => c + 48));
  const key = s => s.found.join(',') + '|' + s.talon.slice().sort((a, b) => a - b).map(c => c + 48).map(c => String.fromCharCode(c)).join('') + '|' +
    s.down.map((d, i) => enc(d) + ':' + enc(s.up[i])).sort().join('/');

  function moves(s) {
    const reveal = [], found = [], fromTalon = [], shuffle = [], back = [];
    for (let i = 0; i < 7; i++) {
      const col = s.up[i]; if (!col.length) continue;
      const top = col[col.length - 1];
      if (canF(s, top)) found.push(['tf', i]);
      for (let x = 0; x < col.length; x++) {
        const c = col[x];
        const exposes = x === 0 && s.down[i].length > 0;
        for (let j = 0; j < 7; j++) {
          if (j === i || !canT(s.up[j], c)) continue;
          if (!s.up[j].length && x === 0 && !s.down[i].length) continue; // König von leer nach leer
          (exposes ? reveal : shuffle).push(['tt', i, x, j]);
          if (!s.up[j].length) break; // ein leeres Ziel reicht
        }
      }
    }
    for (let t = 0; t < s.talon.length; t++) {
      const c = s.talon[t];
      if (canF(s, c)) found.push(['wf', t]);
      for (let j = 0; j < 7; j++) if (canT(s.up[j], c)) { fromTalon.push(['wt', t, j]); if (!s.up[j].length) break; }
    }
    for (let f = 0; f < 4; f++) {
      if (s.found[f] < 3) continue;
      const c = f * 13 + s.found[f] - 1;
      for (let j = 0; j < 7; j++) if (s.up[j].length && canT(s.up[j], c)) back.push(['ft', f, j]);
    }
    return [...reveal, ...found, ...fromTalon, ...shuffle, ...back];
  }

  function apply(s, m) {
    const n = clone(s);
    if (m[0] === 'tf') { const c = n.up[m[1]].pop(); n.found[st(c)]++; flip(n, m[1]); }
    else if (m[0] === 'tt') { const run = n.up[m[1]].splice(m[2]); n.up[m[3]].push(...run); flip(n, m[1]); }
    else if (m[0] === 'wf') { const [c] = n.talon.splice(m[1], 1); n.found[st(c)]++; }
    else if (m[0] === 'wt') { const [c] = n.talon.splice(m[1], 1); n.up[m[2]].push(c); }
    else if (m[0] === 'ft') { n.found[m[1]]--; n.up[m[2]].push(m[1] * 13 + n.found[m[1]]); }
    auto(n);
    return n;
  }

  function dfs(s) {
    if (s.talon.length === 0 && s.down.every(d => !d.length)) return true; // alles offen: immer zu Ende spielbar
    if (++nodes > budget) { exhausted = true; return false; }
    const kk = key(s);
    if (seen.has(kk)) return false;
    seen.add(kk);
    for (const m of moves(s)) {
      if (dfs(apply(s, m))) return true;
      if (exhausted) return false;
    }
    return false;
  }

  auto(start);
  const ok = dfs(start);
  return ok ? true : exhausted ? null : false;
}
