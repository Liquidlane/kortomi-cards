// Upgrade-Shop: Mit Chips neue Spiele, Tischfilze, Kartenrücken und Extras kaufen.
import { store, owns, unlock } from './store.js';
import { cardBackSVG, setCardBack, chipSVG, useCard, icon, kortomiSVG } from './art.js';
import { remountAll } from './mascot.js';
import { sfx } from './audio.js';
import { fmt, updateBalance, toast } from './ui.js';
import { burst } from './fx.js';
import { clerkHTML, clerkEvent, chocSVG } from './clerk.js';
import { claimStreak, nextStreak, streakBonus } from './progress.js';
import { slotsArt } from './slots.js';

// Figur-Vorschau mit eigenen Verlauf-IDs, damit sie nicht mit den Tisch-Figuren kollidiert
const figure = (svg, tag) => svg.replace(/id="k-([\w-]+)"/g, `id="k-$1-${tag}"`).replace(/url\(#k-([\w-]+)\)/g, `url(#k-$1-${tag})`);
const mini = (id, x, y, r) => `<span class="mini" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)">${useCard(id)}</span>`;

// Katalog. `free` = von Anfang an da (Standardlook).
export const CATALOG = [
  {
    key: 'games', title: 'Spiele', items: [
      { id: 'game_hilo', name: 'Höher oder Tiefer', price: 2000, desc: 'Rate die nächste Karte. Jeder Treffer erhöht den Multiplikator – kassier, bevor es kracht.', art: () => mini('7H', 8, 10, -10) + mini('back', 46, 4, 8) },
      { id: 'game_slots', name: 'Kortomis Spukautomat', price: 3500, desc: 'Spielautomat mit drei Walzen und fünf Linien. Kortomi ist der Joker – dreimal sie zahlt 50-fach.', art: () => `<span class="shop-slots">${slotsArt()}</span>` },
      { id: 'game_poker', name: 'Video-Poker', price: 5000, desc: 'Jacks or Better: fünf Karten, halten, nachziehen. Royal Flush zahlt 250-fach.', art: () => mini('1S', 2, 10, -12) + mini('13S', 30, 4, -2) + mini('12S', 58, 10, 9) },
      { id: 'game_baccarat', name: 'Baccarat', price: 4000, desc: 'Punto Banco: Setz auf Spieler, Bank oder Unentschieden. Wer näher an der 9 liegt, gewinnt. Unentschieden zahlt 8:1.', art: () => mini('9H', 8, 8, -9) + mini('13C', 46, 4, 8) },
      { id: 'game_freecell', name: 'FreeCell', price: 2500, desc: 'Alle Karten offen, vier freie Zellen. Kein Glück, nur Köpfchen. Mit Spielnummern zum Nachspielen.', art: () => mini('13D', 4, 8, -10) + mini('12C', 30, 3, 0) + mini('11H', 56, 8, 10) },
      { id: 'game_spider', name: 'Spider', price: 3500, desc: 'Zwei Decks, zehn Spalten, 1, 2 oder 4 Farben. Volle Folgen König bis Ass räumen ab.', art: () => mini('13S', 4, 4, -8) + mini('12S', 22, 14, -2) + mini('11S', 40, 24, 4) + mini('10S', 58, 34, 10) },
    ],
  },
  {
    key: 'dealer', title: 'Croupier', items: [
      { id: 'dealer_kortomi', look: 'kortomi', name: 'Kortomi', price: 0, free: true, desc: 'Die Chefin persönlich. Frech, gierig, hellwach.', art: () => `<span class="shop-dealer">${figure(kortomiSVG(), 'sk')}</span>` },
      { id: 'dealer_choc', look: 'choc', name: 'Choccypuddin', price: 4000, desc: 'Choc aus der Nachtschicht teilt aus. Dauer-müde, jobbt fürs College, nickt am Tisch gern mal ein.', art: () => `<span class="shop-dealer choc-bg">${figure(chocSVG(), 'sc')}</span>` },
    ],
  },
  {
    key: 'felt', title: 'Tischfilz', items: [
      { id: 'felt_velvet', look: 'velvet', name: 'Gruftsamt', price: 0, free: true, desc: 'Kortomis Klassiker in Pflaumenviolett.' },
      { id: 'felt_emerald', look: 'emerald', name: 'Smaragdgruft', price: 1500, desc: 'Klassisches Casinogrün, nur etwas unheimlicher.' },
      { id: 'felt_midnight', look: 'midnight', name: 'Mitternacht', price: 1500, desc: 'Tiefblau wie der Himmel um drei Uhr nachts.' },
      { id: 'felt_blood', look: 'blood', name: 'Blutmond', price: 3000, desc: 'Dunkelrot. Für Leute, die gern dramatisch verlieren.' },
      { id: 'felt_winter', look: 'winter', name: 'Winterfilz', price: 1800, desc: 'Eisblau wie ein zugefrorener See. Kortomi schlittert gern drauf herum.' },
    ],
  },
  {
    key: 'back', title: 'Kartenrücken', items: [
      { id: 'back_kortomi', look: 'kortomi', name: 'Kortomi Pink', price: 0, free: true, desc: 'Das Original mit Herzchenmuster.' },
      { id: 'back_frost', look: 'frost', name: 'Frostgruft', price: 1200, desc: 'Eisblau und kühl. Wie Kortomis Herz beim Austeilen.' },
      { id: 'back_toxic', look: 'toxic', name: 'Giftgrün', price: 1200, desc: 'Leuchtet ein bisschen. Nicht ablecken.' },
      { id: 'back_noir', look: 'noir', name: 'Schwarzgold', price: 4000, desc: 'Edel, schwarz, golden. Für echte High Roller.' },
    ],
  },
  {
    key: 'chips', title: 'Chip-Design', items: [
      { id: 'chips_classic', look: 'classic', name: 'Kortomi-Chips', price: 0, free: true, desc: 'Die Originale in Pink, Lila und Gold.', art: () => `<span class="shop-chip chips-classic">${chipSVG(100)}</span>` },
      { id: 'chips_cookie', look: 'cookie', name: 'Plätzchen', price: 2000, desc: 'Butterkekse mit Zuckerguss. Nicht reinbeißen, Kortomi zählt nach.', art: () => `<span class="shop-chip chips-cookie">${chipSVG(25)}</span>` },
    ],
  },
  {
    key: 'perks', title: 'Extras', items: [
      { id: 'perk_chip1000', name: '1.000er-Chip', price: 2500, desc: 'Ein neuer Chip für Blackjack, Höher oder Tiefer und Video-Poker.', art: () => `<span class="shop-chip">${chipSVG(1000)}</span>` },
      { id: 'perk_daily', name: 'Kortomis Tagesgeld', price: 3000, desc: 'Hol dir in der Lobby jeden Tag 300 Chips ab. Jeder Tag in Folge bringt 50 mehr, bis 600 ab Tag 7. Einen Tag verpennt? Zurück auf 300.', art: () => `<span class="shop-glyph">${icon('gift')}</span>` },
    ],
  },
];
// Als Funktion, damit später angehängte Kategorien (z. B. college.js) mitzählen
const allItems = () => CATALOG.flatMap(c => c.items.map(i => ({ ...i, cat: c.key })));
const item = id => allItems().find(i => i.id === id);
const has = i => i.free || owns(i.id);

// ---------- Aussehen anwenden ----------
export function applyLook() {
  const { felt, back } = store.d.look;
  document.body.dataset.felt = felt;
  document.body.dataset.chips = store.d.look.chips || 'classic';
  setCardBack(back);
}

// ---------- Tagesgeld ----------
export const DAILY_AMOUNT = 300;
const today = () => new Date().toLocaleDateString('sv'); // JJJJ-MM-TT, lokale Zeit
export const dailyReady = () => owns('perk_daily') && store.d.daily !== today();
// Mit Serie: Tag 1 = DAILY_AMOUNT, steigt bis Tag 7 (siehe progress.js)
export const dailyAmount = () => streakBonus(DAILY_AMOUNT, nextStreak(today()));
export function claimDaily() {
  if (!dailyReady()) return false;
  const amount = dailyAmount(), streak = claimStreak(today());
  store.d.daily = today();
  store.d.balance += amount;
  store.save(true);
  updateBalance(true);
  return { amount, streak };
}

// ---------- Darstellung ----------
function preview(i) {
  if (i.cat === 'felt') return `<span class="shop-felt" data-felt="${i.look}"></span>`;
  if (i.cat === 'back') return `<span class="shop-back"><svg viewBox="0 0 250 350">${cardBackSVG(i.look, 'shop')}</svg></span>`;
  return `<span class="shop-art">${i.art()}</span>`;
}
function actionBtn(i) {
  const bal = store.d.balance;
  if (has(i)) {
    if (i.look) {
      const on = store.d.look[i.cat] === i.look;
      return on ? `<button class="shop-btn on" disabled>${icon('check')}Aktiv</button>`
        : `<button class="shop-btn use" data-use="${i.id}">Benutzen</button>`;
    }
    if (i.cat === 'games') return `<button class="shop-btn use" data-play="${i.id}">Spielen</button>`;
    return `<button class="shop-btn on" disabled>${icon('check')}Gekauft</button>`;
  }
  if (bal < i.price) return `<button class="shop-btn short" aria-disabled="true" data-short="${i.id}">${icon('lock')}${fmt(i.price)}<small>noch ${fmt(i.price - bal)}</small></button>`;
  return `<button class="shop-btn buy" data-buy="${i.id}"><span class="mini-chip">${chipSVG(100)}</span>${fmt(i.price)}</button>`;
}
export function shopHTML() {
  return `${clerkHTML()}<div class="shop-list">${shopListHTML()}</div>`;
}
function shopListHTML() {
  const total = allItems().filter(i => !i.free).length, got = allItems().filter(i => !i.free && owns(i.id)).length;
  return `<div class="shop-head">
      <div class="balance-pill"><span class="chip-ico">${chipSVG(100)}</span><span class="js-balance">${fmt(store.d.balance)}</span></div>
      <span class="shop-progress">${got} von ${total} gekauft</span>
    </div>
    ${CATALOG.filter(c => c.items.some(i => !i.hidden?.(i))).map(c => `<div class="set-group">${c.title}</div>
      <div class="shop-grid shop-cat-${c.key}">${allItems().filter(i => i.cat === c.key && !i.hidden?.(i)).map(i => `
        <div class="shop-item ${has(i) ? 'owned' : ''}" data-id="${i.id}">
          ${preview(i)}
          <div class="shop-info"><b>${i.name}</b><span>${i.desc}</span></div>
          ${actionBtn(i)}
        </div>`).join('')}</div>`).join('')}
    <p class="shop-foot">Kein Echtgeld, nur Kortomi-Chips. Pleite? Beim Blackjack gibt Kortomi dir Mitleids-Chips. Von 20 bis 6 Uhr bedient Choc – bitte nicht wecken.</p>`;
}

// ---------- Kaufen ----------
let armed = null, armT = null;
export function bindShop(root, { onBought, onPlay, onLook }) {
  const rerender = () => { const l = root.querySelector('.shop-list'); if (l) l.innerHTML = shopListHTML(); };
  if (root._shopBound) return; // Der Sheet-Körper wird wiederverwendet: nur einmal anmelden
  root._shopBound = true;
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.dataset.use) {
      const i = item(b.dataset.use);
      store.d.look[i.cat] = i.look; store.save();
      if (i.cat === 'dealer') remountAll();
      applyLook(); sfx.tap(); rerender(); onLook?.(i); clerkEvent('use', i);
      return;
    }
    if (b.dataset.play) { onPlay?.(b.dataset.play); return; }
    if (b.dataset.short) { sfx.nope(); clerkEvent('short', item(b.dataset.short)); return; }
    if (!b.dataset.buy) return;
    const i = item(b.dataset.buy);
    if (!i || owns(i.id)) return;
    if (store.d.balance < i.price) { sfx.nope(); rerender(); clerkEvent('short', i); return; }
    // Zweistufig: erst antippen, dann bestätigen
    if (armed !== i.id) {
      armed = i.id; clearTimeout(armT);
      root.querySelectorAll('.shop-btn.confirm').forEach(x => { x.classList.remove('confirm'); });
      b.classList.add('confirm'); b.innerHTML = `Kaufen?<small>${fmt(i.price)} Chips</small>`;
      sfx.tap(); clerkEvent('arm', i);
      armT = setTimeout(() => { armed = null; if (b.isConnected) rerender(); }, 3500);
      return;
    }
    armed = null; clearTimeout(armT);
    const r = b.getBoundingClientRect();
    store.d.balance -= i.price;
    store.d.owned[i.id] = Date.now();
    if (i.look) store.d.look[i.cat] = i.look; // Neues gleich anziehen
    if (i.cat === 'dealer') remountAll();
    store.save(true);
    updateBalance(true); applyLook();
    sfx.sparkle(); burst(r.left + r.width / 2, r.top + r.height / 2, { n: 34, kinds: ['confetti', 'heart'], power: 7 });
    toast(i.name, 'Gekauft für ' + fmt(i.price) + ' Chips');
    unlock('shop_first');
    if (allItems().every(x => x.free || owns(x.id))) unlock('shop_all');
    rerender();
    onBought?.(i);
    clerkEvent('buy', i);
  });
}
