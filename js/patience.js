// Gemeinsame Bausteine für Spider und FreeCell (an js/solitaire.js angelehnt, aber eigenständig,
// damit Klondike unangetastet bleibt): Ziehen/Antippen, Tipp-Hüpfer, Uhr, Kortomi-Einblendung,
// Sieges-Kaskade und Sieges-Karte.
import { sfx, vibrate } from './audio.js';
import { store } from './store.js';
import { say, mountMascot } from './mascot.js';
import { celebrate, batSwarm } from './fx.js';
import { fmt, toast } from './ui.js';
import { runCascade } from './cascade.js';
import { sleep } from './cards.js';

export const top = a => a[a.length - 1];
export const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const motionOn = () => store.d.settings.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fläche, in der sich zwei Rechtecke überdecken
export const overlap = (ax, ay, aw, ah, bx, by, bw, bh) =>
  Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) * Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));

export function shake(els) {
  sfx.nope(); vibrate(15);
  els.forEach(el => { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); });
}

/**
 * Ziehen & Antippen auf einer Karten-Ebene.
 * press(card) → { cards: [...] } (beweglich), false (schon erledigt, z.B. Stapel) oder null (nicht beweglich)
 * onTap(card, m, els), onHover(d, x, y), onDrop(d, x, y) mit d = { card, m, els, starts }
 */
export function bindDrag({ layerEl, layer, byUid, busy, press, onTap, onHover, onDrop, onCancel }) {
  let drag = null;
  layerEl.addEventListener('pointerdown', e => {
    if (drag || busy()) return;
    const el = e.target.closest('.card');
    if (!el) return;
    const card = byUid().get(el.dataset.uid);
    if (!card) return;
    const m = press(card);
    if (m === false) return;
    if (!m) { if (!card.up) sfx.nope(); else shake([el]); return; }
    e.preventDefault();
    const els = m.cards.map(c => layer.elOf(c));
    const starts = m.cards.map(c => { const s = layer.get(c); return { x: s.x, y: s.y }; });
    drag = { card, m, els, starts, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
    el.setPointerCapture?.(e.pointerId);
  });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.els.forEach((el, i) => { el.classList.add('dragging'); el.style.zIndex = 3000 + i; });
    }
    drag.els.forEach((el, i) => {
      el.style.setProperty('--x', `${drag.starts[i].x + dx}px`);
      el.style.setProperty('--y', `${drag.starts[i].y + dy}px`);
    });
    onHover(drag, drag.starts[0].x + dx, drag.starts[0].y + dy);
  }, { passive: true });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    d.els.forEach(el => el.classList.remove('dragging'));
    if (!d.moved) { if (e.type === 'pointercancel') return; onTap(d.card, d.m, d.els); return; }
    const x = d.starts[0].x + e.clientX - d.sx, y = d.starts[0].y + e.clientY - d.sy;
    if (e.type === 'pointercancel') onCancel(d); else onDrop(d, x, y);
  };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

// Tipp-Animation wie bei Klondike: Quelle hüpft dreimal, danach nickt das Ziel.
export function hopHint(src, dst) {
  if (!motionOn()) return;
  const inner = el => el?.querySelector('.inner') || el;
  src.forEach((el, i) => {
    const t = inner(el); if (!t) return;
    t.animate([
      { translate: '0 0', scale: '1' },
      { translate: '0 -22%', scale: '1.06', offset: 0.35 },
      { translate: '0 0', scale: '1', offset: 0.7 },
      { translate: '0 -6%', scale: '1.02', offset: 0.85 },
      { translate: '0 0', scale: '1' },
    ], { duration: 560, iterations: 3, delay: i * 40, easing: 'cubic-bezier(.3,.7,.4,1)' });
  });
  sfx.flip();
  setTimeout(() => sfx.flip(), 560);
  setTimeout(() => sfx.flip(), 1120);
  const t = inner(dst);
  if (t) setTimeout(() => {
    t.animate([
      { translate: '0 0', rotate: '0deg' },
      { translate: '0 -8%', rotate: '-4deg', offset: 0.3 },
      { translate: '0 0', rotate: '3deg', offset: 0.6 },
      { translate: '0 0', rotate: '0deg' },
    ], { duration: 480, iterations: 2, easing: 'ease-in-out' });
    sfx.place();
  }, 1700);
}

// Kortomi schaut unten rechts herein (wie bei Klondike), respektiert „Kortomi bei Solitaire“.
export function makeTalker(mascotEl, name) {
  let peekT = null, mounted = false;
  const talker = {
    mount() { if (!mounted) { mounted = true; mountMascot(mascotEl, name); } talker.sync(); },
    sync() { mascotEl.classList.toggle('away', !store.d.settings.mascotSol); },
    say(text, mood, priority = 1) {
      if (!store.d.settings.mascotSol || !text) return;
      mascotEl.classList.add('peek');
      clearTimeout(peekT);
      say(name, text, { mood, priority });
      peekT = setTimeout(() => mascotEl.classList.remove('peek'), 4200);
    },
    peek() { mascotEl.classList.add('peek'); },
  };
  return talker;
}

// Karten fliegen von den Ablagen, danach erscheint die Sieges-Karte.
export async function winShow({ table, launches, cw, ch, mascotEl, title = 'Gewonnen!', text, stats, reward, chips, gameName, onNew, extra = '' }) {
  sfx.bigWin(); vibrate([30, 60, 30]);
  celebrate(true);
  setTimeout(() => batSwarm(10), 900);
  if (motionOn() && launches.length) {
    await sleep(700);
    mascotEl?.classList.add('peek');
    await runCascade(table, launches, { cw, ch });
  } else await sleep(1400);
  const ov = document.createElement('div');
  ov.className = 'overlay-card';
  ov.innerHTML = `<h3>${title}</h3><p>${text}</p>
    <div class="stats-row">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    ${chips ? `<div class="sol-reward"><b>+${fmt(chips)} Chips</b><span>${reward.map(([t, v]) => `${t} +${v}`).join(' · ')}</span></div>` : ''}
    ${extra}
    <div class="row"><button class="btn primary" data-act="new">Neues Spiel</button></div>`;
  table.appendChild(ov);
  if (chips) toast(`+${fmt(chips)} Chips`, `Prämie für den ${gameName}-Sieg`);
  ov.querySelector('[data-act=new]').addEventListener('click', () => onNew(ov));
  return ov;
}

// Kleines Auswahlfenster auf dem Tisch (Neues Spiel). Schließt bei Klick daneben.
export function overlay(table, html) {
  table.querySelector('.overlay-card')?.remove();
  const ov = document.createElement('div');
  ov.className = 'overlay-card pat-pick';
  ov.innerHTML = html;
  table.appendChild(ov);
  return ov;
}
