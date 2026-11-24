// Sieges-Kaskade: Die Karten springen nacheinander von den Ablagestapeln, hüpfen über den
// Tisch und hinterlassen eine Spur, bis sie seitlich verschwinden. Antippen überspringt.
import { cardFaceSVG } from './art.js';
import { sfx } from './audio.js';

const imgCache = new Map();
function cardImage(card) {
  const key = card.face;
  if (imgCache.has(key)) return imgCache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350">${cardFaceSVG(card.rank, card.suit)}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const p = img.decode().then(() => img).catch(() => img);
  imgCache.set(key, p);
  return p;
}

/**
 * @param {HTMLElement} host   Tisch-Element (Canvas wird darüber gelegt)
 * @param {Array<{card, x, y, el}>} launches  Karten in Startreihenfolge mit Startposition (Tisch-Koordinaten)
 * @param {{cw:number, ch:number}} size
 * @returns {Promise<void>} erfüllt, wenn alle Karten weg sind oder übersprungen wurde
 */
export async function runCascade(host, launches, { cw, ch }) {
  const imgs = await Promise.all(launches.map(l => cardImage(l.card)));
  const W = host.clientWidth, H = host.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.className = 'cascade';
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.setAttribute('aria-label', 'Siegesanimation, antippen zum Überspringen');
  host.appendChild(canvas);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);

  return new Promise(resolve => {
    let i = 0, active = null, last = performance.now(), done = false, frame = 0;
    const floor = H - 4;
    const finish = () => {
      if (done) return; done = true;
      cancelAnimationFrame(frame);
      launches.forEach(l => l.el && (l.el.style.visibility = ''));
      canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350 }).onfinish = () => canvas.remove();
      resolve();
    };
    canvas.addEventListener('pointerdown', finish);

    const launch = () => {
      if (i >= launches.length) return finish();
      const l = launches[i];
      if (l.el) l.el.style.visibility = 'hidden';
      const dir = Math.random() < 0.5 ? -1 : 1;
      active = { img: imgs[i], x: l.x, y: l.y, vx: dir * (2.6 + Math.random() * 5), vy: -(Math.random() * 7), bounces: 0 };
      i++;
    };
    launch();

    const step = now => {
      const dt = Math.min(2.5, (now - last) / 16.67); last = now;
      const c = active;
      c.vy += 0.55 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.y + ch > floor) {
        c.y = floor - ch;
        c.vy = -c.vy * 0.78;
        if (Math.abs(c.vy) < 2) c.vy = -(6 + Math.random() * 4); // nie liegen bleiben
        c.bounces++;
        if (c.bounces < 3) sfx.place();
      }
      // ohne Löschen zeichnen: die Spur entsteht von selbst
      g.drawImage(c.img, c.x, c.y, cw, ch);
      if (c.x > W || c.x + cw < 0) launch();
      if (!done) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });
}
