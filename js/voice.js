// Kortomis Brabbel-Stimme: Für jeden Buchstaben wird beim Start ein kurzes Sample per
// Formant-Synthese erzeugt (Stimmlippen-Puls durch drei Resonatoren, plus Rauschen für Konsonanten).
// Beim Sprechen wird jedes Sample schnell und hochgepitcht abgespielt.

// Formanten F1/F2/F3 in Hz (weibliche Stimme, grob)
const VOW = {
  a: [820, 1350, 2700], e: [440, 2150, 2850], i: [300, 2450, 3150], o: [480, 860, 2600], u: [330, 760, 2500],
  ä: [650, 1850, 2650], ö: [420, 1480, 2450], ü: [300, 1780, 2450],
};
const BW = [80, 110, 160];
const AMP = [1, 0.55, 0.22];

// Konsonant + Vokal je Buchstabe (an die deutschen Buchstabennamen angelehnt)
const LET = {
  a: { v: 'a' }, b: { c: 'plo', cf: 700, v: 'e' }, c: { c: 'fri', cf: 3800, v: 'e' }, d: { c: 'plo', cf: 2400, v: 'e' },
  e: { v: 'e' }, f: { c: 'fri', cf: 1700, bw: 2200, v: 'e' }, g: { c: 'plo', cf: 1500, v: 'e' }, h: { c: 'asp', v: 'a' },
  i: { v: 'i' }, j: { glide: [290, 2300], v: 'o' }, k: { c: 'plo', cf: 1700, v: 'a' }, l: { glide: [360, 1150], v: 'e' },
  m: { nasal: 1, v: 'e' }, n: { nasal: 1, v: 'e' }, o: { v: 'o' }, p: { c: 'plo', cf: 850, v: 'e' }, q: { c: 'plo', cf: 1500, v: 'u' },
  r: { glide: [460, 1250], v: 'e', trill: 1 }, s: { c: 'fri', cf: 4000, v: 'e' }, t: { c: 'plo', cf: 2800, v: 'e' },
  u: { v: 'u' }, v: { c: 'fri', cf: 1500, bw: 2200, v: 'a' }, w: { glide: [320, 780], v: 'e' }, x: { c: 'fri', cf: 3800, v: 'i' },
  y: { v: 'ü' }, z: { c: 'fri', cf: 3900, v: 'e' }, ä: { v: 'ä' }, ö: { v: 'ö' }, ü: { v: 'ü' }, ß: { c: 'fri', cf: 4000, v: 'e' },
};

function resonator(sr) {
  let y1 = 0, y2 = 0;
  return (x, F, bw) => {
    const r = Math.exp(-Math.PI * bw / sr);
    const y = (1 - r) * x + 2 * r * Math.cos(2 * Math.PI * F / sr) * y1 - r * r * y2;
    y2 = y1; y1 = y;
    return y;
  };
}

// weicher Stimmlippen-Puls (Rosenberg-Form)
const glottal = ph => (ph < 0.4 ? 0.5 * (1 - Math.cos(Math.PI * ph / 0.4)) : ph < 0.56 ? Math.cos(Math.PI * (ph - 0.4) / 0.32) : 0) - 0.3;

function renderLetter(spec, sr) {
  const cLen = spec.c === 'plo' ? 0.014 : spec.c ? 0.032 : 0;
  const vDur = 0.105;
  const n = Math.ceil((cLen + vDur) * sr);
  const out = new Float32Array(n);
  // Konsonant: gefiltertes Rauschen
  if (spec.c) {
    const res = resonator(sr);
    const cn = Math.floor(cLen * sr);
    const bw = spec.c === 'asp' ? 2600 : spec.bw || 1300;
    const cf = spec.c === 'asp' ? 1400 : spec.cf;
    for (let i = 0; i < cn + sr * 0.01 && i < n; i++) {
      const env = spec.c === 'plo' ? Math.exp(-i / (0.004 * sr)) : Math.sin(Math.PI * Math.min(1, i / cn)) * 0.8;
      out[i] += res(Math.random() * 2 - 1, cf, bw) * env * (spec.c === 'plo' ? 2.4 : 1.4);
    }
  }
  // Vokal mit Übergang aus dem Konsonanten
  const target = VOW[spec.v];
  const from = spec.nasal ? [260, 1150, 2500]
    : spec.glide ? [spec.glide[0], spec.glide[1], target[2]]
      : spec.c === 'plo' ? target.map((f, k) => f * (k === 0 ? 0.6 : 0.85))
        : target;
  const rs = [resonator(sr), resonator(sr), resonator(sr)];
  const start = Math.floor(cLen * sr * 0.6);
  let ph = 0;
  for (let i = start; i < n; i++) {
    const t = (i - start) / sr;
    const k = Math.min(1, t / 0.032);
    const ease = k * k * (3 - 2 * k);
    let f0 = 210 * (1 + 0.03 * Math.sin(2 * Math.PI * 6 * t)) * (1 - 0.1 * t / vDur);
    if (spec.trill) f0 *= 1 + 0.06 * Math.sin(2 * Math.PI * 28 * t) * (1 - k);
    ph += f0 / sr; if (ph >= 1) ph -= 1;
    const src = glottal(ph);
    let y = 0;
    for (let j = 0; j < 3; j++) y += rs[j](src, from[j] + (target[j] - from[j]) * ease, BW[j]) * AMP[j];
    const att = Math.min(1, t / 0.008);
    const rel = Math.min(1, (n - i) / (0.035 * sr));
    const nas = spec.nasal ? 0.45 + 0.55 * ease : 1;
    out[i] += y * att * rel * nas;
  }
  // normalisieren
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.9 / peak;
  return out;
}

export function buildVoiceBank(ctx) {
  const bank = {};
  for (const [ch, spec] of Object.entries(LET)) {
    const data = renderLetter(spec, ctx.sampleRate);
    const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buf.copyToChannel(data, 0);
    bank[ch] = buf;
  }
  return bank;
}

const DIGIT_VOWELS = 'aeiouaeiou';
export function letterKey(ch) {
  const c = ch.toLowerCase();
  if (LET[c]) return c;
  if (/[0-9]/.test(c)) return DIGIT_VOWELS[+c];
  if ('àáâ'.includes(c)) return 'a';
  if ('èéê'.includes(c)) return 'e';
  return null;
}
