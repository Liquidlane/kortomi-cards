// Alle Grafiken als handgebautes SVG: Karten, Kartenrücken, Chips, Kortomi, Medaillen, Icons.
export const SUITS = ['S', 'H', 'D', 'C'];
export const RED = { H: true, D: true };
export const RANK_LABEL = { 1: 'A', 11: 'B', 12: 'D', 13: 'K' };
export const rankLabel = r => RANK_LABEL[r] || String(r);
export const SUIT_NAME = { S: 'Pik', H: 'Herz', D: 'Karo', C: 'Kreuz' };

const INK = { S: '#2b1638', C: '#4a2270', H: '#e0307a', D: '#e0307a' };
const ROBE = { S: '#3a1d52', C: '#6a35a0', H: '#e0307a', D: '#ff6aa8' };
const TRIM = { S: '#b89cff', C: '#e8c27a', H: '#ffd1e6', D: '#fff0c9' };

// Symbole im 100x100-Feld
export const SUIT_PATH = {
  H: 'M50 90C22 68 4 52 4 32 4 16 16 6 29 6c10 0 17 6 21 14 4-8 11-14 21-14 13 0 25 10 25 26 0 20-18 36-46 58Z',
  D: 'M50 3c11 18 26 34 43 47C76 63 61 79 50 97 39 79 24 63 7 50 24 37 39 21 50 3Z',
  S: 'M50 4c13 19 45 36 45 59 0 14-10 22-22 22-8 0-14-4-18-10 1 10 5 17 13 21H32c8-4 12-11 13-21-4 6-10 10-18 10C15 85 5 77 5 63 5 40 37 23 50 4Z',
  C: 'M50 6a21 21 0 0 1 17 33 21 21 0 1 1 3 37c-6 0-11-2-15-6 1 10 5 18 13 22H32c8-4 12-12 13-22-4 4-9 6-15 6a21 21 0 1 1 3-37A21 21 0 0 1 50 6Z',
};

const suitUse = (s, x, y, size, rot = 0, fill) =>
  `<path d="${SUIT_PATH[s]}" fill="${fill || INK[s]}" transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})${rot ? ` rotate(180 50 50)` : ''}"/>`;

// Pip-Positionen (Mitte der Karte 125/175)
const L = 90, M = 125, R = 160;
const T = 92, B = 258, MID = 175;
const PIPS = {
  2: [[M, T], [M, B]],
  3: [[M, T], [M, MID], [M, B]],
  4: [[L, T], [R, T], [L, B], [R, B]],
  5: [[L, T], [R, T], [M, MID], [L, B], [R, B]],
  6: [[L, T], [R, T], [L, MID], [R, MID], [L, B], [R, B]],
  7: [[L, T], [R, T], [M, 133], [L, MID], [R, MID], [L, B], [R, B]],
  8: [[L, T], [R, T], [M, 133], [L, MID], [R, MID], [M, 217], [L, B], [R, B]],
  9: [[L, T], [R, T], [L, 147], [R, 147], [M, MID], [L, 203], [R, 203], [L, B], [R, B]],
  10: [[L, T], [R, T], [M, 120], [L, 147], [R, 147], [L, 203], [R, 203], [M, 230], [L, B], [R, B]],
};

function corner(rank, suit) {
  const lbl = rankLabel(rank);
  const ink = INK[suit];
  const ten = lbl.length > 1 ? ' textLength="56" lengthAdjust="spacingAndGlyphs"' : '';
  const g = `<text x="38" y="76" text-anchor="middle" font-family="Fredoka, Avenir Next Rounded, system-ui, sans-serif" font-weight="600" font-size="78" fill="${ink}"${ten}>${lbl}</text>${suitUse(suit, 38, 104, 38)}`;
  return `<g>${g}</g><g transform="rotate(180 125 175)">${g}</g>`;
}

function faceBase(suit) {
  const tint = RED[suit] ? '#fff1f7' : '#f8f2ff';
  return `<rect width="250" height="350" rx="18" fill="${tint}"/>
  <rect x="5" y="5" width="240" height="340" rx="14" fill="none" stroke="${INK[suit]}" stroke-opacity=".14" stroke-width="2"/>`;
}

