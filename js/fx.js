// Partikel-Effekte: Fledermäuse, Herzen, Konfetti, Funken.
const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
let parts = [], running = false, dpr = 1;
const COLORS = ['#ff5fa2', '#b89cff', '#e8c27a', '#fff4fa', '#ff9cc7'];

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
}
resize(); addEventListener('resize', resize);

export let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function setReduced(v) { reduced = v || matchMedia('(prefers-reduced-motion: reduce)').matches; }

function bat(ctx, s, flap) {
  ctx.beginPath();
  const w = 1 - flap * 0.5;
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * .4, -s * .5 * w, -s * .9, -s * .5 * w, -s * 1.2, -s * .1 * w);
  ctx.quadraticCurveTo(-s * .9, s * .05, -s * .75, s * .25);
  ctx.quadraticCurveTo(-s * .55, s * .05, -s * .4, s * .3);
  ctx.quadraticCurveTo(-s * .2, s * .1, 0, s * .35);
  ctx.quadraticCurveTo(s * .2, s * .1, s * .4, s * .3);
  ctx.quadraticCurveTo(s * .55, s * .05, s * .75, s * .25);
  ctx.quadraticCurveTo(s * .9, s * .05, s * 1.2, -s * .1 * w);
  ctx.bezierCurveTo(s * .9, -s * .5 * w, s * .4, -s * .5 * w, 0, 0);
  ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, s * .22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * .18, -s * .12); ctx.lineTo(-s * .12, -s * .38); ctx.lineTo(-s * .02, -s * .16); ctx.moveTo(s * .18, -s * .12); ctx.lineTo(s * .12, -s * .38); ctx.lineTo(s * .02, -s * .16); ctx.fill();
}
function heart(ctx, s) {
  ctx.beginPath(); ctx.moveTo(0, s * .35);
  ctx.bezierCurveTo(-s * .9, -s * .2, -s * .4, -s * .9, 0, -s * .35);
  ctx.bezierCurveTo(s * .4, -s * .9, s * .9, -s * .2, 0, s * .35); ctx.fill();
}

function loop() {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  const t = performance.now();
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.life -= 1; p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag;
    if (p.kind === 'bat') { p.vx += Math.sin((t + p.seed) / 260) * 0.08; }
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    const a = Math.max(0.01, Math.min(1, p.life / 30));
    g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color;
    if (p.kind === 'bat') { g.fillStyle = '#2a1238'; g.strokeStyle = p.color; bat(g, p.size, (Math.sin((t + p.seed) / 70) + 1) / 2); }
    else if (p.kind === 'heart') heart(g, p.size);
    else if (p.kind === 'spark') { g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(0, 0, p.size * a, 0, 7); g.fill(); }
    else { g.scale(1, Math.sin((t + p.seed) / 120)); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
    g.restore();
  }
  if (parts.length) requestAnimationFrame(loop); else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
}
function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

const rnd = (a, b) => a + Math.random() * (b - a);

export function burst(x, y, { n = 40, kinds = ['confetti', 'heart'], power = 9 } = {}) {
  if (reduced) n = Math.min(n, 10);
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0), v = rnd(power * .4, power);
    const kind = kinds[i % kinds.length];
    parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, grav: kind === 'spark' ? .05 : .22, drag: .985, rot: rnd(0, 6), vr: rnd(-.2, .2), size: kind === 'heart' ? rnd(8, 14) : kind === 'spark' ? rnd(2, 4) : rnd(7, 12), color: COLORS[i % COLORS.length], life: rnd(70, 120), seed: rnd(0, 1000) });
  }
  start();
}

export function batSwarm(n = 14) {
  if (reduced) n = 4;
  for (let i = 0; i < n; i++) {
    const fromLeft = Math.random() < .5;
    parts.push({ kind: 'bat', x: fromLeft ? -40 : innerWidth + 40, y: rnd(innerHeight * .2, innerHeight * .9), vx: (fromLeft ? 1 : -1) * rnd(3, 6), vy: rnd(-2.5, -.5), grav: -.01, drag: 1, rot: 0, vr: 0, size: rnd(14, 28), color: '#ff5fa2', life: rnd(160, 240), seed: rnd(0, 1000) });
  }
  start();
}

export function celebrate(big = false) {
  const w = innerWidth, h = innerHeight;
  burst(w * .3, h * .55, { n: big ? 60 : 35 });
  setTimeout(() => burst(w * .7, h * .55, { n: big ? 60 : 35 }), 180);
  if (big) { batSwarm(16); setTimeout(() => burst(w * .5, h * .4, { n: 70, kinds: ['confetti', 'heart', 'spark'], power: 13 }), 450); }
}

export function sparkleAt(x, y) { burst(x, y, { n: 14, kinds: ['spark'], power: 4 }); }

// Parallax für das Diorama
export function initParallax() {
  const scene = document.querySelector('.scene');
  let tx = 0, ty = 0;
  const apply = () => { if (reduced) return; scene.style.setProperty('--tilt-x', `${ty}deg`); scene.style.setProperty('--tilt-y', `${tx}deg`); };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = (e.clientX / innerWidth - .5) * 5; ty = -(e.clientY / innerHeight - .5) * 3; apply();
  }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tx = Math.max(-4, Math.min(4, e.gamma / 8)); ty = Math.max(-3, Math.min(3, (e.beta - 45) / 12)); apply();
  }, { passive: true });
}
