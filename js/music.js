// Generative Lounge-Musik: Smooth Jazz, komplett im Code synthetisiert (keine Samples, kein Copyright).
// E-Piano (FM mit Tremolo und Auto-Pan), Kontrabass (walking oder 2-Feel), Besen/Ride im Swing,
// ab und zu eine Vibraphon-Melodie. Akkorde aus ii–V–I-, Turnaround- und Moll-Bausteinen,
// jeder Chorus wird neu zusammengewürfelt und moduliert sauber über die Dominante der neuen Tonart.
// Nutzt den AudioContext aus audio.js und startet nie selbst einen – also erst nach dem iOS-Entsperren.
import { audioContext } from './audio.js';
import { store } from './store.js';
import { winterOn } from './winter.js';

const LOOKAHEAD = 0.5, TICK = 160;            // Takte vorausplanen, Timer nur ~6× pro Sekunde
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const R = Math.random;
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pickA = a => a[Math.floor(R() * a.length)];
const chance = p => R() < p;

// ---------- Harmonik ----------
// Akkordtöne, Skalen (für Bass und Melodie) und Voicings (Intervalle über dem Grundton, meist ohne Grundton)
const TONES = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10], 7: [0, 4, 7, 10], '7b9': [0, 4, 7, 10], m7b5: [0, 3, 6, 10] };
const SCALE = { maj7: [0, 2, 4, 7, 9, 11], m7: [0, 2, 3, 5, 7, 9, 10], m9: [0, 2, 3, 5, 7, 10], 7: [0, 2, 4, 7, 9, 10], '7b9': [0, 1, 4, 5, 7, 8, 10], m7b5: [0, 3, 5, 6, 8, 10] };
const VOICE = {
  maj7: [[4, 7, 11, 14], [4, 9, 11, 14], [-1, 4, 7, 9]],
  m7: [[3, 7, 10, 14], [-2, 3, 7, 14]],
  m9: [[3, 7, 10, 14], [3, 10, 14, 17]],
  7: [[4, 10, 14, 21], [-2, 4, 9, 14]],
  '7b9': [[4, 10, 13, 20], [-2, 4, 8, 13]],
  m7b5: [[3, 6, 10, 14], [0, 3, 6, 10]],
};
// Bausteine à 4 Takte: [Stufe in Halbtönen über der Tonika, Qualität, Schläge]
const MAJOR = {
  open: [
    [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 8]],
    [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, '7', 4]],
    [[0, 'maj7', 8], [5, 'maj7', 8]],
  ],
  mid: [
    [[4, 'm7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4]],
    [[5, 'maj7', 4], [5, 'm7', 2], [10, '7', 2], [0, 'maj7', 4], [9, '7', 4]],
    [[11, 'm7b5', 4], [4, '7b9', 4], [9, 'm7', 8]],
    [[2, 'm7', 4], [1, '7', 4], [0, 'maj7', 8]],
    [[0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, '7', 2], [4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]],
  ],
  end: [
    [[4, 'm7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4]],
    [[0, 'maj7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4]],
    [[2, 'm7', 4], [7, '7', 4], [4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]],
  ],
};
const MINOR = {
  open: [
    [[0, 'm9', 8], [5, 'm7', 8]],
    [[2, 'm7b5', 4], [7, '7b9', 4], [0, 'm9', 8]],
  ],
  mid: [
    [[0, 'm9', 4], [5, 'm7', 4], [2, 'm7b5', 4], [7, '7b9', 4]],
    [[8, 'maj7', 4], [7, '7b9', 4], [0, 'm9', 8]],
    [[0, 'm9', 4], [10, '7', 4], [8, 'maj7', 4], [7, '7b9', 4]],
    [[5, 'm7', 4], [10, '7', 4], [3, 'maj7', 4], [8, 'maj7', 4]],
  ],
  end: [
    [[0, 'm9', 4], [5, 'm7', 4], [2, 'm7b5', 4], [7, '7b9', 4]],
    [[0, 'm9', 4], [10, '7', 4], [8, 'maj7', 4], [7, '7b9', 4]],
  ],
};

// ---------- Zustand ----------
let ac = null, out = null, epIn = null, epLP = null, bassBus = null, drumBus = null, leadBus = null, rev = null, noiseBuf = null;
let want = false, playing = false, timer = 0, nextT = 0, stopT = 0;
let vol = 0.5;
let song = null, upcoming = null, barIdx = 0;
let lastVoicing = null, lastBass = 43, leadPitch = 76;

// ---------- Klangerzeuger ----------
function build() {
  ac = audioContext();
  out = ac.createGain(); out.gain.value = 0;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.4;
  out.connect(lp).connect(ac.destination);
  // Kleiner, dunkler Raumhall
  const conv = ac.createConvolver();
  const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
  conv.buffer = ir;
  rev = ac.createGain(); rev.gain.value = 0.32;
  const revLP = ac.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 2400;
  rev.connect(conv).connect(revLP).connect(out);
  // E-Piano: Tiefpass → Tremolo → Auto-Pan
  epIn = ac.createGain();
  epLP = ac.createBiquadFilter(); epLP.type = 'lowpass'; epLP.frequency.value = 2400; epLP.Q.value = 0.3;
  const trem = ac.createGain(); trem.gain.value = 0.8;
  const lfo = ac.createOscillator(); lfo.frequency.value = 4.6;
  const depth = ac.createGain(); depth.gain.value = 0.2;
  lfo.connect(depth).connect(trem.gain); lfo.start();
  epIn.connect(epLP).connect(trem);
  let pan = null;
  try {
    pan = ac.createStereoPanner();
    const pl = ac.createOscillator(); pl.frequency.value = 0.23;
    const pd = ac.createGain(); pd.gain.value = 0.35;
    pl.connect(pd).connect(pan.pan); pl.start();
  } catch { pan = null; }
  const epOut = pan ? (trem.connect(pan), pan) : trem;
  epOut.connect(out); send(epOut, 0.45);
  bassBus = ac.createGain(); bassBus.gain.value = 1; bassBus.connect(out); send(bassBus, 0.08);
  drumBus = ac.createGain(); drumBus.gain.value = 1; drumBus.connect(out); send(drumBus, 0.25);
  // Vibraphon: eigener, langsamer Motor-Tremolo
  leadBus = ac.createGain(); leadBus.gain.value = 0.85;
  const vl = ac.createOscillator(); vl.frequency.value = 5.4;
  const vd = ac.createGain(); vd.gain.value = 0.15;
  vl.connect(vd).connect(leadBus.gain); vl.start();
  leadBus.connect(out); send(leadBus, 0.7);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
}
function send(node, amt) { const s = ac.createGain(); s.gain.value = amt; node.connect(s).connect(rev); }

// Rhodes-artig: Träger + Modulator 1:1 mit schnell abfallendem Index (Anschlag), weiche Ausklingkurve
function ep(t, midi, dur, vel) {
  const f = mtof(midi);
  const c = ac.createOscillator(); c.frequency.value = f;
  const m = ac.createOscillator(); m.frequency.value = f;
  const mi = ac.createGain();
  mi.gain.setValueAtTime(f * (0.9 + vel), t);
  mi.gain.setTargetAtTime(f * 0.12, t, 0.09);
  m.connect(mi).connect(c.frequency);
  const g = ac.createGain();
  const peak = 0.055 * vel;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.006);
  g.gain.setTargetAtTime(peak * 0.45, t + 0.01, 0.35);
  g.gain.setTargetAtTime(0, t + dur, 0.16);
  c.connect(g).connect(epIn);
  const end = t + dur + 0.9;
  c.start(t); m.start(t); c.stop(end); m.stop(end);
}

// Kontrabass: Dreieck + Sinus, Filter schließt nach dem Zupfen
function bass(t, midi, dur, vel = 1) {
  const f = mtof(midi);
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const s = ac.createOscillator(); s.frequency.value = f;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(1500, t); lp.frequency.setTargetAtTime(420, t, 0.07);
  const g = ac.createGain();
  const peak = 0.2 * vel;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.012);
  g.gain.setTargetAtTime(peak * 0.5, t + 0.02, 0.18);
  g.gain.setTargetAtTime(0, t + dur, 0.05);
  const sg = ac.createGain(); sg.gain.value = 0.7;
  o.connect(lp); s.connect(sg).connect(lp); lp.connect(g).connect(bassBus);
  const end = t + dur + 0.3;
  o.start(t); s.start(t); o.stop(end); s.stop(end);
}

// Gefiltertes Rauschen für Besen, Ride, Hi-Hat
function hiss(t, dur, { type = 'bandpass', freq = 2500, q = 0.7, gain = 0.03, attack = 0.004, decay } = {}) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setTargetAtTime(0, t + attack, decay ?? dur / 3);
  src.connect(f).connect(g).connect(drumBus);
  src.start(t, R() * 0.8); src.stop(t + dur + 0.05);
}
const ride = (t, v) => { hiss(t, 0.5, { type: 'highpass', freq: 6800, q: 0.5, gain: 0.022 * v, attack: 0.002, decay: 0.16 }); hiss(t, 0.3, { freq: 4200, q: 6, gain: 0.012 * v, attack: 0.002, decay: 0.12 }); };
const swish = (t, dur, v) => hiss(t, dur, { freq: 3200, q: 0.5, gain: 0.012 * v, attack: dur * 0.5, decay: dur * 0.25 });
const brushTap = (t, v) => hiss(t, 0.25, { freq: 2100, q: 0.8, gain: 0.045 * v, attack: 0.008, decay: 0.07 });
const hat = (t, v) => hiss(t, 0.08, { type: 'highpass', freq: 8200, q: 0.6, gain: 0.018 * v, attack: 0.002, decay: 0.02 });
function kick(t, v) {
  const o = ac.createOscillator(); o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.16);
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + 0.006); g.gain.setTargetAtTime(0, t + 0.01, 0.07);
  o.connect(g).connect(drumBus); o.start(t); o.stop(t + 0.4);
}
// Winter: leises Schlittenglöckchen
function jingle(t, v) {
  for (let i = 0; i < 3; i++) {
    const tt = t + i * 0.018 + R() * 0.01, f = 2600 + R() * 900;
    for (const [mul, a] of [[1, 1], [2.76, 0.4]]) {
      const o = ac.createOscillator(); o.frequency.value = f * mul;
      const g = ac.createGain(); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.006 * v * a, tt + 0.003); g.gain.setTargetAtTime(0, tt + 0.004, 0.06);
      o.connect(g).connect(drumBus); o.start(tt); o.stop(tt + 0.35);
    }
  }
}
// Vibraphon-artig: Sinus + 4:1-Oberton, der schneller verklingt
function vibe(t, midi, dur, vel) {
  const f = mtof(midi);
  const g = ac.createGain(), peak = 0.05 * vel;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.setTargetAtTime(peak * 0.35, t + 0.01, 0.4); g.gain.setTargetAtTime(0, t + dur, 0.2);
  const o = ac.createOscillator(); o.frequency.value = f; o.connect(g);
  const o2 = ac.createOscillator(); o2.frequency.value = f * 4;
  const g2 = ac.createGain(); g2.gain.setValueAtTime(0.25, t); g2.gain.setTargetAtTime(0, t, 0.05);
  o2.connect(g2).connect(g);
  g.connect(leadBus);
  const end = t + dur + 1.2;
  o.start(t); o2.start(t); o.stop(end); o2.stop(end);
}

