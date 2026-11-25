// Endgame: Chocs College-Fonds. Vier Semester im Upgrade-Shop, jedes teurer als das davor
// (zusammen 125.000 Chips). Das nächste Semester taucht erst auf, wenn das vorige bezahlt ist.
// Nach dem 4. Semester: Abschlussfeier mit Urkunde, Choc trägt für immer seinen Doktorhut,
// redet wie ein Absolvent – und zahlt dir alles zurück: 100 Tagesraten à 1.250 Chips.
import { store, owns, unlock, ACHIEVEMENTS } from './store.js';
import { CATALOG } from './shop.js';
import { chocSVG } from './clerk.js';
import { CHOC } from './lines-choc.js';
import { LINES } from './mascot.js';
import { gradCap } from './college-art.js';
import { sfx } from './audio.js';
import { celebrate } from './fx.js';
import { fmt, toast, updateBalance } from './ui.js';

export const SEMESTERS = [
  { id: 'college_1', price: 15000, name: '1. Semester', desc: 'Chocs Studiengebühren fürs erste Semester „Angewandte Kartenkunde“. Er könnte endlich nachts schlafen statt Karten zu geben.' },
  { id: 'college_2', price: 25000, name: '2. Semester', desc: 'Statistik, Wahrscheinlichkeit und „Mischen für Fortgeschrittene“. Dazu ein Wecker, der wirklich klingelt.' },
  { id: 'college_3', price: 35000, name: '3. Semester', desc: 'Auslandssemester in der Unterwelt. Choc lernt dort Spielbankrecht und wie man nicht im Hörsaal einschläft.' },
  { id: 'college_4', price: 50000, name: 'Abschlusssemester', desc: 'Bachelorarbeit, Prüfungen, Abschlussfeier. Finanzier Chocs Abschluss und schau, was dann passiert.' },
];
export const TUITION = SEMESTERS.reduce((a, s) => a + s.price, 0);
const RATE = 1250, RATES = TUITION / RATE; // 100 Raten

const REPORTS = [
  ['Kartenkunde 1,7', 'Mischen 2,0', 'Wachbleiben 4,3'],
  ['Statistik 1,3', 'Wahrscheinlichkeit 1,0', 'Pünktlichkeit 3,7'],
  ['Spielbankrecht 1,7', 'Unterwelt-Latein 2,3', 'Kaffeekonsum 1,0'],
];
const SEM_LINES = [
  'Erstes Semester geschafft! Ich war in fast jeder Vorlesung. Wach. Meistens.',
  'Zweites Semester durch. Mein Prof hat gesagt, ich hätte Potenzial. Ich glaub, er meinte mich.',
  'Drittes Semester! In der Unterwelt gibt’s übrigens keinen Kaffee. Ich hab’s trotzdem überlebt.',
];

const today = () => new Date().toLocaleDateString('sv');
export const graduated = () => owns('college_4');
const root = document.documentElement;

// ---------- Shop-Einträge ----------
const shown = i => SEMESTERS.findIndex(s => s.id === i.id) === 0 || owns(SEMESTERS[SEMESTERS.findIndex(s => s.id === i.id) - 1].id);
CATALOG.push({
  key: 'college', title: 'Chocs College-Fonds', items: SEMESTERS.map(s => ({ ...s, hidden: i => !shown(i), art: () => capArt(s.id) })),
});
function capArt(id) {
  const n = SEMESTERS.findIndex(s => s.id === id) + 1;
  return `<span class="col-art"><svg viewBox="50 18 140 84" aria-hidden="true">${gradCap()}</svg><b>${n < 4 ? n + '.' : '🎓'}</b></span>`;
}

ACHIEVEMENTS.push(
  { id: 'choc_sem1', t: 'Mäzenin', d: 'Bezahl Choc das erste Semester.', m: 'lilac', g: '1' },
  { id: 'choc_grad', t: 'Alma Mater', d: 'Finanzier Chocs kompletten Abschluss.', m: 'gold', g: '🎓' },
  { id: 'choc_repaid', t: 'Schuldenfrei', d: 'Choc hat dir alle 100 Raten zurückgezahlt.', m: 'pink', g: '✓' },
);

