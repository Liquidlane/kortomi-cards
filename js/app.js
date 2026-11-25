// Einstieg: Navigation, Lobby, Dialoge, Einstellungen, PWA.
import { buildSprite, icon, useCard, medalSVG, chipSVG } from './art.js';
import { unlockAudio, configureAudio, sfx } from './audio.js';
import { store, ACHIEVEMENTS, achCount, setUnlockHandler, checkNightOwl, START_BALANCE, owns } from './store.js';
import { mountClerk, hideClerk } from './clerk.js';
import { showDealerName, mountMascot, say, pick, detectCustomMascot, hideBubble, setMood, startIdleChatter, poke } from './mascot.js';
import { detectCustomBack } from './cards.js';
import { initParallax, setReduced, celebrate } from './fx.js';
import { fmt, updateBalance, toast } from './ui.js';
import { enterBlackjack } from './blackjack.js';
import { enterSolitaire, solitaireSettingChanged } from './solitaire.js';
import { enterHilo } from './hilo.js';
import { enterPoker } from './poker.js';
import { enterBaccarat } from './baccarat.js';
import { maybeTutorial, helpButton } from './tutorial.js';
import { GAME_TUTORIALS } from './tutorials-games.js';
import { enterSpider } from './spider.js';
import { enterFreecell } from './freecell.js';
import { cloudHTML, bindCloud } from './cloud.js';
import { shopHTML, bindShop, applyLook, dailyReady, claimDaily, DAILY_AMOUNT } from './shop.js';
import { CATALOG, dailyAmount } from './shop.js';
import { initProgress, refreshProgressLobby, showStreakCard, queueChallenge, takeChallenge, statsOverviewHTML, achGroupedHTML } from './progress.js';
import { applyMusic } from './music.js';
import { applyWinter } from './winter.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ---------- Start ----------
buildSprite($('#sprite'));
for (const k of ['pendingBet', 'pendingHl', 'pendingVp', 'pendingBac']) if (store.d[k]) { store.d.balance += store.d[k]; store.d[k] = 0; store.save(true); }
applyLook();

function applySettings() {
  const s = store.d.settings;
  configureAudio({ sound: s.sound, vol: s.volume, voice: s.voice, pitch: s.voicePitch });
  document.body.classList.toggle('reduce-motion', !s.motion);
  setReduced(!s.motion);
  applyMusic(s); applyWinter(s);
  $$('.js-sound').forEach(b => { b.innerHTML = icon(s.sound ? 'soundOn' : 'soundOff'); b.classList.toggle('is-off', !s.sound); });
}

// Icons verteilen
$$('.icon-btn.back').forEach(b => (b.innerHTML = icon('back')));
$$('.icon-btn[data-open="settings"]').forEach(b => (b.innerHTML = icon('gear')));
$$('.icon-btn[data-open="cloud"]').forEach(b => (b.innerHTML = icon('cloud')));
$('#sheet-close').innerHTML = icon('close');
$('#bj-hint').innerHTML = icon('bulb');
const ICO = { 'ico-shop': 'shop', 'ico-gift': 'gift', 'ico-trophy': 'trophy', 'ico-stats': 'stats', 'ico-gear': 'gear', 'ico-new': 'new', 'ico-undo': 'undo', 'ico-bulb': 'bulb', 'ico-magic': 'magic', 'ico-cloud': 'cloud' };
$$('.ico').forEach(el => { for (const k in ICO) if (el.classList.contains(k)) el.outerHTML = icon(ICO[k]); });
$$('.chip-ico').forEach(el => (el.innerHTML = chipSVG(100)));

