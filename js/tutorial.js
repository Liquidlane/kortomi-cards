// Kurze Spiel-Tutorials: Kortomi erklärt ein Spiel in ein paar Schritten.
// Jedes Spiel ruft beim Betreten `maybeTutorial('key', STEPS)` auf: beim ersten Mal öffnet sich
// das Tutorial von selbst, danach nur noch über einen Hilfe-Knopf (`showTutorial('key', STEPS)`).
// Ein Schritt: { t: 'Überschrift', d: 'Text (darf <b>-Tags enthalten)', el?: '#selektor' }.
// Mit `el` wird das Element hervorgehoben, damit man sieht, wovon die Rede ist.
import { store } from './store.js';
import { sfx } from './audio.js';

let host = null, steps = [], idx = 0, key = '', ring = null;

function build() {
  host = document.createElement('div');
  host.className = 'tut';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-labelledby', 'tut-title');
  host.innerHTML = `
    <div class="tut-ring" aria-hidden="true"></div>
    <div class="tut-card">
      <div class="tut-dots" aria-hidden="true"></div>
      <h3 id="tut-title"></h3>
      <p class="tut-text"></p>
      <div class="tut-nav">
        <button class="btn ghost tut-skip" type="button">Überspringen</button>
        <button class="btn ghost tut-back" type="button">Zurück</button>
        <button class="btn primary tut-next" type="button">Weiter</button>
      </div>
    </div>`;
  document.body.appendChild(host);
  ring = host.querySelector('.tut-ring');
  host.querySelector('.tut-skip').addEventListener('click', close);
  host.querySelector('.tut-back').addEventListener('click', () => { if (idx > 0) { idx--; render(); sfx.tap?.(); } });
  host.querySelector('.tut-next').addEventListener('click', () => { if (idx < steps.length - 1) { idx++; render(); sfx.tap?.(); } else close(); });
  addEventListener('keydown', e => {
    if (!host.classList.contains('show')) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'ArrowRight') host.querySelector('.tut-next').click();
    if (e.key === 'ArrowLeft') host.querySelector('.tut-back').click();
  }, true);
  addEventListener('resize', () => { if (host.classList.contains('show')) place(); });
}

function place() {
  const s = steps[idx];
  const el = s?.el && document.querySelector(s.el);
  const r = el && el.getBoundingClientRect();
  if (!r || !r.width) { ring.style.opacity = '0'; host.classList.remove('top'); return; }
  const pad = 8;
  Object.assign(ring.style, { opacity: '1', left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  // Karte nach oben, wenn das markierte Element in der unteren Hälfte liegt.
  host.classList.toggle('top', r.top + r.height / 2 > innerHeight * 0.55);
}

function render() {
  const s = steps[idx];
  host.querySelector('#tut-title').textContent = s.t;
  host.querySelector('.tut-text').innerHTML = s.d;
  host.querySelector('.tut-dots').innerHTML = steps.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('');
  host.querySelector('.tut-back').hidden = idx === 0;
  host.querySelector('.tut-skip').hidden = idx === steps.length - 1;
  host.querySelector('.tut-next').textContent = idx === steps.length - 1 ? 'Los geht’s!' : 'Weiter';
  place();
}

function close() {
  host.classList.remove('show');
  if (key) { store.d.tutorials[key] = Date.now(); store.save(); }
  setTimeout(() => host.querySelector('.tut-next')?.blur(), 0);
}

export function showTutorial(k, list) {
  if (!list?.length) return;
  if (!host) build();
  key = k; steps = list; idx = 0;
  render();
  host.classList.add('show');
  setTimeout(() => host.querySelector('.tut-next').focus({ preventScroll: true }), 60);
}

export const tutorialSeen = k => !!store.d.tutorials?.[k];

// Beim ersten Betreten automatisch zeigen (kurz verzögert, damit der Bildschirm schon steht).
export function maybeTutorial(k, list, delay = 450) {
  if (tutorialSeen(k)) return false;
  // Nur zeigen, wenn man noch auf demselben Bildschirm ist (nicht schon weitergetippt).
  const screen = document.querySelector('.screen[data-active]');
  setTimeout(() => {
    if (tutorialSeen(k) || host?.classList.contains('show')) return;
    if (screen && !screen.hasAttribute('data-active')) return;
    showTutorial(k, list);
  }, delay);
  return true;
}

// Fertiger Hilfe-Knopf („?“) für die Kopfzeile eines Spiels.
export function helpButton(k, list) {
  const b = document.createElement('button');
  b.className = 'icon-btn tut-help';
  b.type = 'button';
  b.setAttribute('aria-label', 'Spielregeln anzeigen');
  b.textContent = '?';
  b.addEventListener('click', () => showTutorial(k, list));
  return b;
}