// ---------- Komposition ----------
function nextKeyInfo(prev) {
  const night = store.d.look?.dealer === 'choc';
  const minor = chance(night ? 0.65 : 0.3);
  // Meist in der Tonart bleiben, gelegentlich wechseln
  if (prev && prev.minor === minor && chance(0.6)) return { minor, key: prev.key };
  const keys = minor ? [0, 2, 5, 7, 9] : [0, 3, 5, 8, 10]; // c d f g a moll / C Es F As B Dur
  return { minor, key: pickA(keys) };
}
function newChorus() {
  const cur = upcoming || nextKeyInfo(null);
  upcoming = nextKeyInfo(cur);
  const night = store.d.look?.dealer === 'choc';
  const bank = cur.minor ? MINOR : MAJOR;
  const phrases = [pickA(bank.open), pickA(bank.mid), pickA(bank.mid), pickA(bank.end)];
  const chords = [];
  for (const ph of phrases) for (const [deg, q, n] of ph) chords.push({ root: (cur.key + deg) % 12, q, n });
  // Schluss-Dominante (und ggf. ii davor) zeigen auf die Tonart des nächsten Chorus
  const last = chords[chords.length - 1], pen = chords[chords.length - 2];
  if (pen && (pen.q === 'm7' || pen.q === 'm7b5') && pen.root === (cur.key + 2) % 12) { pen.root = (upcoming.key + 2) % 12; pen.q = upcoming.minor ? 'm7b5' : 'm7'; }
  last.root = (upcoming.key + 7) % 12; last.q = upcoming.minor ? '7b9' : '7';
  const beats = [];
  for (const c of chords) for (let i = 0; i < c.n; i++) beats.push(c);
  const winter = winterOn();
  song = {
    beats,
    tempo: night ? ri(70, 80) : ri(82, 94),
    swing: 0.6 + R() * 0.07,
    feel: chance(night ? 0.6 : 0.4) ? 'two' : 'walk',
    lead: chance(night ? 0.35 : 0.6) ? 0.25 + R() * 0.3 : 0.05,
    ride: !night && chance(0.75),
    bells: winter && chance(0.6),
    night,
  };
  if (epLP) epLP.frequency.setTargetAtTime(night ? 1500 : 2400, ac.currentTime, 1);
  barIdx = 0;
}

