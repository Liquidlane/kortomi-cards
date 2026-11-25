// Winter-Deko: Schneefall hinter dem Tisch, Lichterkette im Diorama, Mützen für die Croupiers,
// winterliche Sprüche. Automatisch vom 1. Dezember bis 6. Januar, per Einstellung erzwingbar.
// settings.winter: 0 = Auto, 1 = An, 2 = Aus
// Nur von store.js abhängig, damit art.js, clerk.js und mascot.js es gefahrlos importieren können.
import { store } from './store.js';
import { WINTER_LINES } from './lines-streak.js';

export function winterSeason(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  return m === 11 || (m === 0 && day <= 6);
}
export function winterOn() {
  const w = store.d.settings.winter ?? 0;
  return w === 1 || (w === 0 && winterSeason());
}

// ---------- Mützen (werden immer mitgezeichnet, CSS blendet sie nur im Winter ein) ----------
export function winterHat(who) {
  if (who === 'choc') {
    // Elfenmütze, grün mit Glöckchen – sitzt auf der Pudding-Haube
    return `<g class="winter-hat choc-hat" transform="rotate(-6 120 84)">
      <path d="M84 92 Q96 40 132 22 Q152 14 172 30 Q156 30 150 40 Q146 66 156 92 Z" fill="#2f8a4e"/>
      <path d="M132 22 Q152 14 172 30 Q158 26 146 34Z" fill="#23703d"/>
      <path d="M100 86 Q110 52 132 34" stroke="#56b874" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M78 88 Q120 70 162 88 L164 102 Q120 84 76 102Z" fill="#d8344a"/>
      <path d="M86 92 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" stroke="#ffd36b" stroke-width="2" fill="none" opacity=".8"/>
      <circle cx="174" cy="32" r="8" fill="#e8c27a" stroke="#b98a3e" stroke-width="2"/><circle cx="174" cy="35" r="2" fill="#6b4a1e"/>
    </g>`;
  }
  // Weihnachtsmütze für Kortomi – schräg über dem Croupier-Schirm, Bommel hängt zur Seite
  return `<g class="winter-hat">
    <path d="M70 60 Q84 10 132 4 Q170 2 196 30 Q176 24 160 30 Q164 46 170 60 Z" fill="#d8344a"/>
    <path d="M132 4 Q170 2 196 30 Q178 22 156 24Z" fill="#a8233a"/>
    <path d="M92 50 Q104 24 128 14" stroke="#ff7a8e" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M62 62 Q120 38 178 62 Q182 72 176 78 Q120 54 64 78 Q58 72 62 62Z" fill="#fff6fb"/>
    <path d="M70 70 q8 -4 14 0 M100 60 q8 -4 14 0 M132 58 q8 -3 14 1 M160 66 q6 -2 10 2" stroke="#e4d8ee" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="198" cy="34" r="11" fill="#fff6fb"/><circle cx="195" cy="31" r="4" fill="#fff" opacity=".9"/>
  </g>`;
}

// ---------- Winterliche Sprüche ----------
// Gibt ab und zu (40 %) eine Wintervariante für den Schlüssel zurück, sonst ''.
const bags = {};
export function seasonalLine(key, choc) {
  if (!winterOn() || Math.random() > 0.4) return '';
  const arr = WINTER_LINES[choc ? 'choc' : 'kortomi'][key];
  if (!arr || !arr.length) return '';
  const id = (choc ? 'c:' : 'k:') + key;
  if (!bags[id] || !bags[id].length) bags[id] = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
  return arr[bags[id].pop()];
}

// ---------- Deko im Diorama ----------
let deco = null;
function ensureDeco() {
  if (deco) return;
  const wall = document.querySelector('.diorama .wall');
  if (!wall) return;
  // Drei Girlanden-Bögen mit Lichtern quer über die Wand
  const W = 1000, swags = [[0, 333], [333, 667], [667, 1000]];
  const COLS = ['#ff5f7a', '#ffd36b', '#7ee0a1', '#8ec5ff', '#ff9cc7'];
  let path = '', bulbs = '', k = 0;
  for (const [a, b] of swags) {
    const m = (a + b) / 2;
    path += `M${a} 10 Q${m} 90 ${b} 10 `;
    for (let i = 1; i < 8; i++) {
      const t = i / 8, x = (1 - t) ** 2 * a + 2 * (1 - t) * t * m + t * t * b, y = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 90 + t * t * 10;
      bulbs += `<circle class="wb b${k % 3}" cx="${x.toFixed(1)}" cy="${(y + 7).toFixed(1)}" r="6" fill="${COLS[k % COLS.length]}"/>`;
      k++;
    }
  }
  deco = document.createElement('div');
  deco.className = 'winter-deco';
  deco.innerHTML = `<svg class="winter-garland" viewBox="0 0 ${W} 110" preserveAspectRatio="none" aria-hidden="true">
      <path d="${path}" fill="none" stroke="#1f5a34" stroke-width="12" stroke-linecap="round"/>
      <path d="${path}" fill="none" stroke="#2f8a4e" stroke-width="6" stroke-dasharray="3 9" stroke-linecap="round"/>
      ${bulbs}
    </svg>`;
  wall.appendChild(deco);
}

// ---------- Schneefall (eigene Leinwand hinter dem Spieltisch) ----------
let cv = null, g = null, flakes = [], raf = 0, lastF = 0, w = 0, h = 0, dpr = 1;
function sizeSnow() {
  if (!cv) return;
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  w = innerWidth; h = innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const n = Math.round(Math.min(90, Math.max(30, (w * h) / 14000)));
  while (flakes.length < n) flakes.push(flake(true));
  flakes.length = n;
}
function flake(anyY) {
  const z = 0.35 + Math.random() * 0.65; // Tiefe: vorne größer, schneller, heller
  return { x: Math.random() * w, y: anyY ? Math.random() * h : -10, z, r: 0.8 + z * 2.2, vy: 0.25 + z * 0.75, ph: Math.random() * 6.28, a: 0.25 + z * 0.55 };
}
function frame(t) {
  raf = requestAnimationFrame(frame);
  if (t - lastF < 33) return; // ~30 fps reichen für Schnee
  const dt = Math.min(3, (t - lastF) / 16.7); lastF = t;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fff';
  for (const f of flakes) {
    f.y += f.vy * dt; f.ph += 0.02 * dt;
    f.x += Math.sin(f.ph) * 0.35 * f.z * dt;
    if (f.y > h + 6) { Object.assign(f, flake(false)); }
    g.globalAlpha = f.a;
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill();
  }
}
function startSnow() {
  if (!cv) {
    const dio = document.querySelector('.diorama');
    if (!dio) return;
    cv = document.createElement('canvas');
    cv.className = 'winter-snow'; cv.setAttribute('aria-hidden', 'true');
    dio.insertBefore(cv, dio.querySelector('.vignette'));
    g = cv.getContext('2d');
    addEventListener('resize', sizeSnow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else if (wantSnow) startLoop(); });
  }
  cv.hidden = false;
  sizeSnow();
  startLoop();
}
function startLoop() { if (!raf && !document.hidden) { lastF = 0; raf = requestAnimationFrame(frame); } }
function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
let wantSnow = false;
function stopSnow() { wantSnow = false; stopLoop(); if (cv) cv.hidden = true; }

// ---------- Anwenden (aus applySettings) ----------
export function applyWinter(s = store.d.settings) {
  const on = winterOn();
  document.documentElement.classList.toggle('winter', on);
  if (on) ensureDeco();
  const motion = s.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (on && motion) { wantSnow = true; startSnow(); } else stopSnow();
}