// Lobby-Kartenbilder
function mini(id, x, y, r) { return `<span class="mini" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)">${useCard(id)}</span>`; }
$('#pick-art-bj').innerHTML = mini('1S', 14, 4, -12) + mini('13H', 44, 0, 10);
$('#pick-art-sol').innerHTML = mini('back', 6, 6, -6) + mini('12C', 30, 2, 0) + mini('11D', 54, 6, 7);
$('#pick-art-hilo').innerHTML = mini('7H', 10, 6, -10) + mini('back', 44, 2, 8);
$('#pick-art-poker').innerHTML = mini('1S', 4, 8, -12) + mini('13S', 29, 2, -2) + mini('12S', 54, 8, 9);
$('#pick-art-baccarat').innerHTML = mini('9H', 12, 6, -9) + mini('13C', 44, 2, 8);
$('#pick-art-spider').innerHTML = mini('13S', 6, 2, -8) + mini('12S', 28, 10, 0) + mini('11S', 50, 18, 8);
$('#pick-art-freecell').innerHTML = mini('13D', 6, 6, -10) + mini('12C', 30, 2, 0) + mini('11H', 54, 6, 10);

// Gekaufte Spiele in der Lobby zeigen, Tagesgeld-Knopf
const GAMES = { hilo: 'game_hilo', poker: 'game_poker', baccarat: 'game_baccarat', spider: 'game_spider', freecell: 'game_freecell' };
function refreshLobby() {
  let n = 2;
  for (const g in GAMES) { const on = owns(GAMES[g]); $(`.pick-${g}`).hidden = !on; if (on) n++; }
  $('.game-picks').classList.toggle('many', n > 2);
  $('#daily-btn').hidden = !dailyReady();
  $('#daily-btn').lastChild.textContent = `Tagesgeld abholen (+${dailyAmount()})`;
  refreshProgressLobby();
}
$('#daily-btn').addEventListener('click', () => {
  const r = claimDaily();
  if (!r) return;
  sfx.sparkle(); showStreakCard(r, DAILY_AMOUNT); // 7-Tage-Leiste + Kortomis Kommentar
  refreshLobby();
});
$('#chal-btn').addEventListener('click', () => { unlockAudio(); queueChallenge(); go('solitaire'); });

// ---------- Navigation ----------
let current = 'lobby';
function go(name) {
  if (name === current) return;
  hideBubble();
  $$('.screen').forEach(s => s.toggleAttribute('data-active', s.id === `screen-${name}`));
  document.body.classList.toggle('game-active', name !== 'lobby');
  current = name;
  sfx.whoosh();
  if (name === 'blackjack') enterBlackjack();
  else if (name === 'solitaire') enterSolitaire(takeChallenge());
  else if (name === 'hilo') enterHilo();
  else if (name === 'poker') enterPoker();
  else if (name === 'baccarat') enterBaccarat();
  else if (name === 'spider') enterSpider();
  else if (name === 'freecell') enterFreecell();
  else lobbyGreet();
  history.replaceState(null, '', name === 'lobby' ? location.pathname : `#${name}`);
  if (GAME_TUTORIALS[name]) maybeTutorial(name, GAME_TUTORIALS[name]);
}
// Hilfe-Knopf („?“) in die Kopfzeilen der vorhandenen Spiele (Baccarat setzt seinen selbst)
for (const k in GAME_TUTORIALS) $(`#screen-${k} .topbar-actions`)?.prepend(helpButton(k, GAME_TUTORIALS[k]));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { unlockAudio(); go(g.dataset.go); }
  const o = e.target.closest('[data-open]');
  if (o) { unlockAudio(); sfx.tap(); openSheet(o.dataset.open); }
  const snd = e.target.closest('.js-sound');
  if (snd) { store.d.settings.sound = !store.d.settings.sound; store.save(); unlockAudio(); applySettings(); sfx.tap(); }
});
// Audio erst nach erster Berührung (iOS)
// iOS Safari zählt 'pointerdown' nicht als Nutzer-Geste fürs Audio — erst touchend/click entsperren es.
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, unlockAudio, { capture: true, passive: true });