function voicing(c) {
  if (c.voicing) return c.voicing;
  const set = pickA(VOICE[c.q]);
  const ref = lastVoicing ? lastVoicing.reduce((a, b) => a + b, 0) / lastVoicing.length : 63;
  let best = null, bestCost = 1e9;
  for (let inv = 0; inv < set.length; inv++) {
    const iv = set.map((x, j) => (j < inv ? x + 12 : x)).sort((a, b) => a - b);
    for (let o = 3; o <= 6; o++) {
      const notes = iv.map(x => c.root + 12 * o + x);
      if (notes[0] < 50 || notes[notes.length - 1] > 79) continue;
      const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
      const cost = Math.abs(avg - ref) + Math.abs(avg - 63) * 0.4 + R() * 1.5;
      if (cost < bestCost) { bestCost = cost; best = notes; }
    }
  }
  c.voicing = best || [c.root + 60, c.root + 64, c.root + 67];
  lastVoicing = c.voicing;
  return c.voicing;
}

// Comping-Muster: [Achtel 0–7, Dauer in Schlägen, vorgezogen?]
const COMP = [
  [[0, 1.6]], [[0, 0.8], [3, 1.4]], [[1, 0.6], [4, 1.8]], [[3, 1], [7, 1.4, 1]],
  [[0, 3.6]], [[2, 0.5], [5, 0.6], [7, 1.2, 1]], [[0, 1.2], [5, 1.4]], [[4, 2.4]], [],
];
const COMP_NIGHT = [[[0, 3.6]], [[0, 1.8], [4, 2]], [[1, 2.4]], [[0, 3.8]], [[3, 2], [7, 1.4, 1]]];