// ---------- Nach dem Abschluss ----------
const GRAD_CHOC = {
  lobby: ['Guten Abend. Choccypuddin, B.A. Angewandte Kartenkunde. Dank dir.', 'Ich hab jetzt einen Abschluss. Ich bin trotzdem müde. Aber gebildet müde.', 'Mein Diplom hängt über meinem Bett. Ich schau es jede Nacht an. Kurz. Dann schlaf ich.'],
  lobbyRich: ['So viele Chips. Als Absolvent sag ich: Diversifizieren. Als Choc sag ich: Wow.'],
  bjWin: ['Gewonnen. Statistisch war das zu erwarten. Hab ich studiert.'],
  bjLose: ['Verloren. Die Wahrscheinlichkeit war gegen dich. Ich kann dir die Formel zeigen. Willst du nicht? Okay.'],
};
const GRAD_KORTOMI = {
  lobby: ['Der Pudding läuft jetzt mit Hut rum und korrigiert meine Rechnungen. DANKE AUCH.', 'Seit Choc studiert hat, nennt er Blackjack „angewandte Stochastik“. Ich halt das nicht aus.'],
};
let linesAdded = false;
function addGradLines() {
  if (linesAdded) return;
  linesAdded = true;
  for (const [k, v] of Object.entries(GRAD_CHOC)) CHOC[k] = [...v, ...(CHOC[k] || [])];
  for (const [k, v] of Object.entries(GRAD_KORTOMI)) LINES[k] = [...v, ...(LINES[k] || [])];
  const dc = CATALOG.find(c => c.key === 'dealer')?.items.find(i => i.id === 'dealer_choc');
  if (dc) dc.desc = 'Choccypuddin, B.A. Angewandte Kartenkunde. Dank dir ausgeschlafen und gebildet. Schläft trotzdem manchmal ein.';
}

function applyGrad() {
  root.classList.toggle('choc-grad', graduated());
  if (graduated()) addGradLines();
}

// Tägliche Rückzahlung: einmal pro Tag beim Öffnen der App eine Rate.
function repay() {
  if (!graduated()) return;
  const c = store.d.college;
  if (c.repaid >= RATES || c.last === today() || c.gradDay === today()) return;
  c.repaid++; c.last = today();
  store.d.balance += RATE;
  store.save(true);
  updateBalance(true);
  const done = c.repaid >= RATES;
  setTimeout(() => {
    sfx.chip?.(3);
    toast(done ? 'Letzte Rate von Choc!' : `Rate ${c.repaid} von ${RATES} von Choc`, done
      ? `+${fmt(RATE)} Chips. Alles zurückgezahlt. „Danke, dass du an mich geglaubt hast.“`
      : `+${fmt(RATE)} Chips. „Ich zahl’s dir zurück. Jeden Tag ein Stück.“`);
    if (done) unlock('choc_repaid');
  }, 1400);
}

export function initCollege() {
  applyGrad();
  repay();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) repay(); });
}

// Vom Shop nach jedem Kauf aufgerufen.
export function collegeBought(i) {
  const n = SEMESTERS.findIndex(s => s.id === i.id);
  if (n < 0) return;
  unlock('choc_sem1');
  if (n < 3) {
    setTimeout(() => toast(`Zeugnis: ${n + 1}. Semester`, `${REPORTS[n].join(' · ')} – „${SEM_LINES[n]}“`), 900);
    return;
  }
  store.d.college.gradDay = today(); // erste Rate kommt morgen
  store.save(true);
  setTimeout(ceremony, 1100);
}

// ---------- Abschlussfeier ----------
const figure = (svg, tag) => svg.replace(/id="k-([\w-]+)"/g, `id="k-$1-${tag}"`).replace(/url\(#k-([\w-]+)\)/g, `url(#k-$1-${tag})`);
function ceremony() {
  root.classList.add('choc-grad');
  const el = document.createElement('div');
  el.className = 'grad';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Chocs Abschlussfeier');
  const date = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  el.innerHTML = `
    <div class="grad-card">
      <div class="grad-choc choc">${figure(chocSVG(), 'grad')}</div>
      <div class="grad-diploma">
        <small>Universität der Unterwelt</small>
        <h2>Urkunde</h2>
        <p><b>Choccypuddin</b> hat das Studium der<br><i>Angewandten Kartenkunde</i><br>mit dem Grad <b>Bachelor of Arts</b> abgeschlossen.</p>
        <p class="grad-note">Gesamtnote: summa cum laude (meistens wach)<br>Finanziert von: dir, mit ${fmt(TUITION)} Chips</p>
        <span class="grad-date">${date}</span>
        <span class="grad-seal" aria-hidden="true">✦</span>
      </div>
      <p class="grad-speech">„Ich… hätte das nie ohne dich geschafft. Ab morgen zahl ich dir alles zurück. Jeden Tag ${fmt(RATE)} Chips, ${RATES} Tage lang. Versprochen.“</p>
      <button class="btn gold grad-throw" type="button">Hut in die Luft!</button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  sfx.sparkle?.(); celebrate(true);
  unlock('choc_grad');
  addGradLines();
  const btn = el.querySelector('.grad-throw');
  setTimeout(() => btn.focus({ preventScroll: true }), 100);
  btn.addEventListener('click', () => {
    btn.disabled = true;
    sfx.bigWin?.(); celebrate(true);
    for (let k = 0; k < 9; k++) {
      const c = document.createElement('span');
      c.className = 'grad-fly';
      c.style.setProperty('--x', `${(Math.random() - 0.5) * 80}vw`);
      c.style.setProperty('--r', `${(Math.random() - 0.5) * 900}deg`);
      c.style.left = `${30 + Math.random() * 40}%`;
      c.style.animationDelay = `${k * 70}ms`;
      c.innerHTML = `<svg viewBox="50 18 140 84">${gradCap()}</svg>`;
      el.appendChild(c);
    }
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
  });
}
