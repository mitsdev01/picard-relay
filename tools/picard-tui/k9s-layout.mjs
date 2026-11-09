/**
 * Pure layout helpers for K9s-style LCARS caps (block-element borders).
 * Centralized width math for resize reflow; no blessed dependency.
 */

/** Unicode block elements for thin "rounded cap" illusion */
export const BLOCK = Object.freeze({
  lowerHalf: '\u2584',
  upperHalf: '\u2580',
  full: '\u2588',
  left: '\u258c',
  right: '\u2590',
});

/**
 * Clamp inner width for a box given outer width and horizontal padding.
 * @param {number} outerCols
 * @param {number} padEachSide default 1 (border column each side)
 */
export function innerWidth(outerCols, padEachSide = 1) {
  const w = Number(outerCols);
  if (!Number.isFinite(w) || w < 2) return 0;
  return Math.max(0, Math.floor(w) - 2 * padEachSide);
}

/**
 * Horizontal bar of full block for footer/header cap effect.
 * @param {number} width visible columns
 * @param {string} [ch] default full block
 */
export function horizontalCapLine(width, ch = BLOCK.full) {
  const w = Math.max(0, Math.floor(Number(width) || 0));
  if (w <= 0) return '';
  return ch.repeat(w);
}

/**
 * Single-line label padded/truncated to inner width (plain text, no ANSI).
 * @param {string} label
 * @param {number} innerCols
 */
export function fitLabel(label, innerCols) {
  const n = Math.max(0, Math.floor(innerCols));
  const s = String(label ?? '');
  if (s.length <= n) return s.padEnd(n, ' ');
  if (n <= 3) return s.slice(0, n);
  return s.slice(0, n - 3) + '...';
}
