// Cloud-Spielstand: 4-stelliger Code, Speicher bei Pantry (getpantry.cloud).
// Einrichtung: auf getpantry.cloud kostenlos eine Pantry anlegen und die ID hier eintragen.
import { store, replaceSave, ACHIEVEMENTS } from './store.js';
import { fmt } from './ui.js';

export const PANTRY_ID = '5dfc8b09-15e7-4acf-9d31-fc6120301a81';
const API = id => `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/kortomi-${id}`;
const CODE_KEY = 'kortomi-cloud-code';

export const cloudReady = () => !!PANTRY_ID;
export const lastCode = () => localStorage.getItem(CODE_KEY) || '';
const validCode = c => /^\d{4}$/.test(c);

// Kurzinfo zu einem Spielstand (lokal oder aus der Cloud)
function summary(d) {
  return { updated: d.updated || 0, balance: d.balance ?? 0, ach: Object.keys(d.ach || {}).length };
}

// Pantry bremst schnelle Anfragen (429 ohne CORS, im Browser ein Netzwerkfehler): kurz warten und nochmal
async function call(url, opt, onWait) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, opt);
      if (r.status !== 429 || i >= 2) return r;
    } catch (e) { if (i >= 2) throw e; }
    onWait?.();
    await new Promise(res => setTimeout(res, 5500 * (i + 1)));
  }
}

export async function fetchCloud(code, onWait) {
  const r = await call(API(code), { cache: 'no-store' }, onWait);
  if (r.status === 400 || r.status === 404) return null; // noch nichts gespeichert
  if (!r.ok) throw new Error('http ' + r.status);
  const b = await r.json();
  if (!b || typeof b.data !== 'string') return null;
  return { ...summary(b), data: b.data };
}

export async function pushCloud(code, onWait) {
  const d = store.d;
  if (!d.updated) d.updated = Date.now();
  const body = { app: 'kortomi-cards', v: 1, ...summary(d), data: JSON.stringify(d) };
  const r = await call(API(code), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, onWait);
  if (!r.ok) throw new Error('http ' + r.status);
  localStorage.setItem(CODE_KEY, code);
}

export function pullCloud(code, cloud) {
  replaceSave(JSON.parse(cloud.data));
  localStorage.setItem(CODE_KEY, code);
}

// ---------- Dialog ----------
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const when = t => (t ? dateFmt.format(new Date(t)) : 'unbekannt');

function sideHTML(title, s, newer) {
  if (!s) return `<div class="cloud-side empty"><h3>${title}</h3><p>Noch kein Spielstand unter diesem Code.</p></div>`;
  return `<div class="cloud-side${newer ? ' newer' : ''}"><h3>${title}${newer ? '<em>neuer</em>' : ''}</h3>
    <div class="cloud-chips">${fmt(s.balance)} <span>Chips</span></div>
    <div class="cloud-meta">${when(s.updated)}<br>${s.ach}/${ACHIEVEMENTS.length} Erfolge</div></div>`;
}

export function cloudHTML() {
  if (!cloudReady()) return `<p class="cloud-intro">Die Cloud ist noch nicht eingerichtet. In <code>js/cloud.js</code> fehlt die Pantry-ID.</p>`;
  return `<p class="cloud-intro">Gib deinen 4-stelligen Code ein. Neu hier? Denk dir einfach einen aus, damit holst du deinen Spielstand auf jedes Gerät.</p>
    <form class="cloud-form" autocomplete="off">
      <input class="cloud-code" type="text" inputmode="numeric" pattern="\\d{4}" maxlength="4" placeholder="••••" value="${lastCode()}" aria-label="4-stelliger Code">
      <button class="btn primary" type="submit">Weiter</button>
    </form>
    <div class="cloud-result" aria-live="polite"></div>`;
}

export function bindCloud(root, { onPulled, onPushed }) {
  const form = root.querySelector('.cloud-form');
  if (!form) return;
  const input = root.querySelector('.cloud-code'), out = root.querySelector('.cloud-result');
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 4); });
  setTimeout(() => input.focus({ preventScroll: true }), 120);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const code = input.value;
    if (!validCode(code)) { out.innerHTML = `<p class="cloud-msg">Der Code braucht genau 4 Ziffern.</p>`; return; }
    out.innerHTML = `<p class="cloud-msg">Kortomi kramt in der Cloud …</p>`;
    let cloud;
    const busy = () => { out.innerHTML = `<p class="cloud-msg">Die Cloud ist kurz beschäftigt, Kortomi versucht’s gleich nochmal …</p>`; };
    try { cloud = await fetchCloud(code, busy); }
    catch { out.innerHTML = `<p class="cloud-msg err">Keine Verbindung zur Cloud. Versuch’s gleich nochmal.</p>`; return; }

    const local = summary(store.d);
    const cloudNewer = cloud && cloud.updated > local.updated;
    const localNewer = !cloud || local.updated > cloud.updated;
    out.innerHTML = `<div class="cloud-compare">${sideHTML('Dieses Gerät', local, cloud && localNewer)}${sideHTML(`Cloud · Code ${code}`, cloud, cloudNewer)}</div>
      <div class="cloud-actions">
        <button class="btn gold" data-cloud="pull" ${cloud ? '' : 'disabled'}>Cloud-Stand übernehmen</button>
        <button class="btn ghost" data-cloud="push">${cloud ? 'Diesen Stand in die Cloud schreiben' : 'Unter diesem Code speichern'}</button>
      </div>`;

    out.querySelector('[data-cloud="pull"]').addEventListener('click', () => {
      if (localNewer && !confirm('Der Stand auf diesem Gerät ist neuer. Trotzdem mit dem Cloud-Stand überschreiben?')) return;
      pullCloud(code, cloud);
      onPulled?.(code);
    });
    out.querySelector('[data-cloud="push"]').addEventListener('click', async ev => {
      if (cloudNewer && !confirm('Der Cloud-Stand ist neuer. Trotzdem mit diesem Gerät überschreiben?')) return;
      const btn = ev.target, label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Speichert …';
      try { await pushCloud(code, () => { btn.textContent = 'Cloud beschäftigt, gleich nochmal …'; }); onPushed?.(code); }
      catch { btn.disabled = false; btn.textContent = label; out.querySelector('.cloud-msg.err')?.remove(); out.insertAdjacentHTML('beforeend', `<p class="cloud-msg err">Speichern hat nicht geklappt. Nochmal versuchen?</p>`); }
    });
  });
}
