// Kortomi: Figur, Stimmungen, Sprechblase und Sprüche.
import { kortomiSVG, MOODS } from './art.js';
import { speak } from './audio.js';
import { store } from './store.js';

export const LINES = {
  lobby: [
    'Na, wieder da? Ich hab die Karten schon vorgewärmt.',
    'Willkommen im Kortomi. Die Bank gewinnt. Meistens. Fast immer.',
    'Blackjack oder Solitaire? Entscheide dich, ich hab nicht ewig Zeit. Doch, hab ich.',
    'Setz dich. Der Stuhl beißt nicht. Ich manchmal.',
    'Oh, du schon wieder. Wie schön. Ehrlich jetzt.',
  ],
  lobbyNight: ['So spät noch wach? Perfekt, da sind die Leute leichtsinniger.', 'Mitternachtsrunde? Ich mag deinen Stil.'],
  lobbyRich: ['Schickes Guthaben. Wäre schade, wenn ihm was zustößt.', 'Du bist reicher als mir lieb ist.'],
  lobbyBroke: ['Kontostand: tragisch. Komm, ich leih dir was.'],

  bjEnter: ['Setz deine Chips, Schätzchen.', 'Die Karten sind frisch gemischt. Und ich bin hellwach.', 'Mach deinen Einsatz. Ich beiß nur, wenn du gewinnst.'],
  bjBet: ['Mutig.', 'Mehr? Weniger? Ich urteile nicht. Laut.', 'Klimper, klimper.', 'Hübsche Chips. Bald meine.'],
  bjBigBet: ['Uiii, jemand hat heute Selbstvertrauen.', 'So viel? Ich mag dich jetzt schon mehr.', 'High Roller! Ich hol schon mal meinen Geldbeutel.'],
  bjShuffle: ['Neuer Schuh, neues Glück. Für mich.', 'Ich mische. Und nein, ich schummle nicht. Glaub ich.'],
  bjPlayerBJ: ['Blackjack?! Das… war so nicht geplant.', 'Hmpf. Schöner Blackjack. Ich hasse es.', 'Pures Glück. Kein Talent. Nur Glück!'],
  bjDealerBJ: ['Blackjack! Für mich! Ich liebe meinen Job.', 'Ups. Ass und Zehner. Wie unhöflich von mir.', 'Hehe. Das nennt man Berufserfahrung.'],
  bjBust: ['Überkauft! Hach, das Geräusch von Chips, die zu mir wandern.', '22 oder mehr. Klassiker.', 'Gierig, gierig.', 'Hättest du mal aufgehört. Hab ich gesagt? Nein. Hätte ich aber.'],
  bjDealerBust: ['Mist. Überkauft. Das zählt nicht, ich hab geblinzelt.', 'Na toll. Ich hab mich verzählt.', 'Das war Absicht. Ich wollte nett sein.'],
  bjWin: ['Gewonnen. Genieß es, solange es anhält.', 'Fein, nimm deine Chips. Ich zähl sie trotzdem nach.', 'Glück gehabt. Wird nicht wieder vorkommen.', 'Okay, okay. Der Punkt geht an dich.'],
  bjBigWin: ['Das war jetzt richtig viel Geld. Meins.', 'Ich muss kurz in mein Kissen schreien.'],
  bjLose: ['Die Bank gewinnt. Ich bin die Bank.', 'Danke für die Spende!', 'Nicht weinen. Oder doch, das ist süß.', 'Mehr Glück beim nächsten Mal. Nicht wirklich.'],
  bjPush: ['Unentschieden. Langweilig, aber fair.', 'Gleichstand. Wir sind beide großartig.', 'Push. Keiner gewinnt, keiner weint.'],
  bjDouble: ['Verdoppeln? Wie aufregend!', 'Alles oder… doppelt alles.', 'Mutig. Oder dumm. Gleich wissen wir es.'],
  bjSplit: ['Teilen ist fürsorglich. Ich teile nie.', 'Zwei Hände, doppelter Ärger.'],
  bjInsurance: ['Ich zeig ein Ass. Willst du dich versichern?', 'Ass offen! Angst?'],
  bjInsured: ['Versichert. Kluges Kind.', 'Die Versicherung zahlt. Grrr.'],
  bjNoBJ: ['Kein Blackjack bei mir. Weiter geht’s.', 'Ich hab nachgeschaut: nix. Du darfst atmen.'],
  bjHitHigh: ['Auf {n} noch eine? Du lebst gern gefährlich.', 'Noch eine Karte auf {n}? Ich hol schon mal Popcorn.'],
  bjStandLow: ['Stehen bleiben auf {n}? Mutig. Oder müde.', 'Mit {n} zufrieden? Bescheiden.'],
  bjTipBook: ['Laut Buch: {a}. Nur so als Tipp.', 'Psst… {a} wäre die Lehrbuch-Antwort.', 'Ich würd {a}. Aber ich bin ja die Bank.'],
  bjDeviate: ['Das Buch sagt übrigens {a}. Nur so.', 'Interessante Wahl. Das Lehrbuch sagt {a}.'],
  bjBroke: ['Pleite! Keine Sorge, hier sind 500 aufs Haus. Ich bin ja kein Monster.', 'Leere Taschen? Hier, 500 Chips. Nicht weitersagen.'],
  bjFiveCard: ['Fünf Karten und nicht überkauft? Respekt. Ein bisschen.'],
  bjStreak: ['{n} Siege am Stück. Langsam werd ich nervös.', 'Schon wieder? Ich prüf mal die Ärmel.'],

  solEnter: ['Solitaire. Allein spielen. Mit mir als Publikum.', 'Lass dir Zeit. Ich schau nur zu. Ganz genau.', 'Frisch gemischt. Viel Spaß beim Sortieren.'],
  solResume: ['Weiter, wo du aufgehört hast. Ich hab nichts angefasst. Ehrlich.'],
  solUndo: ['Zurück? Fehler passieren. Dir öfter.', 'Zeitreise! Das zähl ich mit.', 'Rückgängig. Ich hab’s trotzdem gesehen.'],
  solFoundation: ['Ab nach oben damit.', 'Ordnung! Wie schön.', 'Ein Stück näher.'],
  solAce: ['Ein Ass! Hoch damit.'],
  solKingEmpty: ['Der König nimmt Platz.'],
  solStuck: ['Hmm. Schau mal in den Stapel.', 'Brauchst du einen Tipp? Drück auf die Glühbirne.'],
  solNoMoves: ['Ich seh keinen Zug mehr. Neues Spiel?', 'Sackgasse. Passiert den Besten.'],
  solHint: ['Psst, da!', 'Probier mal das hier.', 'Nur ein kleiner Schubs.'],
  solAuto: ['Alles aufgedeckt! Soll ich den Rest legen?'],
  solWin: ['Gewonnen! Ich bin… ein kleines bisschen stolz.', 'Perfekt sortiert. Fast so ordentlich wie ich.', 'Alle Karten oben! Fledermaus-Party!'],
  solFast: ['Unter drei Minuten?! Bist du ein Kartenroboter?'],
  solNew: ['Neue Runde, neues Chaos.', 'Frische Karten. Diesmal klappt’s. Vielleicht.'],
  solRecycle: ['Nochmal von vorn durch den Stapel.'],
  achievement: ['Ooh, ein Abzeichen! Glänzt fast so schön wie ich.', 'Erfolg freigeschaltet. Ich bin beeindruckt. Ein bisschen.'],
};