// ---------- Lobby ----------
mountMascot($('#lobby-mascot'), 'lobby');
function lobbyGreet() {
  updateBalance(); refreshLobby();
  $('.js-ach-count').textContent = `${achCount()}/${ACHIEVEMENTS.length}`;
  const h = new Date().getHours();
  const key = store.d.balance >= 5000 ? 'lobbyRich' : store.d.balance < 100 ? 'lobbyBroke' : (h >= 23 || h < 5) ? 'lobbyNight' : 'lobby';
  setTimeout(() => current === 'lobby' && say('lobby', pick(key), { mood: 'smug', priority: 2 }), 700);
}
// Anklicken: Kortomi reagiert auf jedem Bildschirm
function pokeable(slot, name, ctxKey, onPoke) {
  slot.addEventListener('click', e => {
    if (!e.target.closest('svg, img')) return;
    unlockAudio();
    onPoke?.();
    poke(name, ctxKey);
  });
}
pokeable($('#lobby-mascot'), 'lobby', 'pokeLobby');
pokeable($('#bj-dealer'), 'bj', 'pokeBj');
pokeable($('#hl-dealer'), 'hl');
pokeable($('#vp-dealer'), 'vp');
pokeable($('#bac-dealer'), 'bac');
for (const n of ['sp', 'fc']) pokeable($(`#${n}-mascot`), n, 'pokeSol', () => { const m = $(`#${n}-mascot`); m.classList.add('peek'); clearTimeout(m._peekT); m._peekT = setTimeout(() => m.classList.remove('peek'), 6000); });
pokeable($('#sol-mascot'), 'sol', 'pokeSol', () => {
  const m = $('#sol-mascot'); m.classList.add('peek');
  clearTimeout(m._peekT); m._peekT = setTimeout(() => m.classList.remove('peek'), 6000);
});
$('#lobby-mascot').style.pointerEvents = 'auto';

// ---------- Erfolge ----------
setUnlockHandler(a => {
  setTimeout(() => {
    toast(a.t, 'Erfolg freigeschaltet', a);
    sfx.sparkle();
    $('.js-ach-count').textContent = `${achCount()}/${ACHIEVEMENTS.length}`;
  }, 900);
});

// ---------- Dialoge ----------
const sheet = $('#sheet'), backdrop = $('#sheet-backdrop');
function openSheet(kind) {
  const body = $('#sheet-body');
  if (kind === 'settings') { $('#sheet-title').textContent = 'Einstellungen'; body.innerHTML = settingsHTML(); bindSettings(body); }
  if (kind === 'stats') { $('#sheet-title').textContent = 'Statistik'; body.innerHTML = statsOverviewHTML() + statsHTML(); }
  if (kind === 'achievements') { $('#sheet-title').textContent = 'Erfolge'; body.innerHTML = achHTML(); }
  if (kind === 'shop') { $('#sheet-title').textContent = 'Upgrade-Shop'; body.innerHTML = shopHTML(); bindShop(body, SHOP_HOOKS); hideBubble(); mountClerk($('#clerk')); }
  if (kind === 'cloud') { $('#sheet-title').textContent = 'Schon gespielt?'; body.innerHTML = cloudHTML(); bindCloud(body, CLOUD_HOOKS); }
  sheet.classList.add('show'); backdrop.classList.add('show');
  if (kind === 'cloud') return;
  setTimeout(() => $('#sheet-close').focus({ preventScroll: true }), 50);
}
const SHOP_HOOKS = {
  onBought: () => { refreshLobby(); updateBalance(); },
  onPlay: id => { closeSheet(); go(Object.keys(GAMES).find(g => GAMES[g] === id)); },
};
const CLOUD_HOOKS = {
  onPulled: () => { sessionStorage.setItem('kortomi-cloud-msg', '1'); location.reload(); },
  onPushed: code => { closeSheet(); sfx.sparkle(); toast('In der Cloud gespeichert', `Code ${code}. Auf dem anderen Gerät einfach eingeben.`); },
};
if (sessionStorage.getItem('kortomi-cloud-msg')) {
  sessionStorage.removeItem('kortomi-cloud-msg');
  setTimeout(() => toast('Spielstand geladen', 'Willkommen zurück!'), 600);
}
function closeSheet() { hideClerk(); sheet.classList.remove('show'); backdrop.classList.remove('show'); }
$('#sheet-close').addEventListener('click', closeSheet);
backdrop.addEventListener('click', closeSheet);
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