// ---------- Hofkarten: eigene Figuren ----------
// Bube: kleiner Fledermaus-Page · Dame: Gothic-Lady mit Schleier und Rose · König: Totenkopf-König mit Mantel
function eyes(cx, cy, gap, style, col = '#2a1238') {
  const l = cx - gap, r = cx + gap;
  if (style === 'skull') return `<ellipse cx="${l}" cy="${cy}" rx="7.5" ry="8.5" fill="${col}"/><ellipse cx="${r}" cy="${cy}" rx="7.5" ry="8.5" fill="${col}"/><circle cx="${l + 2}" cy="${cy - 3}" r="2" fill="#fff"/><circle cx="${r + 2}" cy="${cy - 3}" r="2" fill="#fff"/>`;
  return `<ellipse cx="${l}" cy="${cy}" rx="5.5" ry="7" fill="${col}"/><ellipse cx="${r}" cy="${cy}" rx="5.5" ry="7" fill="${col}"/><circle cx="${l + 1.6}" cy="${cy - 2.6}" r="2" fill="#fff"/><circle cx="${r + 1.6}" cy="${cy - 2.6}" r="2" fill="#fff"/>`;
}

function courtFigure(rank, suit) {
  const robe = ROBE[suit], trim = TRIM[suit], ink = INK[suit];
  const chest = suitUse(suit, 50, 150, 22, 0, trim);
  let back = '', body = '', head = '', top = '', hand = '';
  if (rank === 11) { // Bube
    back = `<path d="M30 108 C8 96 0 78 4 62 C12 72 18 70 22 64 C24 76 30 80 36 78 Z" fill="${ink}" opacity=".85"/>
            <path d="M70 108 C92 96 100 78 96 62 C88 72 82 70 78 64 C76 76 70 80 64 78 Z" fill="${ink}" opacity=".85"/>`;
    body = `<path d="M26 192 L32 118 Q50 104 68 118 L74 192 Z" fill="${robe}"/>
            <path d="M42 118 L50 132 L58 118" fill="none" stroke="${trim}" stroke-width="4" stroke-linejoin="round"/>
            <rect x="26" y="168" width="48" height="6" fill="${trim}" opacity=".7"/>${chest}`;
    head = `<path d="M24 52 L18 20 L40 40 Z" fill="#2a1238"/><path d="M76 52 L82 20 L60 40 Z" fill="#2a1238"/>
            <path d="M25 46 L22 28 L35 40 Z" fill="#ff9cc7"/><path d="M75 46 L78 28 L65 40 Z" fill="#ff9cc7"/>
            <circle cx="50" cy="72" r="30" fill="#2a1238"/>
            <ellipse cx="50" cy="80" rx="21" ry="17" fill="#fde7f2"/>
            ${eyes(50, 76, 10)}<ellipse cx="36" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".6"/><ellipse cx="64" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".6"/>
            <path d="M45 89 Q50 93 55 89" fill="none" stroke="#2a1238" stroke-width="2" stroke-linecap="round"/><path d="M52 90 l2 4 l2 -3.4z" fill="#fff"/>`;
    top = `<path d="M22 50 Q50 28 82 46 Q72 36 50 36 Q30 36 22 50Z" fill="${robe}"/><circle cx="80" cy="44" r="5" fill="${trim}"/>`;
    hand = `<g transform="translate(70 128) rotate(14)"><rect x="-1.5" y="-26" width="3" height="58" rx="1.5" fill="${trim}"/><path d="M0 -34 l7 8 h-14z" fill="${trim}"/></g>`;
  } else if (rank === 12) { // Dame
    back = `<path d="M18 70 Q12 140 22 196 L78 196 Q88 140 82 70 Q50 40 18 70Z" fill="${ink}" opacity=".35"/>`;
    body = `<path d="M20 196 Q24 140 36 116 Q50 108 64 116 Q76 140 80 196 Z" fill="${robe}"/>
            <path d="M36 116 Q50 128 64 116" fill="none" stroke="${trim}" stroke-width="4"/>
            <path d="M20 196 Q50 182 80 196" fill="none" stroke="${trim}" stroke-width="4" opacity=".8"/>${chest}`;
    head = `<path d="M20 74 Q18 104 30 110 L70 110 Q82 104 80 74 Q50 50 20 74Z" fill="#2a1238"/>
            <circle cx="50" cy="74" r="26" fill="#fde7f2"/>
            <path d="M24 70 Q34 46 50 48 Q66 46 76 70 Q64 60 50 66 Q36 60 24 70Z" fill="#2a1238"/>
            ${eyes(50, 78, 10)}<path d="M38 72 l-6 -3 M62 72 l6 -3" stroke="#2a1238" stroke-width="2" stroke-linecap="round"/>
            <ellipse cx="36" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".6"/><ellipse cx="64" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".6"/>
            <path d="M46 90 Q50 93 54 90" fill="none" stroke="${INK.H}" stroke-width="2.4" stroke-linecap="round"/>`;
    top = `<path d="M34 46 L38 32 L44 42 L50 28 L56 42 L62 32 L66 46 Z" fill="#e8c27a" stroke="#b98a3e" stroke-width="1.5"/>
           <circle cx="50" cy="36" r="2.6" fill="${INK.H}"/>
           <path d="M26 50 Q50 36 74 50 Q78 80 84 110 Q50 96 16 110 Q22 80 26 50Z" fill="#b89cff" opacity=".22"/>`;
    hand = `<g transform="translate(24 140)"><path d="M0 0 C-2 14 2 24 0 40" stroke="#3f7a4a" stroke-width="2.4" fill="none"/>
            <circle cx="0" cy="-2" r="7" fill="${INK.H}"/><path d="M-4 -4 q4 -4 8 0 q-4 4 -8 0z" fill="#ffb3d6"/></g>`;
  } else { // König
    back = `<path d="M14 196 Q10 140 24 108 Q50 96 76 108 Q90 140 86 196Z" fill="${robe}" opacity=".55"/>`;
    body = `<path d="M22 196 Q24 140 34 116 Q50 106 66 116 Q76 140 78 196 Z" fill="${robe}"/>
            <path d="M22 196 Q50 184 78 196 L78 186 Q50 174 22 186Z" fill="#fff6fb"/>
            <g fill="#2a1238"><circle cx="32" cy="188" r="1.6"/><circle cx="46" cy="183" r="1.6"/><circle cx="60" cy="183" r="1.6"/><circle cx="72" cy="188" r="1.6"/></g>
            <path d="M34 116 Q50 132 66 116 L66 124 Q50 138 34 124Z" fill="#fff6fb"/>${chest}`;
    head = `<path d="M24 74 C24 52 36 44 50 44 C64 44 76 52 76 74 C76 88 70 94 66 98 L66 106 L34 106 L34 98 C30 94 24 88 24 74Z" fill="#fff6fb" stroke="#2a1238" stroke-opacity=".18" stroke-width="1.5"/>
            ${eyes(50, 76, 11, 'skull')}<path d="M47 90 l3 -5 l3 5z" fill="#2a1238"/>
            <path d="M40 100 v6 M46 100 v6 M54 100 v6 M60 100 v6" stroke="#2a1238" stroke-opacity=".35" stroke-width="1.6"/>
            <ellipse cx="32" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".55"/><ellipse cx="68" cy="88" rx="5" ry="3" fill="#ff7ab4" opacity=".55"/>`;
    top = `<path d="M26 52 L24 22 L36 36 L50 16 L64 36 L76 22 L74 52 Z" fill="#e8c27a" stroke="#b98a3e" stroke-width="1.6"/>
           <circle cx="50" cy="30" r="4" fill="${INK.H}"/><circle cx="35" cy="42" r="2.6" fill="#b89cff"/><circle cx="65" cy="42" r="2.6" fill="#b89cff"/>
           <rect x="26" y="48" width="48" height="6" rx="2" fill="#b98a3e"/>`;
    hand = `<g transform="translate(76 120) rotate(8)"><rect x="-2" y="0" width="4" height="70" rx="2" fill="#e8c27a"/>${suitUse(suit, 0, -6, 18, 0, '#e8c27a')}</g>`;
  }
  return `<g>${back}${body}${hand}${head}${top}</g>`;
}