const last = {};
export function pick(key, vars = {}) {
  const arr = LINES[key];
  if (!arr || !arr.length) return '';
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === last[key]) i = (i + 1) % arr.length;
  last[key] = i;
  return arr[i].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// ---------- Eigene Bilder (optional) ----------
let customImg = null;
export async function detectCustomMascot() {
  try {
    const r = await fetch('assets/custom/kortomi.png', { method: 'HEAD', cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').startsWith('image')) customImg = 'assets/custom/kortomi.png';
  } catch { }
  return !!customImg;
}

// ---------- Instanzen ----------
const instances = new Map();
export function mountMascot(slot, name) {
  slot.innerHTML = customImg ? `<img class="kortomi-img" src="${customImg}" alt="Kortomi">` : kortomiSVG();
  const el = slot.firstElementChild;
  // Eindeutige IDs je Instanz, damit Verläufe in mehreren Kopien funktionieren
  if (!customImg) {
    el.innerHTML = el.innerHTML.replace(/id="k-([\w-]+)"/g, `id="k-$1-${name}"`).replace(/url\(#k-([\w-]+)\)/g, `url(#k-$1-${name})`);
  }
  const inst = { slot, el, name, mood: 'idle', timer: null };
  instances.set(name, inst);
  setMood(name, 'idle');
  return inst;
}

export function setMood(name, mood, holdMs = 0) {
  const inst = instances.get(name);
  if (!inst) return;
  clearTimeout(inst.timer);
  inst.mood = MOODS.includes(mood) ? mood : 'idle';
  if (customImg) {
    const img = inst.el;
    const want = inst.mood === 'idle' ? customImg : `assets/custom/kortomi-${inst.mood}.png`;
    img.onerror = () => { img.onerror = null; img.src = customImg; };
    img.src = want;
  } else {
    inst.el.querySelectorAll('.mood').forEach(g => { g.style.display = g.classList.contains(inst.mood) ? 'inline' : 'none'; });
  }
  if (holdMs) inst.timer = setTimeout(() => setMood(name, 'idle'), holdMs);
}

export function jump(name) {
  const inst = instances.get(name); if (!inst) return;
  inst.el.classList.remove('jump'); void inst.el.getBoundingClientRect(); inst.el.classList.add('jump');
}

// ---------- Sprechblase ----------
const bubble = document.getElementById('bubble');
const bubbleP = bubble.querySelector('p');
let active = null, typeTimer = null, hideTimer = null, queueBusyUntil = 0;

export function say(name, text, { mood, priority = 1, hold } = {}) {
  if (!text) return;
  const chat = store.d.settings.chatty; // 0 = still, 1 = wenig, 2 = normal
  if (chat === 0 && priority < 3) return;
  if (chat === 1 && priority < 2) return;
  const t = performance.now();
  if (t < queueBusyUntil && priority < 2) return; // nicht ständig überschreiben
  const inst = instances.get(name);
  if (!inst || !inst.slot.offsetParent && !inst.slot.closest('[data-active]')) return;
  active = inst;
  // Tippzeit vorab berechnen: normale Zeichen, kurze Pause bei Komma, längere bei Satzende
  const delayFor = ch => (/[.!?…]/.test(ch) ? 230 : /[,;:–]/.test(ch) ? 140 : ch === ' ' ? 38 : 46);
  const typing = [...text].reduce((s, ch) => s + delayFor(ch), 0);
  const spokenMood = mood || inst.mood;
  if (mood) setMood(name, mood, Math.max(2600, typing + 900));
  clearTimeout(typeTimer); clearTimeout(hideTimer);
  bubbleP.textContent = '';
  bubble.classList.add('show');
  positionBubble(text);
  inst.el.classList.add('talking');
  // Frage am Satzende: die letzten Silben gehen nach oben
  const qEnd = /\?\s*$/.test(text) ? text.trimEnd().length - 1 : -1;
  const loud = /!/.test(text);
  let i = 0;
  const step = () => {
    i += 1;
    bubbleP.textContent = text.slice(0, i);
    const ch = text[i - 1];
    const rise = qEnd > 0 && i > qEnd - 5 ? (i - (qEnd - 5)) * 0.035 : 0;
    speak(ch, { mood: spokenMood, rise, loud });
    if (i >= text.length) { inst.el.classList.remove('talking'); return; }
    typeTimer = setTimeout(step, delayFor(ch));
  };
  step();
  const dur = hold ?? Math.max(2400, typing + 1500);
  queueBusyUntil = t + Math.min(dur, typing + 400);
  hideTimer = setTimeout(hideBubble, dur);
}

export function hideBubble() {
  bubble.classList.remove('show');
  clearTimeout(typeTimer);
  if (active) active.el.classList.remove('talking');
}

function positionBubble(text) {
  if (!active) return;
  // Größe mit vollem Text messen
  const r = active.slot.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  const spaceRight = vw - r.right + r.width * 0.08, spaceLeft = r.left + r.width * 0.08;
  const side = Math.max(spaceRight, spaceLeft);
  // Wenn neben Kortomi wenigstens 170px frei sind, die Blase dort schmaler setzen
  bubble.style.width = '';
  bubble.style.maxWidth = side >= 170 && side < 300 ? `${side - 12}px` : '';
  bubbleP.textContent = text;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  bubble.style.width = `${bw}px`;
  bubbleP.textContent = '';
  let x, y, cls = '', tailX = 22, tailY = null;
  if (spaceRight >= bw + 6 && r.top + r.height * 0.1 + bh < vh) {
    // rechts neben dem Kopf
    x = r.right - r.width * 0.08; y = r.top + r.height * 0.06;
    cls = 'tail-side'; tailX = -7; tailY = Math.min(bh - 24, 26);
  } else if (spaceLeft >= bw + 6) {
    x = r.left - bw + r.width * 0.08; y = r.top + r.height * 0.06; cls = 'tail-side right'; tailX = bw - 9; tailY = Math.min(bh - 24, 26);
  } else if (r.top > bh + 20) {
    x = Math.min(Math.max(10, r.left + r.width / 2 - bw / 2), vw - bw - 10);
    y = r.top - bh - 8; tailX = Math.min(Math.max(16, r.left + r.width / 2 - x - 8), bw - 30);
  } else {
    x = Math.min(Math.max(10, r.left + r.width / 2 - bw / 2), vw - bw - 10);
    y = r.bottom + 10; cls = 'tail-up'; tailX = Math.min(Math.max(16, r.left + r.width / 2 - x - 8), bw - 30);
  }
  bubble.className = 'bubble show ' + cls;
  bubble.style.setProperty('--bx', `${Math.round(x)}px`);
  bubble.style.setProperty('--by', `${Math.round(y)}px`);
  bubble.style.setProperty('--tail-x', `${tailX}px`);
  if (tailY != null) { bubble.style.setProperty('--tail-y', `${tailY}px`); bubble.style.setProperty('--tail-b', 'auto'); }
  else if (cls === 'tail-up') { bubble.style.setProperty('--tail-y', '-7px'); bubble.style.setProperty('--tail-b', 'auto'); }
  else { bubble.style.setProperty('--tail-y', 'auto'); bubble.style.setProperty('--tail-b', '-7px'); }
  bubble.style.setProperty('--bo', cls.includes('side') ? (cls.includes('right') ? '100% 20%' : '0% 20%') : cls === 'tail-up' ? '50% 0%' : '50% 100%');
}
window.addEventListener('resize', () => { if (bubble.classList.contains('show')) hideBubble(); });