const nearest = (pc, ref, lo, hi) => {
  let best = null;
  for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === pc && (best === null || Math.abs(m - ref) < Math.abs(best - ref))) best = m;
  return best ?? ref;
};

function playBar(t0) {
  if (!song || barIdx * 4 >= song.beats.length) newChorus();
  const S = song, bd = 60 / S.tempo, at = e => t0 + Math.floor(e / 2) * bd + (e % 2 ? S.swing * bd : 0);
  const base = barIdx * 4, B = S.beats;
  const chordAt = i => B[Math.min(base + i, B.length - 1)];
  const nextChord = i => (base + i + 1 < B.length ? B[base + i + 1] : { root: (upcoming.key) % 12, q: upcoming.minor ? 'm9' : 'maj7' });
  const phraseEnd = barIdx % 4 === 3;

  // E-Piano
  for (const [e, dur, antic] of pickA(S.night ? COMP_NIGHT : COMP)) {
    const beat = Math.floor(e / 2);
    const c = antic && beat === 3 ? nextChord(3) : chordAt(beat);
    const v = voicing(c), vel = 0.55 + R() * 0.3, roll = chance(0.3) ? 0.012 + R() * 0.015 : 0;
    v.forEach((n, j) => ep(at(e) + j * roll + R() * 0.006, n, dur * bd, vel * (j === v.length - 1 ? 1 : 0.85)));
  }

  // Bass
  for (let b = 0; b < 4; b++) {
    const c = chordAt(b), nx = nextChord(b), change = b === 0 ? true : c !== chordAt(b - 1), nextChange = nx !== c;
    if (S.feel === 'two' && (b === 1 || b === 3)) {
      if (b === 3 && nextChange && chance(0.35)) bass(at(7), nearest((nx.root + (chance(0.5) ? 1 : 11)) % 12, lastBass, 36, 52), bd * 0.4, 0.6);
      continue;
    }
    let pc;
    if (change) pc = c.root;
    else if (S.feel === 'two') pc = (c.root + 7) % 12;
    else if (nextChange && chance(0.7)) pc = (nx.root + (chance(0.5) ? 1 : 11)) % 12;   // chromatische Annäherung
    else pc = (c.root + pickA(chance(0.6) ? TONES[c.q] : SCALE[c.q])) % 12;
    const n = nearest(pc, lastBass + (lastBass > 47 ? -3 : lastBass < 40 ? 3 : 0), 36, 52);
    lastBass = n;
    bass(at(b * 2), n, S.feel === 'two' ? bd * 1.85 : bd * 0.92, b === 0 ? 1 : 0.85);
  }

  // Schlagzeug: Besen und Ride im Swing, sehr leise
  const drop = barIdx === 0 && chance(0.15); // ab und zu ein Takt nur mit Klavier
  if (!drop) for (let b = 0; b < 4; b++) {
    const t = at(b * 2), back = b === 1 || b === 3;
    swish(t, bd * 0.95, S.night ? 1.2 : 0.8);
    if (S.ride) { ride(t, back ? 1 : 0.8); if (back && chance(0.85)) ride(at(b * 2 + 1), 0.55); }
    else if (back && chance(0.5)) brushTap(at(b * 2 + 1), 0.3);
    if (back) { brushTap(t, 0.8 + R() * 0.3); hat(t, 1); if (S.bells && chance(0.7)) jingle(t, 1); }
    if ((b === 0 || b === 2) && chance(0.7)) kick(t, 0.6);
  }
  if (phraseEnd && !drop && chance(0.35)) for (let i = 0; i < 3; i++) brushTap(t0 + 3 * bd + i * bd / 3, 0.35 + i * 0.15);

  // Melodie-Floskeln
  if (chance(S.lead) && !(barIdx === 0)) {
    let e = ri(0, 3);
    const notes = ri(3, 6);
    for (let k = 0; k < notes && e < 8; k++) {
      const c = chordAt(Math.floor(e / 2)), last = k === notes - 1 || e >= 6;
      const pcs = (last ? TONES[c.q] : SCALE[c.q]).map(x => (c.root + x) % 12);
      const cands = [];
      for (let m = 67; m <= 86; m++) if (pcs.includes(m % 12)) cands.push(m);
      let idx = cands.findIndex(m => m >= leadPitch); if (idx < 0) idx = cands.length - 1;
      idx += last ? 0 : pickA([-2, -1, -1, 1, 1, 2, 0]);
      if (leadPitch > 80) idx -= 1; if (leadPitch < 70) idx += 1;
      leadPitch = cands[Math.max(0, Math.min(cands.length - 1, idx))];
      const len = last ? ri(2, 4) : pickA([1, 1, 1, 2, 2, 3]);
      vibe(at(e) + R() * 0.01, leadPitch, len * bd * 0.5, 0.6 + R() * 0.35);
      e += len;
    }
  }
  barIdx++;
}

