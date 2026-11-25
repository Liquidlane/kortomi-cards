// Doktorhut für Choc. Wird immer mitgezeichnet, CSS blendet ihn erst nach dem Abschluss ein
// (html.choc-grad), so muss nach der Feier nichts neu gezeichnet werden.
export function gradCap() {
  return `<g class="grad-cap" transform="rotate(-8 120 60)">
    <path d="M88 92 Q120 78 154 92 L152 62 Q120 52 90 62 Z" fill="#1f1828"/>
    <path d="M92 66 Q120 58 150 66" stroke="#3a2e48" stroke-width="3" fill="none"/>
    <path d="M120 24 L186 48 L120 70 L54 48 Z" fill="#2c2238" stroke="#4d3d62" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M120 30 L172 48 L120 64" stroke="#3d3050" stroke-width="2" fill="none" opacity=".7"/>
    <circle cx="120" cy="47" r="4.5" fill="#e8c27a"/>
    <path d="M120 47 Q152 50 170 54 L172 84" stroke="#e8c27a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M166 82 h12 l-1.5 16 h-9 Z" fill="#e8c27a"/>
    <path d="M168 86 v10 M171 86 v10 M174 86 v10" stroke="#b98a3e" stroke-width="1.2"/>
  </g>`;
}
