// Ladentheke im Upgrade-Shop: Tagsüber steht Kortomi hinter dem Tresen,
// nachts (20–6 Uhr) übernimmt Choccypuddin – Werkstudent, Dauer-müde, spart fürs College.
import { kortomiSVG, MOODS, SUIT_PATH } from './art.js';
import { speak } from './audio.js';
import { store } from './store.js';
import { winterHat } from './winter.js';
import { gradCap } from './college-art.js';

// ---------- Choccypuddin ----------
const CHOC_MOODS = ['idle', 'happy', 'shock', 'sad', 'sleep', 'yawn', 'love'];
export function chocSVG() {
  // Augen: klein, oval, himmelblau – mit schweren Lidern und Augenringen
  const eye = (cx, lid) => `<ellipse cx="${cx}" cy="136" rx="9.5" ry="12" fill="#2f4d8a"/>
    <ellipse cx="${cx}" cy="138" rx="6.5" ry="8.5" fill="#5a8fe0"/>
    <circle cx="${cx + 3}" cy="132" r="3" fill="#fff"/>
    ${lid ? `<path d="M${cx - 13} 122 H${cx + 13} V${122 + lid} Q${cx} ${126 + lid} ${cx - 13} ${122 + lid}Z" fill="#fdfaff"/><path d="M${cx - 11} ${122 + lid} Q${cx} ${126 + lid} ${cx + 11} ${122 + lid}" stroke="#2f4d8a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}`;
  const bags = `<path d="M80 152 q12 6 24 0" stroke="#b9a3d6" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/><path d="M136 152 q12 6 24 0" stroke="#b9a3d6" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
  const shut = cx => `<path d="M${cx - 10} 138 q10 6 20 0" stroke="#2f4d8a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const happy = cx => `<path d="M${cx - 10} 140 q10 -12 20 0" stroke="#2f4d8a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  // Lange Schlappohr, gespiegelt über die Mitte (x → 240 − x)
  const ear = f => {
    const P = d => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${f > 0 ? x : 240 - x} ${y}`);
    return `<path d="${P('M76 106 C44 102 14 118 8 152 C2 184 10 204 28 200 C42 196 46 174 58 152 C66 138 78 130 90 124Z')}" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
      <path d="${P('M5 176 C3 192 12 204 28 200 C40 196 44 182 47 172 C41 178 37 170 31 178 C25 170 19 180 13 172 C10 178 7 176 5 176Z')}" fill="url(#k-sauce)"/>`;
  };
  const heart = cx => `<path d="${SUIT_PATH.H}" fill="#ff8fc0" stroke="#fdfaff" stroke-width="5" transform="translate(${cx - 13} 124) scale(.26)"/>`;

  return `<svg class="choc" viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Choccypuddin">
  <defs>
    <radialGradient id="k-fluff" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".75" stop-color="#f7f4fd"/><stop offset="1" stop-color="#e2e6f6"/></radialGradient>
    <linearGradient id="k-sauce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5432"/><stop offset="1" stop-color="#5c3220"/></linearGradient>
    <linearGradient id="k-apron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a2e"/><stop offset="1" stop-color="#4e2a1a"/></linearGradient>
  </defs>
  <ellipse cx="120" cy="292" rx="62" ry="7" fill="#000" opacity=".3"/>
  <g class="c-body">
    <!-- Schwanz: Schoko-Schnecke -->
    <g class="c-tail">
      <circle cx="182" cy="238" r="20" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
      <path d="M182 238 m0 -3 a3 3 0 1 1 -3 4 a7 7 0 1 1 9 -8 a11 11 0 1 1 -14 14 a15 15 0 1 1 20 -18" fill="none" stroke="#7a4a2e" stroke-width="3.6" stroke-linecap="round"/>
    </g>
    <!-- Füße -->
    <ellipse cx="100" cy="282" rx="18" ry="10" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
    <ellipse cx="140" cy="282" rx="18" ry="10" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
    <!-- Körper mit Schürze -->
    <path d="M78 200 Q120 178 162 200 Q172 250 158 274 Q120 288 82 274 Q68 250 78 200Z" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
    <path d="M92 212 Q120 204 148 212 L152 270 Q120 280 88 270Z" fill="url(#k-apron)"/>
    <path d="M92 212 Q104 198 110 192 M148 212 Q136 198 130 192" stroke="#4e2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="101" y="226" width="38" height="17" rx="4" fill="#fdfaff"/>
    <text x="120" y="239" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="#4e2a1a">CHOC</text>
    <path d="M104 254 h32" stroke="#e8c27a" stroke-width="2" stroke-dasharray="3 4" opacity=".7"/>
    <!-- Arm links + Kaffeebecher -->
    <path d="M80 214 Q64 230 72 246" stroke="#e2e6f6" stroke-width="15" stroke-linecap="round" fill="none"/>
    <path d="M80 214 Q64 230 72 246" stroke="#ffffff" stroke-width="11" stroke-linecap="round" fill="none"/>
    <g class="c-mug">
      <g class="c-steam"><path d="M58 214 q-5 -8 0 -16 q5 -8 0 -16" stroke="#d6dcf0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M70 212 q-4 -7 0 -13 q4 -7 0 -13" stroke="#d6dcf0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g>
      <path d="M50 222 h30 l-3 32 q-12 5 -24 0z" fill="#8ec5ff" stroke="#5a8fe0" stroke-width="2"/>
      <path d="M80 228 q12 2 9 12 q-2 7 -11 6" stroke="#5a8fe0" stroke-width="3.4" fill="none"/>
      <text x="64" y="244" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9" fill="#fdfaff">4.</text>
    </g>
    <!-- Arm rechts -->
    <path d="M160 214 Q176 230 168 248" stroke="#e2e6f6" stroke-width="15" stroke-linecap="round" fill="none"/>
    <path d="M160 214 Q176 230 168 248" stroke="#ffffff" stroke-width="11" stroke-linecap="round" fill="none"/>
    <g class="c-head">
      <!-- Lange Schlappohren mit Schoko-Spitzen -->
      <g class="c-ear-l">${ear(1)}</g>
      <g class="c-ear-r">${ear(-1)}</g>
      <!-- Kopf -->
      <ellipse cx="120" cy="134" rx="74" ry="58" fill="url(#k-fluff)" stroke="#d6dcf0" stroke-width="2"/>
      <!-- Pudding-Haube: Schokosoße mit Tropfen, Sahnehäubchen, Kirsche -->
      <path d="M66 104 Q120 62 174 104 Q170 112 164 108 Q160 122 154 110 Q146 104 140 116 Q134 124 130 108 Q120 102 112 112 Q104 124 100 108 Q92 102 84 114 Q78 120 76 106 Q70 112 66 104Z" fill="url(#k-sauce)"/>
      <path d="M90 92 Q112 80 130 84" stroke="#b07a52" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M104 82 q-4 -14 10 -16 q2 -10 12 -6 q12 -2 10 10 q10 4 4 12 q-18 6 -36 0z" fill="#fffaf0" stroke="#efe4d0" stroke-width="2"/>
      <circle cx="122" cy="58" r="8" fill="#e23d5e"/><circle cx="119" cy="55" r="2.4" fill="#ffb0c0"/><path d="M122 50 q4 -10 12 -12" stroke="#4e7a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <!-- Wangen -->
      <ellipse cx="70" cy="158" rx="13" ry="7" fill="#ffb3cf" opacity=".75"/><ellipse cx="170" cy="158" rx="13" ry="7" fill="#ffb3cf" opacity=".75"/>
      <!-- Augen je Stimmung -->
      <g class="mood idle think">${bags}<g class="c-blink">${eye(92, 9)}${eye(148, 9)}</g></g>
      <g class="mood yawn smug">${bags}${shut(92)}${shut(148)}</g>
      <g class="mood sleep">${bags}${shut(92)}${shut(148)}</g>
      <g class="mood happy wink">${bags}${happy(92)}${happy(148)}</g>
      <g class="mood shock">${bags}${eye(92, 0)}${eye(148, 0)}</g>
      <g class="mood sad">${bags}${eye(92, 6)}${eye(148, 6)}<path d="M78 118 l24 6 M162 118 l-24 6" stroke="#b9a3d6" stroke-width="3" stroke-linecap="round"/></g>
      <g class="mood love">${bags}${heart(92)}${heart(148)}</g>
      <!-- Mund -->
      <g class="mood idle think happy wink love"><path d="M112 162 q4 5 8 0 q4 5 8 0" stroke="#2f4d8a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
      <g class="mood sad"><path d="M112 166 q8 -6 16 0" stroke="#2f4d8a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
      <g class="mood shock"><ellipse cx="120" cy="166" rx="5" ry="6" fill="#4e2a1a"/></g>
      <g class="mood yawn smug"><ellipse cx="120" cy="168" rx="9" ry="12" fill="#4e2a1a"/><ellipse cx="120" cy="174" rx="6" ry="4" fill="#ff8fb0"/></g>
      <g class="mood sleep"><path d="M114 164 q6 3 12 0" stroke="#2f4d8a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle class="c-bubble" cx="132" cy="168" r="5" fill="#cfe6ff" stroke="#8ec5ff" stroke-width="1.5"/>
        <g class="c-zzz" font-family="Fredoka, sans-serif" font-weight="700" fill="#cfe6ff"><text x="190" y="84" font-size="22">Z</text><text x="208" y="62" font-size="16">z</text><text x="220" y="46" font-size="12">z</text></g></g>
      ${winterHat('choc')}
      ${gradCap()}
    </g>
  </g>
</svg>`;
}

// ---------- Sprüche ----------
const L = {
  choc: {
    greet: [
      'Willkommen im… *gähn*… Upgrade-Shop. Ich bin Choc. Nachtschicht.',
      'Oh. Kundschaft. Um diese Uhrzeit. Super.',
      'Hi. Ich bin wach. Technisch gesehen.',
      'Kortomi schläft. Ich nicht. So ist das in der Nachtschicht.',
      'Willkommen. Bitte nicht so laut kaufen, mein Kopf.',
      'Ich hab um acht eine Klausur. Was darf’s sein?',
      'Kauf was. Jeder Chip bringt mich näher an meinen Abschluss. Glaub ich.',
      'Hallo. Ich bin Choccypuddin. Nenn mich Choc. Ich hab keine Energie für drei Silben.',
    ],
    greetBroke: ['Du bist pleite? Willkommen im Club. Ich studiere.', 'Null Chips? Ich kenn das Gefühl. Mein Konto auch.'],
    greetRich: ['So viele Chips… davon könnte ich ein ganzes Semester bezahlen.', 'Reich und um diese Uhrzeit wach? Beneidenswert. Halb.'],
    games: ['Ein neues Spiel. Toll. Viel Spaß. Ich schlaf derweil.', 'Gekauft. Kortomi freut sich. Ich krieg davon nichts. Aber gut.'],
    felt: ['Neuer Filz. Sieht weich aus. Darf ich mich kurz drauflegen? Nur kurz?', 'Schöne Farbe. Passt zu meinen Augenringen.'],
    back: ['Neue Kartenrücken. Ich hab auch Rücken. Vom Lernen.', 'Hübsch. Einpacken kann ich’s dir nicht, dafür fehlt mir die Kraft.'],
    perks: ['Luxus-Extras. Ich kauf mir davon… nichts. Ich spar fürs College.', 'Gute Investition. Besser als mein Studium. Vielleicht.'],
    college: ['Du… zahlst mein Semester? Ich… ich weiß nicht, was ich sagen soll. Danke. Wirklich.', 'Ein ganzes Semester. Ich geh ab jetzt in jede Vorlesung. Versprochen. Fast jede.', 'Ich bin wach. Komplett wach. Das ist das Netteste, was je jemand für mich getan hat.'],
    short: [
      'Reicht nicht. Glaub mir, ich weiß, wie sich das anfühlt.',
      'Zu wenig Chips. Ich würd’s dir ja schenken, aber ich hab Miete.',
      'Rabatt darf ich nicht geben. Ich hab gefragt. Für mich selbst.',
    ],
    arm: ['Sicher? Ich frag nur, weil’s auf meinem Zettel steht.', 'Nochmal tippen. Ich bin zu müde für Rückgaben.', 'Ganz sicher? Umtausch ist erst wieder ab sechs Uhr.'],
    use: ['Angezogen. Steht dir. Glaub ich. Ich seh gerade doppelt.', 'Gute Wahl. Ich hätt’s auch genommen. Wenn ich Geld hätte.'],
    poke: [
      'Hm? Ich bin wach! Ich bin wach.',
      'Nicht stupsen. Ich bin aus Pudding.',
      'Au. Okay, das hat mich kurz geweckt. Danke?',
      'Ich hab nur kurz die Augen ausgeruht.',
      'Weich, oder? Das ist Stress-Flausch.',
      'Vorsicht, der Kaffee. Das ist mein vierter. Er ist heilig.',
    ],
    pokeMore: [
      'Bitte. Mein Herz rast eh schon vom Kaffee.',
      'Ich ruf die Chefin. Ach nein, die schläft ja.',
      'Fürs Gestupstwerden zahlt mir hier keiner was.',
      'Wenn du so weitermachst, wirst du Fußnote in meiner Hausarbeit.',
    ],
    pokeSecret: ['Okay. Du darfst bleiben. Du bist netter als meine Professoren.'],
    idle: [
      'Noch drei Semester. Noch drei Semester. Noch drei…',
      'Kortomi zahlt mich in Chips. Die Uni nimmt keine Chips. Ich hab gefragt.',
      'Ich studiere übrigens. Deshalb bin ich so… *gähn*… engagiert.',
      'Weißt du, was ein Lehrbuch kostet? Mehr als ein neuer Tischfilz.',
      'Ich hab Kaffee. Ich bin Kaffee. Wir sind eins.',
      'Meine Ohren sind so lang, die kann ich als Decke benutzen. Hab ich auch schon. Im Dienst.',
      'Falls jemand fragt: Ich war die ganze Zeit wach.',
      'Abgabe ist Freitag. Heute ist… welcher Tag ist heute?',
      'Choccypuddin. Ja, wirklich. Meine Eltern fanden das süß.',
      'Ich lern nebenbei. Darf ich, solange keiner kauft. Also kauf nix. Oder doch. Egal.',
      'Studienkredit, Miete, Kaffee. Das ist meine ganze Lebensgeschichte.',
      'Die Nachtschicht hat Vorteile. Keine Kortomi. Mehr fällt mir grad nicht ein.',
      'Die Sahne auf meinem Kopf ist echt. Frag nicht.',
      'Wenn ich fertig bin, mach ich ein eigenes Café auf. Mit Betten.',
    ],
    sleep: ['Zzz… Hausarbeit… Fußnoten… zzz…', 'Zzz… nein, Professor, ich hab’s gelesen… zzz…', 'Zzz… Pudding… mit Sahne… zzz…', 'Zzz… noch fünf Minuten… zzz…'],
    wake: ['Wa–? Willkommen! Ich war hier. Die ganze Zeit.', 'Ich hab nicht geschlafen. Ich hab… meditiert.', 'Huch! Ja! Upgrade-Shop! Was darf’s sein?'],
    dealer: ['Du hast… mich gebucht? Als Croupier? Krieg ich jetzt mehr Gehalt? Nein? Okay.', 'Ich teil jetzt auch tagsüber aus? Für die Studiengebühren. Für die Studiengebühren.'],
    dealer_choc: ['Ich bin wieder am Tisch. Hab extra einen fünften Kaffee getrunken.', 'Croupier Choc meldet sich zum Dienst. Halbwach, aber da.'],
    dealer_kortomi: ['Kortomi teilt wieder aus? Gut. Mehr Zeit zum Lernen. Oder Schlafen.', 'Ich geh dann zurück an die Kasse. Und auf mein Kissen.'],
    swapIn: ['Was? Ich hab doch Nachtschicht… Na gut. Für die Studiengebühren.', 'Schichttausch? Kriege ich Zuschlag? Nein? Dachte ich mir.'],
  },
  kortomi: {
    greet: [
      'Willkommen in meinem Laden. Schau dich um. Und dann zahl.',
      'Alles handverlesen. Von mir. Für deine Chips.',
      'Kaufen beruhigt. Mich jedenfalls.',
      'Du siehst aus wie jemand, der gleich viel Geld ausgibt.',
    ],
    greetBroke: ['Mit dem Kontostand? Du darfst gucken. Nicht anfassen.'],
    greetRich: ['Ah, mein Lieblingskunde. Seit eben gerade.'],
    games: ['Ein neues Spiel? Mehr Wege, mir deine Chips zu geben. Ich liebe es.'],
    felt: ['Neuer Filz! Riecht noch nach Gruft. Herrlich.'],
    back: ['Hübsche Rückseite. Ändert nichts daran, dass ich gewinne.'],
    perks: ['Investiert in Luxus. Sehr vernünftig. Für mich.'],
    college: ['Du bezahlst dem Pudding das Studium?! Mit MEINEN Chips?! …Na gut, technisch deine.', 'Studiengebühren für Choc. Und wer bezahlt MEINE Weiterbildung? Niemand. Typisch.', 'Wenn der fertig ist, will er bestimmt mehr Gehalt. Danke auch.'],
    short: ['Zu wenig Chips. Wie tragisch. Komm wieder, wenn du reicher bist.', 'Anschreiben gibt’s hier nicht, Schätzchen.'],
    arm: ['Nochmal tippen. Ich liebe dieses Geräusch.'],
    use: ['Steht dir. Fast so gut wie mir.'],
    poke: ['Finger weg von der Ware. Ich bin auch Ware. Unverkäuflich.', 'Hier wird gekauft, nicht gestupst.', 'Stupsen kostet extra.'],
    pokeMore: ['Noch einmal und ich stell’s dir in Rechnung.', 'Soll ich Choc wecken? Der ist da entspannter.'],
    pokeSecret: ['Na gut. Für dich gibt’s ein Lächeln. Gratis. Einmalig.'],
    idle: [
      'Nachts übernimmt Choc. Sei nett zu ihm, er studiert.',
      'Der Typ von der Nachtschicht schläft im Dienst. Ich hab Beweise.',
      'Ich zahl Choc in Chips. Großzügig, oder?',
      'Alles hier ist ein Schnäppchen. Für mich.',
    ],
    dealer: ['Du willst den Pudding statt mir am Tisch? …Fein. Ich zieh’s ihm vom Lohn ab.', 'Choc als Croupier. Na gut. Schlaf nicht ein, wenn er einschläft.'],
    dealer_choc: ['Choc teilt wieder aus. Weck ihn, wenn er wegpennt.'],
    dealer_kortomi: ['Endlich wieder ich am Tisch. Ich hab dich vermisst. Und deine Chips.', 'Die Chefin ist zurück. Wie es sich gehört.'],
    swapIn: ['Choc ist auf dem Tresen eingeschlafen. Ich übernehme.', 'Schichtwechsel. Der Pudding hat Pause.'],
  },
};
const bags = {};
function pick(who, key) {
  const arr = L[who][key] || L[who].idle;
  const id = who + key;
  if (!bags[id] || !bags[id].length) bags[id] = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
  return arr[bags[id].pop()];
}

// ---------- Schicht ----------
export const isNight = (h = new Date().getHours()) => h >= 20 || h < 6;
let override = null; // per Schild getauscht, gilt bis zum Neuladen
const who = () => override || (isNight() ? 'choc' : 'kortomi');

const VOICE = { choc: { pitch: 0.74, slow: 1.3 }, kortomi: { pitch: 1, slow: 1 } };
const moon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z" fill="currentColor"/></svg>`;
const sun = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

let c = null; // aktuelle Theke
export function clerkHTML() { return `<div class="clerk" id="clerk"></div>`; }

function render(el) {
  const w = who(), night = w === 'choc';
  el.dataset.who = w;
  el.innerHTML = `<div class="clerk-fig" title="Anstupsen">${night ? chocSVG() : kortomiSVG()}</div>
    <div class="clerk-side">
      <button class="clerk-shift" type="button" title="Schicht tauschen">${night ? moon : sun}<span>${night ? 'Nachtschicht · Choc' : 'Tagschicht · Kortomi'}</span></button>
      <div class="clerk-bubble"><p></p></div>
    </div>
    <div class="clerk-counter"></div>`;
  const svg = el.querySelector('svg');
  svg.innerHTML = svg.innerHTML.replace(/id="k-([\w-]+)"/g, 'id="k-$1-clerk"').replace(/url\(#k-([\w-]+)\)/g, 'url(#k-$1-clerk)');
  c = { el, svg, w, p: el.querySelector('.clerk-bubble p'), bubble: el.querySelector('.clerk-bubble'), moodT: 0, typeT: 0, hideT: 0, asleep: false, busyUntil: 0, lastSpoke: performance.now() };
  setMood('idle');
}

function setMood(mood, holdMs = 0) {
  if (!c) return;
  const list = c.w === 'choc' ? CHOC_MOODS : MOODS;
  const m = list.includes(mood) ? mood : 'idle';
  clearTimeout(c.moodT);
  c.svg.querySelectorAll('.mood').forEach(g => { g.style.display = g.classList.contains(m) ? 'inline' : 'none'; });
  c.mood = m;
  if (holdMs) c.moodT = setTimeout(() => setMood(c.asleep ? 'sleep' : 'idle'), holdMs);
}

function talk(text, { mood, force = false } = {}) {
  if (!c || !text) return;
  const t = performance.now();
  if (!force && t < c.busyUntil) return;
  const v = VOICE[c.w];
  const delayFor = ch => v.slow * (/[.!?…]/.test(ch) ? 230 : /[,;:–]/.test(ch) ? 140 : ch === ' ' ? 38 : 46);
  const typing = [...text].reduce((s, ch) => s + delayFor(ch), 0);
  if (mood) setMood(mood, Math.max(2600, typing + 900));
  clearTimeout(c.typeT); clearTimeout(c.hideT);
  const cur = c;
  cur.p.textContent = '';
  cur.bubble.classList.add('show');
  cur.svg.classList.add('talking');
  const qEnd = /\?\s*$/.test(text) ? text.trimEnd().length - 1 : -1;
  const loud = /!/.test(text);
  const spoken = c.w === 'choc' ? 'sad' : (mood || c.mood); // Choc klingt immer etwas schlapp
  let i = 0;
  const step = () => {
    i += 1;
    cur.p.textContent = text.slice(0, i);
    const ch = text[i - 1];
    const rise = qEnd > 0 && i > qEnd - 5 ? (i - (qEnd - 5)) * 0.035 : 0;
    // Geschnarche nicht vertonen
    if (!(cur.asleep && /z/i.test(ch))) speak(ch, { mood: spoken, rise, loud, pitch: v.pitch });
    if (i >= text.length) { cur.svg.classList.remove('talking'); return; }
    cur.typeT = setTimeout(step, delayFor(ch));
  };
  step();
  const dur = Math.max(2600, typing + 1800);
  c.busyUntil = t + typing + 400;
  c.lastSpoke = t + dur;
  c.hideT = setTimeout(() => cur.bubble.classList.remove('show'), dur);
}

function jump() {
  if (!c) return;
  c.svg.classList.remove('jump'); void c.svg.getBoundingClientRect(); c.svg.classList.add('jump');
}

function fallAsleep() {
  if (!c || c.w !== 'choc') return;
  c.asleep = true;
  setMood('sleep');
  talk(pick('choc', 'sleep'), { force: true });
}
function wakeUp() {
  c.asleep = false;
  setMood('shock', 900);
  jump();
  setTimeout(() => c && talk(pick('choc', 'wake'), { mood: 'idle', force: true }), 350);
}

// Anstupsen: je öfter, desto genervter
let pokes = 0, lastPoke = 0;
function poke() {
  if (c.asleep) { wakeUp(); return; }
  const t = performance.now();
  pokes = t - lastPoke < 9000 ? pokes + 1 : 1;
  lastPoke = t;
  let key = 'poke', mood = c.w === 'choc' ? ['shock', 'happy', 'yawn', 'love'][Math.floor(Math.random() * 4)] : ['happy', 'wink', 'smug', 'shock'][Math.floor(Math.random() * 4)];
  if (pokes >= 5) { key = 'pokeMore'; mood = c.w === 'choc' ? 'sad' : 'smug'; }
  if (pokes === 10) { key = 'pokeSecret'; mood = 'love'; }
  jump();
  talk(pick(c.w, key), { mood, force: true });
}

// ---------- Öffentliche Schnittstelle ----------
let idleTimer = null;
export function mountClerk(el, { justSwapped = false } = {}) {
  render(el);
  el.querySelector('.clerk-fig').addEventListener('click', e => { if (e.target.closest('svg')) poke(); });
  el.querySelector('.clerk-shift').addEventListener('click', () => {
    override = who() === 'choc' ? 'kortomi' : 'choc';
    if (override === (isNight() ? 'choc' : 'kortomi')) override = null; // zurück zum normalen Plan
    hideClerk();
    mountClerk(el, { justSwapped: true });
  });
  const bal = store.d.balance;
  const key = justSwapped ? 'swapIn' : bal >= 5000 ? 'greetRich' : bal < 100 ? 'greetBroke' : 'greet';
  const greetMood = c.w === 'choc' ? (key === 'greetRich' ? 'shock' : 'yawn') : 'smug';
  setTimeout(() => c && c.el === el && talk(pick(c.w, key), { mood: greetMood, force: true }), justSwapped ? 150 : 450);

  // Zwischendurch-Geplapper, solange der Shop offen ist. Choc nickt manchmal ein.
  clearInterval(idleTimer);
  let wait = 9000 + Math.random() * 6000;
  idleTimer = setInterval(() => {
    if (!c || !c.el.isConnected || !c.el.closest('.sheet.show')) { clearInterval(idleTimer); return; }
    const chat = store.d.settings.chatty;
    if (!chat || document.hidden || c.asleep) return;
    if (performance.now() - c.lastSpoke < wait) return;
    if (c.w === 'choc' && Math.random() < 0.3) fallAsleep();
    else talk(pick(c.w, 'idle'), { mood: c.w === 'choc' ? ['idle', 'yawn', 'happy', 'sad'][Math.floor(Math.random() * 4)] : ['smug', 'wink', 'think', 'happy'][Math.floor(Math.random() * 4)] });
    wait = (chat === 2 ? 11000 : 30000) + Math.random() * 8000;
  }, 1200);
}

// Ereignisse aus dem Shop: 'buy' (mit Artikel), 'short', 'arm', 'use'
export function clerkEvent(type, i) {
  if (!c || !c.el.isConnected) return;
  if (c.asleep) { wakeUp(); return; }
  const w = c.w;
  if (type === 'buy') { talk(pick(w, i.cat), { mood: w === 'choc' ? 'happy' : 'love', force: true }); jump(); }
  if (type === 'short') talk(pick(w, 'short'), { mood: 'sad', force: true });
  if (type === 'use') talk(pick(w, i.cat === 'dealer' ? `dealer_${i.look}` : 'use'), { mood: w === 'choc' ? 'happy' : 'wink', force: true });
  if (type === 'arm' && Math.random() < 0.6) talk(pick(w, 'arm'), { mood: w === 'choc' ? 'yawn' : 'smug' });
}

export function hideClerk() {
  clearInterval(idleTimer);
  if (!c) return;
  clearTimeout(c.typeT); clearTimeout(c.hideT); clearTimeout(c.moodT);
  c = null;
}
