/**
 * K9s-style LCARS palette for blessed TUI (exact hex per plan).
 * Truecolor when color depth >= 24 and NO_COLOR unset; else 16-color fallbacks.
 */

/** @type {Readonly<Record<string, string>>} */
export const PALETTE_HEX = Object.freeze({
  apricot: '#FF9966',
  neoOrange: '#FF6633',
  selected: '#CC99CC',
  text: '#99CCFF',
  textAlt: '#FFFFFF',
  bg: '#000000',
});

/** Blessed 16-color names when truecolor is unavailable */
export const PALETTE_16 = Object.freeze({
  apricot: 'yellow',
  neoOrange: 'red',
  selected: 'magenta',
  text: 'cyan',
  textAlt: 'white',
  bg: 'black',
});

/**
 * Whether to use 24-bit styles (blessed accepts `#rrggbb` when terminal supports it).
 */
export function useTruecolor() {
  if (process.env.NO_COLOR !== undefined) return false;
  try {
    const d = typeof process.stdout.getColorDepth === 'function' ? process.stdout.getColorDepth() : 8;
    return d >= 24;
  } catch {
    return false;
  }
}

/**
 * Foreground color string for blessed `style` (fg / border.fg).
 * @param {string} hex — e.g. `#FF9966`
 * @param {boolean} [truecolor]
 */
export function hexToBlessedFg(hex, truecolor = useTruecolor()) {
  if (!truecolor) return mapHexTo16(hex);
  return hex;
}

/**
 * Background color for blessed.
 */
export function hexToBlessedBg(hex, truecolor = useTruecolor()) {
  if (!truecolor) return mapHexTo16(hex);
  return hex;
}

export function mapHexTo16(hex) {
  const h = String(hex || '').toLowerCase();
  if (h === PALETTE_HEX.apricot.toLowerCase()) return PALETTE_16.apricot;
  if (h === PALETTE_HEX.neoOrange.toLowerCase()) return PALETTE_16.neoOrange;
  if (h === PALETTE_HEX.selected.toLowerCase()) return PALETTE_16.selected;
  if (h === PALETTE_HEX.text.toLowerCase()) return PALETTE_16.text;
  if (h === PALETTE_HEX.textAlt.toLowerCase()) return PALETTE_16.textAlt;
  if (h === PALETTE_HEX.bg.toLowerCase()) return PALETTE_16.bg;
  return PALETTE_16.text;
}

/**
 * @param {boolean} selected
 * @param {boolean} [truecolor]
 * @returns {import('blessed').Widgets.Types.TStyle}
 */
export function styleNavButton(selected, truecolor = useTruecolor()) {
  const bg = hexToBlessedBg(PALETTE_HEX.bg, truecolor);
  const fg = selected
    ? hexToBlessedFg(PALETTE_HEX.selected, truecolor)
    : hexToBlessedFg(PALETTE_HEX.text, truecolor);
  const borderFg = selected
    ? hexToBlessedFg(PALETTE_HEX.neoOrange, truecolor)
    : hexToBlessedFg(PALETTE_HEX.apricot, truecolor);
  return {
    fg,
    bg,
    border: { fg: borderFg },
    focus: { fg: hexToBlessedFg(PALETTE_HEX.selected, truecolor) },
  };
}

/**
 * Header telemetry strip: muted text + accent labels.
 * @param {boolean} [truecolor]
 */
export function styleHeaderTelemetry(truecolor = useTruecolor()) {
  return {
    fg: hexToBlessedFg(PALETTE_HEX.text, truecolor),
    bg: hexToBlessedBg(PALETTE_HEX.bg, truecolor),
    border: { fg: hexToBlessedFg(PALETTE_HEX.apricot, truecolor) },
  };
}

/**
 * ANSI truecolor SGR for foreground (for log widget tags=false plain lines).
 * @param {string} hex
 */
export function hexToAnsiFg(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return '';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `\x1b[38;2;${r};${g};${b}m`;
}

export const ANSI_RESET = '\x1b[0m';

/**
 * Paint a string with truecolor fg when allowed; else plain.
 */
export function paintAnsiLine(line, hexFg) {
  if (process.env.NO_COLOR !== undefined || !useTruecolor()) return String(line ?? '');
  return hexToAnsiFg(hexFg) + String(line ?? '') + ANSI_RESET;
}
