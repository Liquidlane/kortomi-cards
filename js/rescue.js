// Pleite-Rettung für alle Chip-Spiele und die Lobby: Wer zusammen mit den Chips auf dem Tisch
// weniger als den kleinsten Einsatz hat, bekommt Mitleids-Chips aufs Haus. So gibt es keinen Softlock,
// egal wo das Guthaben leer geworden ist (Automat, Shop, Baccarat …).
import { store, unlock } from './store.js';
import { updateBalance, toast } from './ui.js';
import { say, pick } from './mascot.js';

export const RESCUE_MIN = 5, RESCUE_AMOUNT = 500;

// Laufende Einsätze (pendingBet, pendingSl …) zählen mit, damit mitten in einer Runde nichts verschenkt wird
const onTable = () => Object.entries(store.d).reduce((s, [k, v]) => s + (k.startsWith('pending') && typeof v === 'number' ? v : 0), 0);
export const isBroke = () => store.d.balance + onTable() < RESCUE_MIN;

let timer = 0;
// who: Maskottchen-Name für den Spruch; after: Neuzeichnen des Spiels; delay: kurz warten, damit die Runde ausklingt
export function rescueIfBroke(who, after, delay = 0) {
  clearTimeout(timer);
  const run = () => {
    if (!isBroke()) return false;
    unlock('bj_broke');
    store.d.balance += RESCUE_AMOUNT; store.d.stats.bj.gifts++; store.save();
    if (who) say(who, pick('bjBroke'), { mood: 'wink', priority: 3 });
    updateBalance(true);
    toast(`${RESCUE_AMOUNT} Chips aufs Haus`, 'Mitleids-Chips, weil du pleite bist.');
    after?.();
    return true;
  };
  if (!delay) return run();
  timer = setTimeout(run, delay);
  return isBroke();
}