// ---------- Ablauf ----------
function tick() {
  timer = 0;
  if (!playing) return;
  timer = setTimeout(tick, TICK);
  if (ac.state !== 'running') return;
  const now = ac.currentTime;
  if (nextT < now - 0.25) nextT = now + 0.1; // nach Pause/Unterbrechung neu ansetzen
  while (nextT < now + LOOKAHEAD) {
    playBar(nextT);
    nextT += 4 * 60 / song.tempo;
  }
}

function start() {
  if (playing) return;
  const c = audioContext();
  if (!c || c.state !== 'running') { clearTimeout(stopT); stopT = setTimeout(sync, 700); return; } // auf Entsperren warten
  if (!ac) build();
  clearTimeout(stopT);
  playing = true;
  song = null; upcoming = null; lastVoicing = null;
  const t = ac.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
  out.gain.linearRampToValueAtTime(level(), t + 3);
  nextT = t + 0.15;
  tick();
}
function stop(fast) {
  if (!playing) return;
  playing = false;
  clearTimeout(timer); timer = 0;
  const t = ac.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0, t + (fast ? 0.4 : 1.6));
}
const level = () => vol * 0.34;

function sync() {
  clearTimeout(stopT);
  if (want && !document.hidden) start(); else stop(document.hidden);
}

// Aus applySettings: Musik an, wenn "Musik" und die Soundeffekte (Lautsprecher-Knopf) an sind
export function applyMusic(s = store.d.settings) {
  want = !!(s.music && s.sound);
  vol = s.musicVol ?? 0.5;
  if (playing) out.gain.setTargetAtTime(level(), ac.currentTime, 0.2);
  sync();
}
document.addEventListener('visibilitychange', sync);
// iOS kann den Kontext unterbrechen (Anruf, Sperrbildschirm): beim nächsten Antippen weiter
addEventListener('pageshow', sync);
