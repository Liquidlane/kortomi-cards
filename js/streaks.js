// Serien über alle Spiele hinweg: Der aktive Croupier kommentiert Pech- und Glückssträhnen.
// Neue Spiele rufen nur an ihrer Ergebnis-Stelle auf:
//   noteResult(slot, 'win' | 'loss' | 'push', betrag)
// slot = Name der Croupier-Figur dieses Spiels (wie bei mountMascot/say, z. B. 'bj', 'hl', 'vp', 'sol'),
// betrag = Netto in Chips (Gewinn positiv, Verlust negativ oder positiv, das Vorzeichen ist egal).
import { store } from './store.js';
import { say } from './mascot.js';
import { STREAK } from './lines-streak.js';

const DELAY = 2600;        // erst den Spruch des Spiels ausreden lassen
const COOLDOWN = 15000;    // höchstens alle 15 s ein Serien-Kommentar
const LOSE_AT = [3, 5, 8, 12, 16, 20];
const WIN_AT = [3, 5, 8, 11, 15];

let run = 0;               // > 0: Siege in Folge, < 0: Niederlagen in Folge
let lastTalk = -Infinity;
const bags = {};

export const currentStreak = () => run;

export function noteResult(slot, result, amount = 0) {
  const amt = Math.abs(Math.round(amount || 0));
  const before = run;
  if (result === 'win') run = run > 0 ? run + 1 : 1;
  else if (result === 'loss') run = run < 0 ? run - 1 : -1;
  else return; // Unentschieden lässt die Serie stehen

  // Großer Ausschlag: relativ zum Guthaben vor dem Spiel, mindestens 500 Chips
  const bal = store.d.balance - (result === 'win' ? amt : -amt);
  const big = amt >= Math.max(500, bal * 0.3);

  let key = null;
  if (result === 'win' && before <= -4) key = 'comeback';
  else if (big) key = result === 'win' ? 'bigWin' : 'bigLoss';
  else if (run < 0 && LOSE_AT.includes(-run)) key = -run >= 8 ? 'lose8' : -run >= 5 ? 'lose5' : 'lose3';
  else if (run > 0 && WIN_AT.includes(run)) key = run >= 8 ? 'win8' : run >= 5 ? 'win5' : 'win3';
  if (!key) return;

  const t = performance.now();
  if (t - lastTalk < COOLDOWN && key !== 'comeback') return;
  lastTalk = t;
  const n = Math.abs(key === 'comeback' ? before : run);
  setTimeout(() => {
    const choc = store.d.look?.dealer === 'choc';
    const text = line(choc ? 'choc' : 'kortomi', key, { n, amt: amt.toLocaleString('de-DE') });
    const losing = key.startsWith('lose') || key === 'bigLoss';
    // Kortomi freut sich über deine Verluste und schmollt bei Gewinnen; Choc fühlt mit
    const mood = choc ? (losing ? 'sad' : 'happy') : (losing ? 'smug' : key === 'bigWin' || key.startsWith('win8') ? 'shock' : 'sad');
    say(slot, text, { mood, priority: 2 });
  }, DELAY);
}

function line(who, key, vars) {
  const arr = STREAK[who][key] || STREAK.kortomi[key];
  if (!arr || !arr.length) return '';
  const id = who + key;
  if (!bags[id] || !bags[id].length) bags[id] = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
  return arr[bags[id].pop()].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
