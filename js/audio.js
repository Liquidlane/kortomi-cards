// Synthetische Soundeffekte mit WebAudio — weich abgestimmt: keine Rechteck-/Sägezahnwellen,
// Höhen gedämpft, sanfte Anschläge und ein kleiner Raumhall für Wärme.
import { buildVoiceBank, letterKey } from './voice.js';
let ctx = null, master = null, bus = null, verb = null, noiseBuf = null;
let enabled = true, volume = 0.7, voiceOn = true, voicePitch = 1, voiceBank = null, lastVoice = null;

export function configureAudio({ sound, vol, voice, pitch }) {
  if (pitch !== undefined) voicePitch = pitch;
  if (sound !== undefined) enabled = sound;
  if (vol !== undefined) volume = vol;
  if (voice !== undefined) voiceOn = voice;
  if (master) master.gain.value = volume * 0.9;
}

function makeImpulse(seconds = 1.1, decay = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.9;
    // Höhen sanft abschneiden, dann leicht komprimieren
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200; tone.Q.value = 0.5;
    const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 3000; shelf.gain.value = -6;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    master.connect(tone).connect(shelf).connect(comp).connect(ctx.destination);
    bus = ctx.createGain(); bus.connect(master);
    // Raumhall
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse();
    verb = ctx.createGain(); verb.gain.value = 0.22;
    const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 2800;
    verb.connect(conv).connect(verbLP).connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // "rosa" angehauchtes Rauschen: weniger zischelig als weißes
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2;
    }
    voiceBank = buildVoiceBank(ctx);
  }
  // iOS: Audio als "Wiedergabe" markieren, damit der Stumm-Schalter nicht stummschaltet (iOS 17+)
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
  // iOS kennt neben 'suspended' auch 'interrupted' (nach App-Wechsel, Anruf, Sperrbildschirm)
  if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
  // iOS entsperrt WebAudio erst zuverlässig, wenn innerhalb der Geste etwas abgespielt wird
  try {
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination); s.start(0);
  } catch {}
}

const ok = () => enabled && ctx && ctx.state === 'running';
const now = () => ctx.currentTime;
// Für die Hintergrundmusik (music.js): derselbe Kontext, erst nach unlockAudio() vorhanden
export const audioContext = () => ctx;

function env(g, t, peak, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(t, dur, { type = 'bandpass', freq = 1500, q = 0.7, gain = 0.12, attack = 0.006, sweep = 0, wet = 0 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  const g = ctx.createGain(); env(g, t, gain, attack, dur);
  src.connect(f).connect(g).connect(bus);
  if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s).connect(verb); }
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(t, freq, dur, { type = 'sine', gain = 0.08, attack = 0.012, slide = 0, wet = 0.5, detune = 0 } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur * 0.8);
  const g = ctx.createGain(); env(g, t, gain, attack, dur);
  o.connect(g).connect(bus);
  if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s).connect(verb); }
  o.start(t); o.stop(t + dur + 0.05);
}

// Glockiger Ton: Grundton + leiser, leicht verstimmter Oberton
function bell(t, f, dur = 0.9, gain = 0.07) {
  tone(t, f, dur, { gain, attack: 0.01, wet: 0.7 });
  tone(t, f * 2.005, dur * 0.5, { gain: gain * 0.25, attack: 0.008, wet: 0.7 });
  tone(t, f * 0.5, dur * 0.7, { type: 'triangle', gain: gain * 0.35, attack: 0.02, wet: 0.3 });
}

