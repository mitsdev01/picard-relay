/**
 * Rate-limited activity log + spinner controller for long-running TUI phases.
 */

const DEFAULT_MIN_INTERVAL_MS = 300;
const DEFAULT_MAX_LINES = 500;

/**
 * @typedef {{ append: (line: string) => void, setStatus: (s: string) => void, clear: () => void, getLines: () => string[] }} ActivityLogHandle
 */

/**
 * Ring-buffer style log with min interval between appends and max line count.
 */
export class ActivityLog {
  /**
   * @param {{ minIntervalMs?: number, maxLines?: number, onFlush?: (lines: string[]) => void }} [opts]
   */
  constructor(opts = {}) {
    this._minInterval = typeof opts.minIntervalMs === 'number' ? opts.minIntervalMs : DEFAULT_MIN_INTERVAL_MS;
    this._maxLines = typeof opts.maxLines === 'number' ? opts.maxLines : DEFAULT_MAX_LINES;
    this._onFlush = typeof opts.onFlush === 'function' ? opts.onFlush : null;
    /** @type {string[]} */
    this._lines = [];
    this._lastAppend = 0;
    /** @type {string | null} */
    this._pending = null;
    this._pendingTimer = null;
  }

  /** @param {string} line */
  append(line) {
    const text = String(line ?? '');
    const now = Date.now();
    const elapsed = now - this._lastAppend;
    if (elapsed >= this._minInterval) {
      this._pushNow(text);
      return;
    }
    this._pending = text;
    if (this._pendingTimer) return;
    const wait = Math.max(0, this._minInterval - elapsed);
    this._pendingTimer = setTimeout(() => {
      this._pendingTimer = null;
      if (this._pending !== null) {
        const p = this._pending;
        this._pending = null;
        this._pushNow(p);
      }
    }, wait);
  }

  /** @param {string} line */
  _pushNow(line) {
    this._lastAppend = Date.now();
    this._lines.push(line);
    if (this._lines.length > this._maxLines) {
      this._lines = this._lines.slice(-this._maxLines);
    }
    this._onFlush?.(this._lines);
  }

  clear() {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    this._pending = null;
    this._lines = [];
    this._onFlush?.(this._lines);
  }

  getLines() {
    return this._lines.slice();
  }
}

const SPINNER_FRAMES = ['|', '/', '-', '\\'];

/**
 * Updates a short status line on an interval until stopped.
 */
export class SpinnerController {
  /**
   * @param {{ intervalMs?: number, onTick: (frame: string, label: string) => void }} opts
   */
  constructor(opts) {
    this._intervalMs = typeof opts.intervalMs === 'number' ? opts.intervalMs : 120;
    this._onTick = opts.onTick;
    /** @type {ReturnType<typeof setInterval> | null} */
    this._id = null;
    this._frame = 0;
    /** @type {string} */
    this._label = '';
  }

  /**
   * @param {string} label
   */
  start(label = '') {
    this.stop();
    this._label = String(label ?? '');
    this._frame = 0;
    this._id = setInterval(() => {
      this._frame = (this._frame + 1) % SPINNER_FRAMES.length;
      const fr = SPINNER_FRAMES[this._frame];
      try {
        this._onTick(fr, this._label);
      } catch {
        /* ignore */
      }
    }, this._intervalMs);
    try {
      this._onTick(SPINNER_FRAMES[0], this._label);
    } catch {
      /* ignore */
    }
  }

  /**
   * @param {string} label
   */
  setLabel(label) {
    this._label = String(label ?? '');
  }

  stop() {
    if (this._id) {
      clearInterval(this._id);
      this._id = null;
    }
  }
}
