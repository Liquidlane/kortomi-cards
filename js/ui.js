// Kleine UI-Helfer, die von allen Modulen genutzt werden.
import { store } from './store.js';
import { medalSVG } from './art.js';

const nf = new Intl.NumberFormat('de-DE');
export const fmt = n => nf.format(Math.round(n));

let shown = null;
export function updateBalance(bump = false) {
  const v = store.d.balance;
  document.querySelectorAll('.js-balance').forEach(el => {
    if (!bump || shown == null) { el.textContent = fmt(v); return; }
    const from = shown, start = performance.now();
    const step = t => {
      const k = Math.min(1, (t - start) / 600);
      el.textContent = fmt(from + (v - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  if (bump) document.querySelectorAll('.balance-pill').forEach(p => { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); });
  shown = v;
}

export function toast(title, sub = '', medal = null) {
  const host = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (medal ? '' : ' plain');
  t.innerHTML = `${medal ? medalSVG(medal.m, medal.g) : ''}<div>${sub && medal ? `<small>${sub}</small>` : ''}<b>${title}</b>${sub && !medal ? `<div style="font-size:13px;color:var(--text-dim)">${sub}</div>` : ''}</div>`;
  host.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}