export const sfx = {
  deal() { if (!ok()) return; const t = now(); noise(t, 0.13, { freq: 1300, q: 0.6, gain: 0.1, attack: 0.01, sweep: 0.6 }); tone(t + 0.06, 140, 0.08, { gain: 0.05, wet: 0 }); },
  flip() { if (!ok()) return; noise(now(), 0.08, { freq: 1700, q: 0.8, gain: 0.07, attack: 0.008 }); },
  place() { if (!ok()) return; const t = now(); noise(t, 0.1, { type: 'lowpass', freq: 520, q: 0.5, gain: 0.16 }); tone(t, 110, 0.09, { gain: 0.04, wet: 0 }); },
  chip(n = 1) {
    if (!ok()) return; const t = now();
    for (let i = 0; i < Math.min(n, 4); i++) {
      const tt = t + i * 0.055 + Math.random() * 0.012;
      const f = 1900 + Math.random() * 400;
      tone(tt, f, 0.11, { gain: 0.035, attack: 0.003, wet: 0.25 });
      tone(tt, f * 1.48, 0.07, { gain: 0.012, attack: 0.003, wet: 0.2 });
      noise(tt, 0.04, { freq: 2400, q: 1.2, gain: 0.05, attack: 0.002 });
    }
  },
  shuffle() { if (!ok()) return; const t = now(); for (let i = 0; i < 16; i++) noise(t + i * 0.045 + Math.random() * 0.012, 0.07, { freq: 1200 + Math.random() * 500, q: 0.6, gain: 0.06, attack: 0.01 }); },
  tap() { if (!ok()) return; tone(now(), 620, 0.07, { gain: 0.03, attack: 0.006, wet: 0.15 }); },
  nope() { if (!ok()) return; const t = now(); tone(t, 260, 0.16, { type: 'triangle', gain: 0.045, slide: 0.8, wet: 0.1 }); },
  win() { if (!ok()) return; const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(t + i * 0.11, f, 0.9, 0.055)); },
  bigWin() {
    if (!ok()) return; const t = now();
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => bell(t + i * 0.1, f, 1.1, 0.05));
    for (let i = 0; i < 7; i++) tone(t + 0.75 + i * 0.07, 1568 + Math.random() * 800, 0.4, { gain: 0.012, wet: 0.9 });
  },
  lose() { if (!ok()) return; const t = now(); tone(t, 392, 0.35, { type: 'triangle', gain: 0.05, wet: 0.4 }); tone(t + 0.22, 311.1, 0.6, { type: 'triangle', gain: 0.05, slide: 0.94, wet: 0.5 }); },
  push() { if (!ok()) return; const t = now(); bell(t, 587.33, 0.5, 0.04); bell(t + 0.16, 587.33, 0.6, 0.035); },
  sparkle() { if (!ok()) return; const t = now(); [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(t + i * 0.07, f, 0.6, { gain: 0.02, wet: 0.9 })); },
  whoosh() { if (!ok()) return; noise(now(), 0.3, { freq: 600, q: 0.5, gain: 0.06, attack: 0.1, sweep: 2.2 }); },
  // Spukautomat: Anlaufen, Klackern beim Drehen, dumpfer Halt einer Walze
  reelStart() { if (!ok()) return; const t = now(); tone(t, 180, 0.35, { type: 'triangle', gain: 0.035, slide: 2.4, wet: 0.2 }); noise(t, 0.25, { freq: 900, q: 0.6, gain: 0.04, attack: 0.04, sweep: 1.8 }); },
  reelTick() { if (!ok()) return; noise(now(), 0.03, { freq: 2600 + Math.random() * 600, q: 2, gain: 0.025, attack: 0.002 }); },
  reelStop() { if (!ok()) return; const t = now(); noise(t, 0.09, { type: 'lowpass', freq: 700, q: 0.8, gain: 0.14 }); tone(t, 92, 0.12, { type: 'triangle', gain: 0.06, slide: 0.7, wet: 0.05 }); tone(t + 0.01, 1240, 0.05, { gain: 0.015, wet: 0.2 }); },
};

// Kortomis Brabbel-Stimme: ein Buchstaben-Sample pro Zeichen, schnell und hochgepitcht
const PITCH = [0.82, 1, 1.2];
const MOOD_PITCH = { happy: 1.08, love: 1.12, shock: 1.16, sad: 0.88, smug: 0.95, think: 0.97, wink: 1.04, idle: 1 };
export function speak(ch, { mood = 'idle', rise = 0, loud = false, pitch = 1 } = {}) {
  if (!ok() || !voiceOn || !voiceBank) return;
  const key = letterKey(ch);
  if (!key) return;
  const t = now();
  // vorherige Silbe weich ausblenden, damit es nicht matscht
  if (lastVoice) { try { lastVoice.gain.cancelScheduledValues(t); lastVoice.gain.setTargetAtTime(0, t, 0.012); } catch { } }
  const src = ctx.createBufferSource();
  src.buffer = voiceBank[key];
  const rate = 1.7 * pitch * (PITCH[voicePitch] ?? 1) * (MOOD_PITCH[mood] ?? 1) * (1 + rise) * (0.95 + Math.random() * 0.1);
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = loud ? 0.2 : 0.15;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
  src.connect(lp).connect(g).connect(bus);
  const send = ctx.createGain(); send.gain.value = 0.12; g.connect(send).connect(verb);
  src.start(t);
  lastVoice = g;
}

export function vibrate(ms = 10) { if (navigator.vibrate && enabled) try { navigator.vibrate(ms); } catch { } }
