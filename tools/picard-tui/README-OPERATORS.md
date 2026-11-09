# Picard TUI operators

- **Node.js 24+** on `PATH`.
- From the **repository root**, run:

```text
npm install
```

The default LCARS frame TUI uses only Node built-ins (no extra npm UI packages).

- **Recommended:** **Windows Terminal** with **`WT_SESSION`** for 24-bit truecolor. Use at least **72 columns** width; **100×32** is the design target.
- If **`NO_COLOR`** is set (or stdout is not a TTY), the stacked **legacy** line printer runs instead unless **`PICARD_TUI_FORCE_K9S=1`**. Details in [PICARD-TUI.md](../../docs/PICARD-TUI.md).