const sw = (key, label, sub = '') => `<div class="set-row"><span class="lbl">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="switch"><input type="checkbox" data-set="${key}" ${store.d.settings[key] ? 'checked' : ''} aria-label="${label}"><span></span></span></div>`;
function settingsHTML() {
  const s = store.d.settings;
  return `
  <div class="set-group">Ton</div>
  ${sw('sound', 'Soundeffekte')}
  <div class="set-row"><span class="lbl">Lautstärke</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-set="volume" aria-label="Lautstärke"></div>
  ${sw('voice', 'Kortomis Stimme', 'Sie brabbelt beim Reden mit')}
  ${sw('music', 'Musik', 'Lounge-Jazz, live im Gerät erzeugt')}
  <div class="set-row"><span class="lbl">Musik-Lautstärke</span><input type="range" min="0" max="1" step="0.05" value="${s.musicVol}" data-set="musicVol" aria-label="Musik-Lautstärke"></div>
  <div class="set-row"><span class="lbl">Stimmlage</span><span class="seg" data-seg="voicePitch">
    ${['Tief', 'Normal', 'Hoch'].map((l, i) => `<button aria-pressed="${s.voicePitch === i}" data-v="${i}">${l}</button>`).join('')}</span></div>
  <div class="set-group">Kortomi</div>
  <div class="set-row"><span class="lbl">Gesprächigkeit</span><span class="seg" data-seg="chatty">
    ${['Still', 'Wenig', 'Viel'].map((l, i) => `<button aria-pressed="${s.chatty === i}" data-v="${i}">${l}</button>`).join('')}</span></div>
  ${sw('tips', 'Strategie-Kommentare', 'Kortomi sagt, wenn du vom Lehrbuch abweichst')}
  ${sw('mascotSol', 'Kortomi bei Solitaire', 'Schaut unten rechts vorbei')}
  <div class="set-group">Solitaire</div>
  <div class="set-row"><span class="lbl">Karten ziehen<small>Gilt ab dem nächsten Spiel</small></span><span class="seg" data-seg="draw3">
    <button aria-pressed="${!s.draw3}" data-v="0">1 Karte</button><button aria-pressed="${s.draw3}" data-v="1">3 Karten</button></span></div>
  <div class="set-group">Darstellung</div>
  ${sw('motion', 'Animationen & Effekte', 'Aus: ruhiger, spart Akku')}
  <div class="set-row"><span class="lbl">Winter-Deko<small>Auto: 1. Dezember bis 6. Januar</small></span><span class="seg" data-seg="winter">
    ${['Auto', 'An', 'Aus'].map((l, i) => `<button aria-pressed="${s.winter === i}" data-v="${i}">${l}</button>`).join('')}</span></div>
  <div class="set-group">Daten</div>
  <div class="set-row"><span class="lbl">Spielregeln<small>Erklärungen nochmal zeigen</small></span><button class="btn ghost" id="reset-tutorials" type="button">Tutorials zurücksetzen</button></div>
  <button class="danger" id="reset-all">Alles zurücksetzen (Guthaben, Statistik, Erfolge, Käufe)</button>
  <p style="font-size:13px;color:var(--text-dim);margin-top:14px">Eigene Bilder: Lege <b>kortomi.png</b> oder <b>kartenruecken.png</b> in den Ordner <i>assets/custom</i>. Sie ersetzen dann die eingebauten Grafiken.</p>`;
}
function bindSettings(root) {
  root.querySelectorAll('[data-set]').forEach(inp => {
    inp.addEventListener(inp.type === 'range' ? 'input' : 'change', () => {
      const k = inp.dataset.set;
      store.d.settings[k] = inp.type === 'range' ? parseFloat(inp.value) : inp.checked;
      store.save(); applySettings(); solitaireSettingChanged();
      if (inp.type !== 'range') sfx.tap();
    });
  });
  root.querySelectorAll('[data-seg]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = seg.dataset.seg, v = parseInt(b.dataset.v, 10);
    store.d.settings[k] = k === 'draw3' ? v === 1 : v;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    store.save(); applySettings(); solitaireSettingChanged();
    if (k === 'voicePitch') say({ lobby: 'lobby', blackjack: 'bj', solitaire: 'sol', hilo: 'hl', poker: 'vp', baccarat: 'bac', spider: 'sp', freecell: 'fc' }[current], pick('voiceTest'), { mood: 'wink', priority: 3 });
    else sfx.tap();
  }));
  root.querySelector('#reset-tutorials').addEventListener('click', () => { store.d.tutorials = {}; store.save(); sfx.tap(); toast('Tutorials zurückgesetzt', 'Kortomi erklärt dir jedes Spiel nochmal.'); });
  root.querySelector('#reset-all').addEventListener('click', () => {
    if (!confirm('Wirklich alles zurücksetzen? Guthaben, Statistik, Erfolge und Shop-Käufe gehen verloren.')) return;
    store.reset(); applySettings(); updateBalance(); closeSheet();
    toast('Alles zurückgesetzt', `Neues Startguthaben: ${fmt(START_BALANCE)}`);
    setTimeout(() => location.reload(), 900);
  });
}

