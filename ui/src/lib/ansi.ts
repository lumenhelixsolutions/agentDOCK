/**
 * Minimal ANSI renderer for HOOT's live console.
 *
 * Supports SGR styling (colors, bold/dim/italic/underline, 256-color and
 * truecolor), carriage-return overwrite (progress bars), and strips
 * non-styling escapes (cursor movement, OSC titles). No dependencies.
 *
 * The basic 16 colors resolve through CSS vars (--term-*) so the palette is
 * tunable from index.css; the console surface itself stays dark in both
 * themes, as real terminals do.
 */

export interface AnsiStyle {
  color?: string;
  background?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface AnsiSegment {
  text: string;
  style: AnsiStyle;
}

const BASIC = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;

function basicColor(idx: number, bright: boolean): string {
  return `var(--term-${bright ? "bright-" : ""}${BASIC[idx]})`;
}

/** xterm 256-color index → CSS color. */
function color256(n: number): string {
  if (n < 8) return basicColor(n, false);
  if (n < 16) return basicColor(n - 8, true);
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return `rgb(${v},${v},${v})`;
  }
  const c = n - 16;
  const r = Math.floor(c / 36);
  const g = Math.floor((c % 36) / 6);
  const b = c % 6;
  const scale = (x: number) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${scale(r)},${scale(g)},${scale(b)})`;
}

function applySgr(style: AnsiStyle, params: number[]): AnsiStyle {
  const next = { ...style };
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (p === 0) return {};
    else if (p === 1) next.bold = true;
    else if (p === 2) next.dim = true;
    else if (p === 3) next.italic = true;
    else if (p === 4) next.underline = true;
    else if (p === 22) {
      next.bold = false;
      next.dim = false;
    } else if (p === 23) next.italic = false;
    else if (p === 24) next.underline = false;
    else if (p >= 30 && p <= 37) next.color = basicColor(p - 30, false);
    else if (p === 39) next.color = undefined;
    else if (p >= 90 && p <= 97) next.color = basicColor(p - 90, true);
    else if (p >= 40 && p <= 47) next.background = basicColor(p - 40, false);
    else if (p === 49) next.background = undefined;
    else if (p >= 100 && p <= 107) next.background = basicColor(p - 100, true);
    else if (p === 38 || p === 48) {
      const target = p === 38 ? "color" : "background";
      if (params[i + 1] === 5 && params[i + 2] !== undefined) {
        next[target] = color256(params[i + 2]);
        i += 2;
      } else if (params[i + 1] === 2 && params[i + 4] !== undefined) {
        next[target] = `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})`;
        i += 4;
      }
    }
  }
  return next;
}

// OSC sequences (e.g. window title), then remaining CSI/escape controls.
const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const SGR_SPLIT_RE = /(\x1b\[[\d;]*m)/;
const OTHER_CSI_RE = /\x1b\[[\d;?]*[A-LN-Za-ln-z]/g; // every CSI except SGR 'm'
const STRAY_ESC_RE = /\x1b[^[\]]?/g;

export interface ParsedOutput {
  /** Lines of styled segments, ready to render. */
  lines: AnsiSegment[][];
  /** Plain-text lines (ANSI stripped, \r overwrite applied) for search/copy. */
  plain: string[];
  /** Number of older lines dropped by maxLines capping. */
  truncated: number;
}

export function parseAnsi(raw: string, maxLines = 2500): ParsedOutput {
  const sanitized = raw.replace(OSC_RE, "").replace(OTHER_CSI_RE, "");
  const rawLines = sanitized.split("\n");
  const truncated = Math.max(0, rawLines.length - maxLines);
  const slice = truncated > 0 ? rawLines.slice(truncated) : rawLines;

  let style: AnsiStyle = {};
  const lines: AnsiSegment[][] = [];
  const plain: string[] = [];

  for (const rawLine of slice) {
    // Carriage-return overwrite: keep only what follows the final \r,
    // emulating in-place progress updates.
    const visible = rawLine.includes("\r") ? rawLine.slice(rawLine.lastIndexOf("\r") + 1) : rawLine;
    const segments: AnsiSegment[] = [];
    let text = "";
    for (const part of visible.split(SGR_SPLIT_RE)) {
      if (!part) continue;
      if (part.startsWith("\x1b[")) {
        const params = part
          .slice(2, -1)
          .split(";")
          .map((value) => (value === "" ? 0 : Number(value)));
        style = applySgr(style, params);
      } else {
        const clean = part.replace(STRAY_ESC_RE, "");
        if (clean) {
          segments.push({ text: clean, style });
          text += clean;
        }
      }
    }
    lines.push(segments);
    plain.push(text);
  }

  return { lines, plain, truncated };
}

/** ANSI-free text with \r overwrite applied — matches what the console shows. */
export function stripAnsi(raw: string): string {
  return parseAnsi(raw, Number.MAX_SAFE_INTEGER).plain.join("\n");
}

export function segmentCss(style: AnsiStyle): React.CSSProperties | undefined {
  if (!style.color && !style.background && !style.bold && !style.dim && !style.italic && !style.underline) return undefined;
  return {
    color: style.color,
    backgroundColor: style.background,
    fontWeight: style.bold ? 600 : undefined,
    opacity: style.dim ? 0.6 : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    textDecoration: style.underline ? "underline" : undefined,
  };
}