function courtCard(rank, suit) {
  const ink = INK[suit];
  const bg = RED[suit] ? '#ffe2ef' : '#ece3ff';
  const frame = `<rect x="64" y="22" width="122" height="306" rx="12" fill="${bg}" stroke="${ink}" stroke-opacity=".5" stroke-width="2"/>
    <g opacity=".22">${[0, 1, 2, 3, 4, 5].map(i => suitUse(suit, 80 + (i % 2) * 90, 50 + i * 50, 14)).join('')}</g>`;
  return `${faceBase(suit)}${frame}<g transform="translate(70 36) scale(1.1 1.4)">${courtFigure(rank, suit)}</g>
    <rect x="64" y="22" width="122" height="306" rx="12" fill="none" stroke="${ink}" stroke-width="2.5"/>${corner(rank, suit)}`;
}

function aceCard(suit) {
  const ink = INK[suit];
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<circle cx="${125 + Math.cos(a) * 76}" cy="${175 + Math.sin(a) * 76}" r="${i % 3 ? 2.4 : 4}" fill="${ink}" opacity="${i % 3 ? .35 : .6}"/>`;
  }).join('');
  let extra = '';
  if (suit === 'S') {
    extra = `<path d="M84 160 C60 150 50 132 54 116 C62 126 70 124 72 118 C76 130 84 132 90 130Z" fill="${ink}"/>
             <path d="M166 160 C190 150 200 132 196 116 C188 126 180 124 178 118 C174 130 166 132 160 130Z" fill="${ink}"/>
             <text x="125" y="292" text-anchor="middle" font-family="Grenze Gotisch, Georgia, serif" font-weight="700" font-size="30" fill="${ink}">Kortomi</text>`;
  }
  return `${faceBase(suit)}<circle cx="125" cy="175" r="64" fill="${ink}" opacity=".07"/>${stars}${extra}${suitUse(suit, 125, 172, suit === 'S' ? 104 : 96)}${corner(1, suit)}`;
}

function pipCard(rank, suit) {
  const pips = PIPS[rank].map(([x, y]) => suitUse(suit, x, y, 40, y > MID + 1)).join('');
  return `${faceBase(suit)}${pips}${corner(rank, suit)}`;
}

export function cardFaceSVG(rank, suit) {
  if (rank === 1) return aceCard(suit);
  if (rank > 10) return courtCard(rank, suit);
  return pipCard(rank, suit);
}

// ---------- Kartenrücken ----------
function cardBackSVG() {
  return `<defs>
    <pattern id="bk-pat" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="36" height="36" fill="#3a1650"/>
      <path d="M0 18h36M18 0v36" stroke="#ff5fa2" stroke-opacity=".22" stroke-width="1.2"/>
      <path d="${SUIT_PATH.H}" fill="#ff5fa2" opacity=".55" transform="translate(13 13) scale(.1)"/>
      <circle cx="0" cy="0" r="2" fill="#e8c27a" opacity=".6"/><circle cx="36" cy="36" r="2" fill="#e8c27a" opacity=".6"/>
    </pattern>
    <radialGradient id="bk-glow" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#ff5fa2" stop-opacity=".4"/><stop offset="1" stop-color="#ff5fa2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="250" height="350" rx="18" fill="#241030"/>
  <rect x="12" y="12" width="226" height="326" rx="10" fill="url(#bk-pat)"/>
  <rect x="12" y="12" width="226" height="326" rx="10" fill="url(#bk-glow)"/>
  <rect x="12" y="12" width="226" height="326" rx="10" fill="none" stroke="#e8c27a" stroke-width="2.5"/>
  <rect x="19" y="19" width="212" height="312" rx="7" fill="none" stroke="#e8c27a" stroke-opacity=".4" stroke-width="1"/>
  <g transform="translate(125 175)">
    <circle r="50" fill="#241030" stroke="#e8c27a" stroke-width="2.5"/>
    <circle r="44" fill="none" stroke="#ff5fa2" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 4"/>
    <g transform="translate(-38 -44) scale(.32)">${kortomiHeadEmblem()}</g>
  </g>`;
}

// Kopf als Emblem (für Rücken & Icon), Koordinaten wie im Maskottchen
export function kortomiHeadEmblem() {
  return `<path d="M58 78 L44 16 L102 52 Z" fill="#231530"/><path d="M182 78 L196 16 L138 52 Z" fill="#231530"/>
  <path d="M62 66 L54 32 L88 54 Z" fill="#ff7ab4"/><path d="M178 66 L186 32 L152 54 Z" fill="#ff7ab4"/>
  <ellipse cx="120" cy="108" rx="74" ry="64" fill="#231530"/>
  <path d="M50 92 Q120 40 190 92 L186 76 Q120 30 54 76Z" fill="#ff5fa2"/>
  <ellipse cx="92" cy="116" rx="17" ry="21" fill="#fff6fb"/><ellipse cx="148" cy="116" rx="17" ry="21" fill="#fff6fb"/>
  <ellipse cx="94" cy="119" rx="12" ry="16" fill="#8d5cff"/><ellipse cx="146" cy="119" rx="12" ry="16" fill="#8d5cff"/>
  <ellipse cx="95" cy="121" rx="6" ry="9" fill="#1a0b26"/><ellipse cx="145" cy="121" rx="6" ry="9" fill="#1a0b26"/>
  <circle cx="99" cy="112" r="4.5" fill="#fff"/><circle cx="150" cy="112" r="4.5" fill="#fff"/>
  <path d="M116 134 h8 l-4 5z" fill="#ff7ab4"/>
  <path d="M110 142 q5 5 10 0 q5 5 10 0" fill="none" stroke="#fff6fb" stroke-width="2.6" stroke-linecap="round"/>
  <ellipse cx="74" cy="140" rx="10" ry="6" fill="#ff5fa2" opacity=".55"/><ellipse cx="166" cy="140" rx="10" ry="6" fill="#ff5fa2" opacity=".55"/>`;
}

// ---------- Kortomi, die Croupière (eigene Figur: schwarzes Katzen-Teufelchen mit Fledermausflügeln) ----------
export const MOODS = ['idle', 'happy', 'smug', 'shock', 'sad', 'wink', 'love', 'think'];

export function kortomiSVG() {
  const lidL = `<path d="M74 92 Q92 86 110 96 L110 108 Q92 100 74 108Z" fill="#231530"/>`;
  const lidR = `<path d="M130 96 Q148 86 166 92 L166 108 Q148 100 130 108Z" fill="#231530"/>`;
  const eyeOpen = (cx, flip = 1) => `<ellipse cx="${cx}" cy="116" rx="17" ry="21" fill="#fff6fb"/>
    <ellipse cx="${cx + 2 * flip}" cy="119" rx="12.5" ry="16.5" fill="url(#k-iris)"/>
    <ellipse cx="${cx + 3 * flip}" cy="121" rx="6.5" ry="9.5" fill="#1a0b26"/>
    <circle cx="${cx + 7 * flip}" cy="111" r="5" fill="#fff"/><circle cx="${cx - 3 * flip}" cy="127" r="2.4" fill="#fff" opacity=".9"/>`;
  const arc = (cx, up = true) => `<path d="M${cx - 15} ${up ? 122 : 112} Q${cx} ${up ? 102 : 130} ${cx + 15} ${up ? 122 : 112}" fill="none" stroke="#ffb3d6" stroke-width="6" stroke-linecap="round"/>`;
  const heart = cx => `<path d="${SUIT_PATH.H}" fill="#ff5fa2" stroke="#fff6fb" stroke-width="5" transform="translate(${cx - 17} 98) scale(.34)"/>`;
  const shockEye = cx => `<ellipse cx="${cx}" cy="114" rx="18" ry="23" fill="#fff6fb"/><circle cx="${cx}" cy="116" r="5" fill="#1a0b26"/>`;
  const sadEye = (cx, flip) => `${eyeOpen(cx, flip)}<path d="M${cx - 20} ${flip > 0 ? 100 : 92} L${cx + 20} ${flip > 0 ? 92 : 100} L${cx + 20} 84 L${cx - 20} 84Z" fill="#231530"/>`;
  const thinkEye = cx => `${eyeOpen(cx, 1)}`;

  return `<svg class="kortomi" viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kortomi">
  <defs>
    <radialGradient id="k-iris" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#d7c2ff"/><stop offset=".55" stop-color="#9b6cff"/><stop offset="1" stop-color="#5a2fbf"/></radialGradient>
    <linearGradient id="k-vest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a35a0"/><stop offset="1" stop-color="#3f1d63"/></linearGradient>
    <linearGradient id="k-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9cc7" stop-opacity=".95"/><stop offset="1" stop-color="#ff5fa2" stop-opacity=".55"/></linearGradient>
    <linearGradient id="k-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b2a6b"/><stop offset="1" stop-color="#26123a"/></linearGradient>
  </defs>
  <ellipse cx="120" cy="292" rx="58" ry="7" fill="#000" opacity=".35"/>
  <g class="k-body">
    <g class="k-tail">
      <path d="M148 240 C190 244 208 214 200 186 C196 170 206 158 216 160" fill="none" stroke="#231530" stroke-width="14" stroke-linecap="round"/>
      <path d="M200 176 l-14 -8 l2 16z M200 176 l14 -10 l-1 17z" fill="#ff5fa2"/><circle cx="200" cy="176" r="4.5" fill="#e8c27a"/>
    </g>
    <g class="k-wing-l"><path d="M98 182 C70 160 38 150 14 160 C24 170 26 182 22 192 C34 186 44 190 48 200 C58 192 70 194 76 204 C82 194 92 192 98 196Z" fill="url(#k-wing)" stroke="#b89cff" stroke-opacity=".7" stroke-width="2"/></g>
    <g class="k-wing-r"><path d="M142 182 C170 160 202 150 226 160 C216 170 214 182 218 192 C206 186 196 190 192 200 C182 192 170 194 164 204 C158 194 148 192 142 196Z" fill="url(#k-wing)" stroke="#b89cff" stroke-opacity=".7" stroke-width="2"/></g>
    <!-- Beine -->
    <rect x="96" y="250" width="20" height="36" rx="10" fill="#231530"/><rect x="124" y="250" width="20" height="36" rx="10" fill="#231530"/>
    <ellipse cx="104" cy="286" rx="15" ry="7" fill="#ff5fa2"/><ellipse cx="136" cy="286" rx="15" ry="7" fill="#ff5fa2"/>
    <!-- Körper: Hemd + Weste -->
    <path d="M86 186 Q120 172 154 186 L160 256 Q120 268 80 256Z" fill="#fff6fb"/>
    <path d="M86 186 Q100 180 112 182 L120 222 L112 262 Q94 262 80 256Z" fill="url(#k-vest)"/>
    <path d="M154 186 Q140 180 128 182 L120 222 L128 262 Q146 262 160 256Z" fill="url(#k-vest)"/>
    <circle cx="114" cy="232" r="3" fill="#e8c27a"/><circle cx="113" cy="246" r="3" fill="#e8c27a"/>
    <path d="M138 214 h12 v12 h-12z" fill="#e8c27a" opacity=".0"/>
    <path d="M140 210 q6 -4 12 0" stroke="#e8c27a" stroke-width="2" fill="none"/>
    <!-- Arme -->
    <path d="M88 192 C72 206 70 226 76 240" fill="none" stroke="#fff6fb" stroke-width="16" stroke-linecap="round"/>
    <path d="M77 206 l-9 6" stroke="#ff5fa2" stroke-width="5" stroke-linecap="round"/>
    <circle cx="77" cy="244" r="9" fill="#231530"/>
    <path d="M152 192 C170 200 176 214 170 226" fill="none" stroke="#fff6fb" stroke-width="16" stroke-linecap="round"/>
    <path d="M163 200 l9 6" stroke="#ff5fa2" stroke-width="5" stroke-linecap="round"/>
    <!-- Kartenfächer in der Pfote -->
    <g transform="translate(170 222)">
      <g transform="rotate(-28)"><rect x="-10" y="-34" width="22" height="31" rx="3" fill="#fff6fb" stroke="#2a1238" stroke-width="1.5"/></g>
      <g transform="rotate(-8)"><rect x="-10" y="-36" width="22" height="31" rx="3" fill="#fff6fb" stroke="#2a1238" stroke-width="1.5"/><path d="${SUIT_PATH.S}" fill="#2a1238" transform="translate(-5 -28) scale(.12)"/></g>
      <g transform="rotate(14)"><rect x="-10" y="-36" width="22" height="31" rx="3" fill="#fff6fb" stroke="#2a1238" stroke-width="1.5"/><path d="${SUIT_PATH.H}" fill="#e0307a" transform="translate(-5 -28) scale(.12)"/></g>
      <circle cx="0" cy="2" r="9" fill="#231530"/>
    </g>
    <!-- Fliege -->
    <path d="M120 188 L102 178 L104 198Z M120 188 L138 178 L136 198Z" fill="#ff5fa2" stroke="#c2307a" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="120" cy="188" r="5" fill="#e8c27a"/>
    <g class="k-head">
      <!-- Ohren -->
      <path d="M58 78 L44 16 L102 52 Z" fill="#231530"/><path d="M182 78 L196 16 L138 52 Z" fill="#231530"/>
      <path d="M62 66 L54 32 L88 54 Z" fill="#ff7ab4"/><path d="M178 66 L186 32 L152 54 Z" fill="#ff7ab4"/>
      <circle cx="191" cy="44" r="5" fill="none" stroke="#e8c27a" stroke-width="2.4"/>
      <!-- Kopf -->
      <ellipse cx="120" cy="108" rx="74" ry="64" fill="#231530"/>
      <ellipse cx="102" cy="64" rx="26" ry="10" fill="#fff" opacity=".06"/>
      <!-- Croupier-Schirm -->
      <path d="M50 90 Q120 38 190 90 L186 74 Q120 28 54 74Z" fill="#ff5fa2"/>
      <path d="M50 90 Q120 52 190 90 Q192 100 186 104 Q120 72 54 104 Q48 100 50 90Z" fill="url(#k-visor)"/>
      <path d="M56 100 Q120 66 184 100" fill="none" stroke="#e8c27a" stroke-width="2"/>
      <g transform="translate(144 44) rotate(16)"><rect x="0" y="0" width="20" height="28" rx="3" fill="#fff6fb" stroke="#2a1238" stroke-width="1.4"/><path d="${SUIT_PATH.H}" fill="#e0307a" transform="translate(4 7) scale(.12)"/></g>
      <!-- Schnurrhaare -->
      <path d="M48 128 l-22 -4 M48 136 l-22 2 M192 128 l22 -4 M192 136 l22 2" stroke="#b89cff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <!-- Wangen -->
      <ellipse cx="72" cy="142" rx="11" ry="6.5" fill="#ff5fa2" opacity=".5"/><ellipse cx="168" cy="142" rx="11" ry="6.5" fill="#ff5fa2" opacity=".5"/>
      <path d="M116 134 h8 l-4 5z" fill="#ff7ab4"/>

      <!-- Augen je Stimmung -->
      <g class="mood idle think"><g class="k-blink">${eyeOpen(92, 1)}${eyeOpen(148, -1)}</g></g>
      <g class="mood happy">${arc(92)}${arc(148)}</g>
      <g class="mood smug">${eyeOpen(92, 1)}${eyeOpen(148, -1)}${lidL}${lidR}<path d="M72 106 Q92 96 112 106" stroke="#231530" stroke-width="6" fill="none"/><path d="M128 106 Q148 96 168 106" stroke="#231530" stroke-width="6" fill="none"/></g>
      <g class="mood shock">${shockEye(92)}${shockEye(148)}</g>
      <g class="mood sad">${sadEye(92, 1)}${sadEye(148, -1)}</g>
      <g class="mood wink">${eyeOpen(92, 1)}${arc(148)}</g>
      <g class="mood love">${heart(92)}${heart(148)}</g>

      <!-- Münder je Stimmung -->
      <g class="mood idle"><path d="M108 144 q6 6 12 0 q6 6 12 0" fill="none" stroke="#fff6fb" stroke-width="3" stroke-linecap="round"/><path d="M123 146 l3 6 l3 -5z" fill="#fff"/></g>
      <g class="mood happy love"><path d="M104 142 Q120 166 136 142Z" fill="#5b1838"/><path d="M111 152 Q120 160 129 152 Q120 148 111 152Z" fill="#ff7ab4"/><path d="M106 143 l4 6 l4 -5z M126 143 l4 6 l4 -5z" fill="#fff"/></g>
      <g class="mood smug"><path d="M108 146 Q124 152 136 140" fill="none" stroke="#fff6fb" stroke-width="3.2" stroke-linecap="round"/><path d="M128 147 l3 6 l3 -7z" fill="#fff"/></g>
      <g class="mood shock"><ellipse cx="120" cy="150" rx="9" ry="11" fill="#5b1838"/></g>
      <g class="mood sad"><path d="M106 152 q7 -8 14 0 q7 -8 14 0" fill="none" stroke="#fff6fb" stroke-width="3" stroke-linecap="round"/>
        <path d="M176 98 q6 10 0 14 q-6 -4 0 -14z" fill="#9fd6ff" opacity=".85"/></g>
      <g class="mood wink"><path d="M108 144 q6 6 12 0 q6 6 12 0" fill="none" stroke="#fff6fb" stroke-width="3" stroke-linecap="round"/><path d="M121 147 q5 12 10 0z" fill="#ff7ab4"/></g>
      <g class="mood think"><path d="M110 148 h18" stroke="#fff6fb" stroke-width="3" stroke-linecap="round"/><circle cx="200" cy="70" r="5" fill="#d9ccff"/><circle cx="212" cy="54" r="7" fill="#d9ccff"/></g>
    </g>
  </g>
</svg>`;
}

// ---------- Chips ----------
export const CHIP_VALUES = [5, 25, 100, 500];
const CHIP_STYLE = {
  5: { base: '#ff5fa2', edge: '#fff4fa', ink: '#fff', ring: '#c2307a' },
  25: { base: '#8d5cff', edge: '#e8dcff', ink: '#fff', ring: '#5a2fbf' },
  100: { base: '#2a1238', edge: '#e8c27a', ink: '#e8c27a', ring: '#e8c27a' },
  500: { base: '#e8c27a', edge: '#2a1238', ink: '#2a1238', ring: '#b98a3e' },
};
export function chipSVG(v) {
  const s = CHIP_STYLE[v];
  const notches = Array.from({ length: 8 }, (_, i) => `<rect x="44" y="2" width="12" height="14" rx="2" fill="${s.edge}" transform="rotate(${i * 45} 50 50)"/>`).join('');
  return `<svg viewBox="0 0 100 100" class="chip-svg"><circle cx="50" cy="50" r="48" fill="${s.base}"/>${notches}
    <circle cx="50" cy="50" r="34" fill="${s.base}" stroke="${s.ring}" stroke-width="2.5" stroke-dasharray="5 4"/>
    <circle cx="50" cy="50" r="27" fill="${s.base}" stroke="${s.edge}" stroke-opacity=".6" stroke-width="1.5"/>
    <text x="50" y="${v >= 100 ? 58 : 60}" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="${v >= 100 ? 24 : 28}" fill="${s.ink}">${v}</text>
    <ellipse cx="38" cy="26" rx="18" ry="8" fill="#fff" opacity=".18"/></svg>`;
}
export function chipSideSVG(v) { // für Stapel: flache Seitenansicht
  const s = CHIP_STYLE[v];
  return `<svg viewBox="0 0 100 100" class="chip-svg"><ellipse cx="50" cy="58" rx="48" ry="30" fill="${s.ring}"/>
  <ellipse cx="50" cy="50" rx="48" ry="30" fill="${s.base}"/>
  ${[0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2; return `<ellipse cx="${50 + Math.cos(a) * 40}" cy="${50 + Math.sin(a) * 25}" rx="6" ry="4" fill="${s.edge}"/>`; }).join('')}
  <ellipse cx="50" cy="50" rx="30" ry="18" fill="none" stroke="${s.edge}" stroke-opacity=".7" stroke-width="2"/></svg>`;
}
export function chipBreakdown(amount) {
  const out = [];
  for (const v of [...CHIP_VALUES].reverse()) while (amount >= v) { out.push(v); amount -= v; }
  return out;
}

// ---------- Medaillen ----------
export function medalSVG(kind = 'gold', glyph = '★') {
  const c = { gold: ['#f6dc9c', '#c9963f'], pink: ['#ffb3d6', '#e0307a'], lilac: ['#e2d6ff', '#8d5cff'] }[kind];
  return `<svg viewBox="0 0 64 64" class="medal"><path d="M20 2 L32 22 L44 2 L52 2 L40 26 L24 26 L12 2Z" fill="#5b2a86"/><path d="M24 2 L32 16 L40 2" fill="none" stroke="#ff5fa2" stroke-width="3"/>
  <circle cx="32" cy="40" r="21" fill="${c[1]}"/><circle cx="32" cy="40" r="17" fill="${c[0]}"/><circle cx="32" cy="40" r="17" fill="none" stroke="${c[1]}" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="32" y="47" text-anchor="middle" font-size="18" font-family="Fredoka, system-ui, sans-serif" font-weight="700" fill="#3a1d10">${glyph}</text></svg>`;
}

// ---------- Icons ----------
const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  soundOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  stats: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/>',
  new: '<rect x="5" y="3.5" width="11" height="15" rx="2"/><path d="M9 21.5h8a2 2 0 002-2V8"/><path d="M10.5 8v6M7.5 11h6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  magic: '<path d="M4 20L15 9M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z"/>',
};
export function icon(name) { return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`; }

// ---------- Sprite in das Dokument schreiben ----------
export function buildSprite(el) {
  let out = '';
  for (const s of SUITS) for (let r = 1; r <= 13; r++) out += `<symbol id="c-${r}${s}" viewBox="0 0 250 350">${cardFaceSVG(r, s)}</symbol>`;
  out += `<symbol id="c-back" viewBox="0 0 250 350">${cardBackSVG()}</symbol>`;
  for (const s of SUITS) out += `<symbol id="suit-${s}" viewBox="0 0 100 100"><path d="${SUIT_PATH[s]}" fill="currentColor"/></symbol>`;
  el.innerHTML = out;
}
export const useCard = id => `<svg viewBox="0 0 250 350"><use href="#c-${id}"/></svg>`;