function statsHTML() {
  const b = store.d.stats.bj, s = store.d.stats.sol;
  const pct = (a, n) => (n ? Math.round((a / n) * 100) + ' %' : '–');
  const t = sec => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '–');
  const st = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  return `<div class="stat-block"><h3>Blackjack</h3><div class="stat-grid">
    ${st(fmt(store.d.balance), 'Guthaben')}${st(fmt(b.peak), 'Höchststand')}${st(fmt(b.hands), 'Hände gespielt')}
    ${st(pct(b.wins, b.hands), 'Gewonnen')}${st(fmt(b.blackjacks), 'Blackjacks')}${st(fmt(b.biggestWin), 'Größter Gewinn')}
    ${st(fmt(b.bestStreak), 'Längste Siegesserie')}${st(fmt(b.busts), 'Überkauft')}${st(fmt(b.dealerBusts), 'Kortomi überkauft')}
    ${st(fmt(b.gifts), 'Mitleids-Chips')}</div></div>
    <div class="stat-block"><h3>Solitaire</h3><div class="stat-grid">
    ${st(fmt(s.played), 'Spiele')}${st(fmt(s.won), 'Gewonnen')}${st(pct(s.won, s.played), 'Quote')}
    ${st(t(s.bestTime), 'Bestzeit')}${st(fmt(s.bestScore), 'Höchste Punktzahl')}${st(fmt(s.bestStreak), 'Längste Serie')}${st(fmt(s.chips || 0), 'Chips erspielt')}</div></div>${extraStats()}`;
}

