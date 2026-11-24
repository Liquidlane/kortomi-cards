// Gemeinsame Karten-Darstellung: jede Karte ist ein DOM-Element, das per Transform animiert wird.
import { useCard, SUITS } from './art.js';
import { sfx } from './audio.js';

let customBack = null;
export async function detectCustomBack() {
  try {
    const r = await fetch('assets/custom/kartenruecken.png', { method: 'HEAD', cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').startsWith('image')) customBack = 'assets/custom/kartenruecken.png';
  } catch { }
}

export function newDeck(decks = 1) {
  const out = []; let uid = 0;
  for (let d = 0; d < decks; d++) for (const s of SUITS) for (let r = 1; r <= 13; r++) out.push({ uid: `${r}${s}-${d}-${uid++}`, rank: r, suit: s, face: `${r}${s}`, up: false });
  return out;
}
export function shuffle(a) {
  const rnd = new Uint32Array(a.length);
  crypto.getRandomValues(rnd);
  for (let i = a.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export class CardLayer {
  constructor(el) {
    this.el = el;
    this.sprites = new Map();
    this.cw = 80; this.ch = 112;
  }
  setSize(cw, ch) {
    this.cw = cw; this.ch = ch;
    this.el.parentElement.style.setProperty('--cw', `${cw}px`);
    this.el.parentElement.style.setProperty('--ch', `${ch}px`);
  }
  get(card) {
    let s = this.sprites.get(card.uid);
    if (!s) {
      const el = document.createElement('div');
      el.className = 'card down';
      el.dataset.uid = card.uid;
      el.innerHTML = `<div class="inner"><div class="face front">${useCard(card.face)}</div><div class="face back">${customBack ? `<img src="${customBack}" alt="">` : useCard('back')}</div></div>`;
      el.setAttribute('aria-label', '');
      this.el.appendChild(el);
      s = { el, card, x: 0, y: 0, r: 0, z: 0, up: false, t: null };
      this.sprites.set(card.uid, s);
    }
    return s;
  }
  // Karte an Position setzen; Übergänge laufen über CSS
  place(card, { x, y, r = 0, z = 0, up = card.up, delay = 0, instant = false, flySound = false, dur }) {
    const s = this.get(card);
    const el = s.el;
    const moved = s.x !== x || s.y !== y || s.r !== r;
    const apply = () => {
      if (instant) el.style.transition = 'none';
      else el.style.transition = dur ? `transform ${dur}ms var(--ease-out)` : '';
      el.style.setProperty('--x', `${x}px`); el.style.setProperty('--y', `${y}px`); el.style.setProperty('--r', `${r}deg`);
      if (moved && !instant) {
        el.style.zIndex = 1000 + z;
        clearTimeout(s.t);
        s.t = setTimeout(() => { el.style.zIndex = z; }, (dur || 380) + 30);
        if (flySound) sfx.deal();
      } else el.style.zIndex = z;
      if (up !== s.up) {
        el.classList.toggle('down', !up);
        if (!instant) sfx.flip();
      }
      s.up = up;
      if (instant) { void el.offsetWidth; el.style.transition = ''; }
    };
    s.x = x; s.y = y; s.r = r; s.z = z;
    if (delay > 0 && !instant) setTimeout(apply, delay); else apply();
    el.setAttribute('aria-label', up ? describe(card) : 'verdeckte Karte');
    return s;
  }
  remove(card) {
    const s = this.sprites.get(card.uid);
    if (s) { s.el.remove(); this.sprites.delete(card.uid); }
  }
  clear() { this.el.innerHTML = ''; this.sprites.clear(); }
  elOf(card) { return this.sprites.get(card.uid)?.el; }
}

const RN = { 1: 'Ass', 11: 'Bube', 12: 'Dame', 13: 'König' };
const SN = { S: 'Pik', H: 'Herz', D: 'Karo', C: 'Kreuz' };
export const describe = c => `${SN[c.suit]} ${RN[c.rank] || c.rank}`;

export const sleep = ms => new Promise(r => setTimeout(r, ms));