function extraStats() {
  const st = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  const h = store.d.stats.hl, v = store.d.stats.vp;
  const best = { royal: 'Royal Flush', sflush: 'Straight Flush', quads: 'Vierling', full: 'Full House', flush: 'Flush', straight: 'Straße', trips: 'Drilling', twopair: 'Zwei Paare', jacks: 'Buben+' };
  let out = '';
  if (owns('game_hilo')) out += `<div class="stat-block"><h3>Höher oder Tiefer</h3><div class="stat-grid">
    ${st(fmt(h.rounds), 'Runden')}${st(fmt(h.cashouts), 'Kassiert')}${st(fmt(h.bestStreak), 'Längste Trefferserie')}${st(fmt(h.biggestWin), 'Größter Gewinn')}</div></div>`;
  if (owns('game_poker')) out += `<div class="stat-block"><h3>Video-Poker</h3><div class="stat-grid">
    ${st(fmt(v.hands), 'Hände')}${st(fmt(v.wins), 'Gewonnen')}${st(best[v.best] || '–', 'Beste Hand')}${st(fmt(v.biggestWin), 'Größter Gewinn')}</div></div>`;
  const c = store.d.stats.bac;
  if (owns('game_baccarat')) out += `<div class="stat-block"><h3>Baccarat</h3><div class="stat-grid">
    ${st(fmt(c.rounds), 'Runden')}${st(fmt(c.wins), 'Gewonnen')}${st(fmt(c.naturals), 'Naturals')}${st(`${fmt(c.player)} : ${fmt(c.bank)} : ${fmt(c.ties)}`, 'Spieler : Bank : Unent.')}${st(fmt(c.tieWins), 'Unentschieden getroffen')}${st(fmt(c.biggestWin), 'Größter Gewinn')}</div></div>`;
  const tm = sec => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '–');
  const sp = store.d.stats.sp, fc = store.d.stats.fc;
  if (owns('game_spider')) out += `<div class="stat-block"><h3>Spider</h3><div class="stat-grid">
    ${st(fmt(sp.played), 'Spiele')}${st(fmt(sp.won), 'Gewonnen')}${st(tm(sp.bestTime), 'Bestzeit')}${st(fmt(sp.won4), 'Siege mit 4 Farben')}${st(fmt(sp.chips), 'Chips erspielt')}</div></div>`;
  if (owns('game_freecell')) out += `<div class="stat-block"><h3>FreeCell</h3><div class="stat-grid">
    ${st(fmt(fc.played), 'Spiele')}${st(fmt(fc.won), 'Gewonnen')}${st(tm(fc.bestTime), 'Bestzeit')}${st(fmt(fc.chips), 'Chips erspielt')}</div></div>`;
  return out;
}

function achHTML() {
  return achGroupedHTML(); // gruppiert nach Spiel, mit Fortschritt (progress.js)
}

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

// ---------- Los geht's ----------
(async () => {
  applySettings();
  initParallax();
  await Promise.all([detectCustomMascot(), detectCustomBack()]);
  mountMascot($('#lobby-mascot'), 'lobby');
  showDealerName();
  updateBalance();
  checkNightOwl();
  initProgress({ catalog: CATALOG });
  const start = location.hash.slice(1);
  if (start === 'blackjack' || start === 'solitaire' || (GAMES[start] && owns(GAMES[start]))) go(start);
  else lobbyGreet();
  // Plaudern in regelmäßigen Abständen, auch während gespielt wird
  startIdleChatter(() => {
    if (current === 'lobby') return { name: 'lobby', key: 'idleLobby' };
    if (current === 'blackjack') return { name: 'bj', key: 'idleBj' };
    if (current === 'hilo') return { name: 'hl', key: 'idle' };
    if (current === 'poker') return { name: 'vp', key: 'idle' };
    if (current === 'baccarat') return { name: 'bac', key: 'idle' };
    if (current === 'spider' || current === 'freecell') {
      if (!store.d.settings.mascotSol) return null;
      const n = current === 'spider' ? 'sp' : 'fc', m = document.getElementById(`${n}-mascot`);
      return { name: n, key: 'idleSol', onTalk: () => { m.classList.add('peek'); setTimeout(() => m.classList.remove('peek'), 6000); } };
    }
    if (current === 'solitaire') {
      if (!store.d.settings.mascotSol) return null;
      const m = document.getElementById('sol-mascot');
      return { name: 'sol', key: 'idleSol', onTalk: () => { m.classList.add('peek'); setTimeout(() => m.classList.remove('peek'), 6000); } };
    }
    return null;
  });
})();
