export type HootMood =
  | "idle"
  | "peeking"
  | "scanning"
  | "syncing"
  | "thinking"
  | "error"
  | "launching"
  | "celebrating"
  | "proud"
  | "talking"
  | "reading"
  | "curious"
  | "building"
  | "installing"
  | "monitoring"
  | "watchful"
  | "alert"
  | "logging";

export type PupilOffset = { lx: number; ly: number; rx: number; ry: number };

export const WIDTH = 11;
export const HOOT_FACE_ROWS = 3;
export const BROW_L_COL = 4;
export const THIRD_EYE_COL = 5;
export const BROW_R_COL = 6;
export const BEAK_L_COL = 4;
export const BEAK_GLYPH_COL = 5;
export const BEAK_R_COL = 6;

/** Single-glyph slots advance this many domain steps per mascot frame (L→R march) */
export const CASCADE_TICK_MULT = 4;
/** Beak trails the brow lead (col 4) by this many fast-tick steps */
export const BEAK_CASCADE_LAG = 3;
const BRAND_WIDTH = 19;
const PUPIL_CHARS = ["·", "o", "O", "●"] as const;
const EYE_GLOW_CHARS = new Set(["●", "o", "O", "·", "◎", "◉", "◔", "◕", "×", "-", "!", "^", "○", "◠", "◡", "◎", "◕"]);

function fit(line: string, width = WIDTH): string {
  if (line.length === width) return line;
  if (line.length > width) return line.slice(0, width);
  const pad = width - line.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + line + " ".repeat(width - line.length - left);
}

function brandFit(line: string): string {
  return fit(line, BRAND_WIDTH);
}

function pupilChar(offset: number): string {
  const idx = Math.max(0, Math.min(3, Math.round((offset + 1) * 1.5)));
  return PUPIL_CHARS[idx];
}

function earLine(mood: HootMood, frame: number): string {
  const ears: Partial<Record<HootMood, string[]>> = {
    idle: ["  /\\_/\\  ", "  /\\_/\\  ", "  /\\_/\\  "],
    peeking: ["  /•_•\\  ", "  /\\_/\\  ", "  /\\•/\\  "],
    curious: ["  /? ?\\  ", "  /\\_/\\  ", "  /•_•\\  "],
    scanning: ["> scan <  ", " [~~~~]  ", " |scan|  "],
    syncing: [" [~~~~]  ", " ~sync~  ", " |~~~~| "],
    thinking: ["  /~ ~\\  ", "  /\\_/\\  ", "  /~ ~\\  "],
    error: ["  /x x\\  ", "  /X X\\  ", "  /x_X\\  "],
    launching: ["  />>\\  ", "  />>>\\ ", "  />>\\  "],
    celebrating: ["  \\^ ^/  ", "  \\♪ ♪/  ", "  \\★ ★/  "],
    proud: ["  \\^ ^/  ", "  /★_★\\  ", "  \\◠ ◠/  "],
    talking: ["  /◠ ◠\\  ", "  /\\_/\\  ", "  /◡ ◡\\  "],
    reading: ["  /‾‾‾\\  ", "  /\\_/\\  ", "  /---\\  "],
    building: ["  /=#=\\  ", "  /\\+/\\  ", "  /+|+\\  "],
    installing: ["  /+=+\\  ", "  /|+|\\  ", "  /=#=\\  "],
    monitoring: [" |● ● ●| ", " |○ ○ ○| ", " |● ○ ●| "],
    watchful: [" |● ● ●| ", " |○ ● ○| ", " |● ● ●| "],
    alert: ["  /! !\\  ", "  /!! !\\ ", "  /!X!\\  "],
    logging: [" |◉ ◉ ◉| ", " |○ ● ○| ", " |● ◉ ●| "],
  };
  const variants = ears[mood] || ears.idle!;
  return fit(variants[frame % variants.length]!);
}

function eyeLine(offset: PupilOffset, mood: HootMood, frame: number): string {
  let eyes = `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  if (mood === "error") eyes = frame % 2 === 0 ? "( × × )" : "( > < )";
  else if (mood === "celebrating") eyes = frame % 2 === 0 ? "( ^ ^ )" : "( ◠ ◠ )";
  else if (mood === "alert") eyes = frame % 3 === 0 ? "( ! ! )" : frame % 3 === 1 ? "( O ! )" : "( ! O )";
  else if (mood === "monitoring") eyes = frame % 4 === 0 ? "( ● ● )" : frame % 4 === 2 ? "( o o )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "thinking") eyes = frame % 3 === 0 ? "( - o )" : frame % 3 === 1 ? "( o - )" : "( o o )";
  else if (mood === "reading") eyes = frame % 2 === 0 ? "( ◡ ◡ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "building") eyes = frame % 2 === 0 ? "( ◉ ◉ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "peeking") eyes = frame % 2 === 0 ? "( ◔ ◔ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "scanning") eyes = frame % 2 === 0 ? "( ◉ ◉ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "launching") eyes = frame % 2 === 0 ? "( ◎ ◎ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "talking") eyes = frame % 2 === 0 ? "( ◕ ◕ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "logging") eyes = frame % 4 === 0 ? "( ● ● )" : frame % 4 === 2 ? "( ◉ ◉ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "syncing") eyes = frame % 2 === 0 ? "( ◉ ◉ )" : frame % 4 === 1 ? "( ● ○ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "installing") eyes = frame % 2 === 0 ? "( ◉ ◉ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "curious") eyes = frame % 2 === 0 ? "( ◔ ◔ )" : frame % 3 === 1 ? "( ◕ ○ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "proud") eyes = frame % 2 === 0 ? "( ^ ^ )" : "( ◠ ◠ )";
  else if (mood === "watchful") eyes = frame % 4 === 0 ? "( ● ● )" : frame % 4 === 2 ? "( ◉ ◉ )" : `( ${pupilChar(offset.lx)} ${pupilChar(offset.rx)} )`;
  else if (mood === "idle" && frame % 12 === 0) eyes = "( - - )";
  return fit(eyes);
}

function beakLine(mood: HootMood, frame: number): string {
  const beaks: Partial<Record<HootMood, string[]>> = {
    idle: ["    ▽     "],
    peeking: ["    °     "],
    scanning: ["   .=.    ", "   >.<    "],
    thinking: ["    ?     ", "    ‥     "],
    error: ["    X     "],
    launching: ["   >>     ", "   >^     "],
    celebrating: ["    ^     ", "    ★     "],
    talking: ["   ~▽~    ", "   ~v~    "],
    reading: ["    ▽     ", "    ‾     "],
    building: ["   +=     ", "   |+     "],
    monitoring: ["   --     ", "   ::     "],
    alert: ["   !!     ", "   !?     "],
    logging: ["   ::     ", "   ..     "],
    syncing: ["   =~=    ", "   >.<    "],
    installing: ["   |+     ", "   +=     "],
    curious: ["    ?     ", "    °     "],
    proud: ["    ^     ", "    ★     "],
    watchful: ["   --     ", "   ::     "],
  };
  const variants = beaks[mood] || beaks.idle!;
  return fit(variants[frame % variants.length]!);
}

function statusCaption(mood: HootMood, frame: number, override?: string | null): string {
  if (override) return fit(override.slice(0, WIDTH));
  const caps: Partial<Record<HootMood, string[]>> = {
    idle: [" watching "],
    peeking: [" noticed  "],
    curious: [" curious  ", " peeking  "],
    scanning: [" ~scan~  ", " .scan.  "],
    syncing: [" syncing  ", " ~sync~  "],
    thinking: [" thinking ", "   ...   "],
    error: ["  uh-oh!  "],
    launching: [" go now>> ", "  lift..  "],
    celebrating: ["  nice!   "],
    proud: ["  solid!  ", "  nice!   "],
    talking: ["  hoot!   ", "  ~~~    "],
    reading: [" reading  ", "  memo..  "],
    building: [" +stack   ", " |pipe|  "],
    installing: [" install  ", " |pipe|  "],
    monitoring: [" [live]   ", " (watch) "],
    watchful: [" on watch ", " [live]   "],
    alert: [" !warn!   ", " check!  "],
    logging: [" diary..  ", " logbook "],
  };
  const variants = caps[mood] || caps.idle!;
  return fit(variants[frame % variants.length]!);
}

export function computePupilOffset(mouseX: number, mouseY: number, anchorX: number, anchorY: number): PupilOffset {
  const dx = mouseX - anchorX;
  const dy = mouseY - anchorY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = Math.max(-1, Math.min(1, (dx / dist) * Math.min(dist / 120, 1)));
  const ny = Math.max(-1, Math.min(1, (dy / dist) * Math.min(dist / 120, 1)));
  return { lx: nx, ly: ny, rx: nx, ry: ny };
}

function crownLine(mood: HootMood, frame: number): string {
  const crowns: Partial<Record<HootMood, string[]>> = {
    idle: ["   /\\_/\\   ", "   /\\_/\\   "],
    scanning: ["  >scan<   ", "  [~~~~]   "],
    syncing: ["  [~~~~]   ", "  ~sync~   "],
    monitoring: ["  |● ● ●|  ", "  |○ ○ ○|  "],
    watchful: ["  |● ● ●|  ", "  |○ ● ○|  "],
    logging: ["  |◉ ◉ ◉|  ", "  |○ ● ○|  "],
    error: ["   /x x\\   ", "   /X X\\   "],
    celebrating: ["   \\^ ^/   ", "   \\♪ ♪/   "],
    proud: ["   \\^ ^/   ", "   /★_★\\   "],
    launching: ["   />>\\    ", "   />>>\\   "],
    installing: ["   /+=+\\   ", "   /|+|\\   "],
    curious: ["   /? ?\\   ", "   /\\_/\\   "],
    alert: ["   /! !\\   ", "   /!! !\\  "],
  };
  const variants = crowns[mood] || crowns.idle!;
  return brandFit(variants[frame % variants.length]!);
}

function feetLine(frame: number): string {
  return brandFit(frame % 2 === 0 ? "   (:)_(.)   " : "   (:)_(.:)   ");
}

function scanBarLine(mood: HootMood, frame: number): string | null {
  if (mood !== "scanning" && mood !== "syncing" && mood !== "monitoring" && mood !== "logging" && mood !== "watchful") return null;
  const pos = frame % 8;
  const bar = ".".repeat(pos) + "=>" + ".".repeat(7 - pos);
  return brandFit(`  [${bar}]  `);
}

// ── Cognitive ASCII (see → think → intend → do) ─────────────────────────────

export type CognitivePhase = "idle" | "perceive" | "think" | "intent" | "act" | "hold";

export type CognitiveDomain =
  | "idle"
  | "alert"
  | "chatting"
  | "coding"
  | "computing"
  | "scanning"
  | "thinking"
  | "launching"
  | "reading"
  | "monitoring"
  | "syncing"
  | "celebrating";

type DomainVocab = {
  /** SEEING — eye row glyphs */
  perceive: string[];
  /** L/R headband slots — single-char cycle (A–Z, 1↔0, O↔0, …) */
  flanks: string[];
  /** Center badge while holding steady state */
  holdCenter: string;
  tickMs: number;
};

const CHAT_FLANKS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const COMPUTE_FLANKS = "9876543210".split("");

const COGNITIVE_DOMAINS: Record<CognitiveDomain, DomainVocab> = {
  idle: {
    perceive: ["( ◕ ◕ )", "( · · )", "( - - )"],
    flanks: ["·", "-"],
    holdCenter: "·",
    tickMs: 800,
  },
  alert: {
    perceive: ["( ! ! )", "( ! ! )", "( O ! )"],
    flanks: ["!", "X", "?", "!"],
    holdCenter: "!",
    tickMs: 300,
  },
  chatting: {
    perceive: ["( ◕ ◕ )", "( ◉ ◉ )", "( ◕ ◕ )"],
    flanks: CHAT_FLANKS,
    holdCenter: "~",
    tickMs: 380,
  },
  coding: {
    perceive: ["( ◉ ◉ )", "(1 0)", "( ◉ ◉ )"],
    flanks: ["1", "0"],
    holdCenter: ">",
    tickMs: 400,
  },
  computing: {
    perceive: ["( ◉ ◉ )", "( ◕ ◕ )", "( ◉ ◉ )"],
    flanks: COMPUTE_FLANKS,
    holdCenter: "=",
    tickMs: 420,
  },
  scanning: {
    perceive: ["( O 0 )", "( ◉ ◉ )", "( O 0 )"],
    flanks: ["O", "0", ".", ">"],
    holdCenter: "◎",
    tickMs: 350,
  },
  thinking: {
    perceive: ["( - o )", "( o - )", "( o o )"],
    flanks: ["!", "?"],
    holdCenter: "?",
    tickMs: 450,
  },
  launching: {
    perceive: ["( ◎ ◎ )", "( ◉ ◉ )", "( ◎ ◎ )"],
    flanks: [">", ">>", ">", "^"],
    holdCenter: ">",
    tickMs: 300,
  },
  reading: {
    perceive: ["( O 0 )", "( ◡ ◡ )", "( O 0 )"],
    flanks: ["O", "0", "@", "#"],
    holdCenter: "◎",
    tickMs: 500,
  },
  monitoring: {
    perceive: ["( ● ● )", "( o o )", "( ● ● )"],
    flanks: ["●", "○"],
    holdCenter: ":",
    tickMs: 500,
  },
  syncing: {
    perceive: ["( ◉ ◉ )", "( ● ○ )", "( ◉ ◉ )"],
    flanks: ["~", "=", "~", "="],
    holdCenter: "~",
    tickMs: 280,
  },
  celebrating: {
    perceive: ["( ^ ^ )", "( ◠ ◠ )", "( ^ ^ )"],
    flanks: ["^", "★", "^", "★"],
    holdCenter: "^",
    tickMs: 400,
  },
};

const CASCADE_PHASES: CognitivePhase[] = ["perceive", "think", "intent", "act", "hold"];
const FRAMES_PER_CASCADE_PHASE = 2;

export function gapCenterFromEyeLine(eyeLine: string): number {
  const open = eyeLine.indexOf("(");
  const close = eyeLine.indexOf(")", open + 1);
  if (open < 0 || close < 0) return Math.floor(eyeLine.length / 2);
  const inner = eyeLine.slice(open + 1, close);
  const tokens = inner.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return Math.floor(eyeLine.length / 2);
  const firstStart = eyeLine.indexOf(tokens[0]!, open + 1);
  const firstEnd = firstStart + tokens[0]!.length;
  const secondStart = eyeLine.indexOf(tokens[1]!, firstEnd);
  return Math.floor((firstEnd + secondStart) / 2);
}

export function alignRow(glyph: string, width = WIDTH, centerCol?: number): string {
  const text = glyph.trim();
  if (!text) return " ".repeat(width);
  const center = centerCol ?? Math.floor(width / 2);
  const start = Math.max(0, Math.round(center - (text.length - 1) / 2));
  const line = " ".repeat(start) + text;
  if (line.length >= width) return line.slice(0, width);
  return line + " ".repeat(width - line.length);
}

export function faceCenterCol(eyeLine: string): number {
  return gapCenterFromEyeLine(fit(eyeLine));
}

/** Fixed-width face row — glyphs at stable columns so frames never shift */
export function fixedFaceRow(slots: Record<number, string>, width = WIDTH): string {
  const row = Array(width).fill(" ");
  for (const [col, ch] of Object.entries(slots)) {
    const idx = Number(col);
    if (idx >= 0 && idx < width) row[idx] = ch.slice(0, 1);
  }
  return row.join("");
}

/** One brow row: owl tufts `/\_LGR/\` — L/R slots carry the L→R cascade trail */
export function buildBrowLine(
  thirdEye: string,
  width = WIDTH,
  browFlanks?: { left?: string; right?: string },
): string {
  const g = (thirdEye || "·").slice(0, 1);
  const left = (browFlanks?.left ?? "_").slice(0, 1);
  const right = (browFlanks?.right ?? "_").slice(0, 1);
  return fixedFaceRow({ 2: "/", 3: "\\", 4: left, 5: g, 6: right, 7: "/", 8: "\\" }, width);
}

export function parseEyePair(eyeTemplate: string): { left: string; right: string } {
  const m = eyeTemplate.match(/\(\s*(\S)\s+(\S)\s*\)/);
  return { left: m?.[1] ?? "·", right: m?.[2] ?? "·" };
}

/** Owl eyes — wide spacing (owl, not cat) */
export function buildEyesLine(left: string, right: string, width = WIDTH): string {
  return fixedFaceRow(
    {
      1: "(",
      3: (left || "·").slice(0, 1),
      7: (right || "·").slice(0, 1),
      9: ")",
    },
    width,
  );
}

/** Beak port — `\ G /` with single glyph G (`▽` standby or action emit) */
export function buildBeakLine(glyph: string, width = WIDTH): string {
  const g = (glyph || "▽").slice(0, 1);
  return fixedFaceRow({ [BEAK_L_COL]: "\\", [BEAK_GLYPH_COL]: g, [BEAK_R_COL]: "/" }, width);
}

export function resolvePhaseCenter(phase: CognitivePhase, domain: CognitiveDomain): string {
  if (phase === "perceive" || phase === "think") return "?";
  if (phase === "intent") return "@";
  if (phase === "act") return ">";
  return COGNITIVE_DOMAINS[domain].holdCenter;
}

export function flankPairForFrame(flanks: string[], frame: number): { left: string; right: string } {
  if (!flanks.length) return { left: "·", right: "·" };
  const n = flanks.length;
  const leadIdx = ((frame % n) + n) % n;
  const trailIdx = (leadIdx - 1 + n) % n;
  return { left: flanks[trailIdx]!, right: flanks[leadIdx]! };
}

/** L→R flank march — index advances forward through the domain alphabet */
export function flankGlyphLtr(flanks: string[], fastIndex: number, fallback = "·"): string {
  if (!flanks.length) return fallback;
  const n = flanks.length;
  const idx = ((fastIndex % n) + n) % n;
  return flanks[idx]!;
}

function pickCycle<T>(items: T[] | undefined, frame: number, fallback: T): T {
  if (!items?.length) return fallback;
  return items[frame % items.length]!;
}

export type CascadeGlyphs = {
  /** Col 4 — lead entry (newest symbol in the L→R wave) */
  browLeft: string;
  /** Col 5 — 3rd eye / intent preview */
  thirdEye: string;
  /** Col 6 — mid-trail between brow and beak */
  browRight: string;
  /** Beak emit — trails the brow lead */
  beak: string;
};

/**
 * Cascade readout: domain symbols march L→R (col4 → col5 → col6 → beak).
 * Phase drip: ? → @ → > rolls top-down; hold shows the full spatial wave at a glance.
 */
export function resolveCascadeGlyphs(
  phase: CognitivePhase,
  domain: CognitiveDomain,
  flanks: string[],
  frame: number,
): CascadeGlyphs {
  const fast = frame * CASCADE_TICK_MULT;
  const idleFlank = "_";

  if (phase === "perceive") {
    return { browLeft: idleFlank, thirdEye: "?", browRight: idleFlank, beak: "▽" };
  }
  if (phase === "think") {
    return { browLeft: idleFlank, thirdEye: "?", browRight: idleFlank, beak: "?" };
  }
  if (phase === "intent") {
    return { browLeft: idleFlank, thirdEye: "@", browRight: idleFlank, beak: "?" };
  }
  if (phase === "act") {
    return { browLeft: idleFlank, thirdEye: ">", browRight: idleFlank, beak: "@" };
  }

  const holdFallback = COGNITIVE_DOMAINS[domain].holdCenter;
  return {
    browLeft: flankGlyphLtr(flanks, fast, holdFallback),
    thirdEye: flankGlyphLtr(flanks, fast - 1, holdFallback),
    browRight: flankGlyphLtr(flanks, fast - 2, holdFallback),
    beak: flankGlyphLtr(flanks, fast - BEAK_CASCADE_LAG, "▽"),
  };
}

export function resolveThirdEyeGlyph(
  phase: CognitivePhase,
  domain: CognitiveDomain,
  flanks: string[],
  frame: number,
): string {
  return resolveCascadeGlyphs(phase, domain, flanks, frame).thirdEye;
}

export function resolveBeakGlyph(
  phase: CognitivePhase,
  domain: CognitiveDomain,
  flanks: string[],
  frame: number,
): string {
  return resolveCascadeGlyphs(phase, domain, flanks, frame).beak;
}

function emotionToDomain(emotion: HootEmotion, ctx: HootMoodContext): CognitiveDomain {
  const id = emotion.triggerId;
  if (ctx.hasError || emotion.mood === "error") return "alert";
  if (emotion.mood === "talking" || id === "coach:talking") return "chatting";
  if (ctx.coachOpen && ctx.chatLoading) return "thinking";
  if (id.startsWith("coach:") && emotion.mood === "thinking") return "thinking";
  if (id === "chat:loading") return "thinking";
  if (id === "scan:active" || emotion.mood === "scanning") return "scanning";
  if (id === "radar:external" || emotion.mood === "alert") return "alert";
  if (id === "path:/activity" || emotion.mood === "logging") return "monitoring";
  if (emotion.mood === "syncing" || emotion.mood === "installing") return "syncing";
  if (emotion.mood === "celebrating" || emotion.mood === "proud") return "celebrating";
  if (id === "launch:running" || ctx.pathname === "/terminal" || ctx.pathname === "/launch") {
    return id === "launch:running" || Number(ctx.pageContext.runningCount) > 0 ? "coding" : "launching";
  }
  if (emotion.mood === "building" || id === "path:builder" || id === "path:stack") return "computing";
  if (emotion.mood === "launching") return "launching";
  if (emotion.mood === "reading" || emotion.mood === "curious") return "reading";
  if (emotion.mood === "monitoring" || emotion.mood === "watchful") return "monitoring";
  return "idle";
}

type CognitiveState = {
  triggerId: string;
  domain: CognitiveDomain;
  phase: CognitivePhase;
  phaseAge: number;
};

let cognitiveState: CognitiveState = {
  triggerId: "idle",
  domain: "idle",
  phase: "hold",
  phaseAge: 0,
};

export function resetCognitiveState(): void {
  cognitiveState = { triggerId: "idle", domain: "idle", phase: "hold", phaseAge: 0 };
}

export class CognitiveRuntime {
  tick(ctx: HootMoodContext, frame: number): { lines: string[]; domain: CognitiveDomain; phase: CognitivePhase } {
    const emotion = resolveHootEmotion(ctx);
    const domain = emotionToDomain(emotion, ctx);
    const triggerId = emotion.triggerId;

    if (triggerId !== cognitiveState.triggerId || domain !== cognitiveState.domain) {
      cognitiveState = { triggerId, domain, phase: "perceive", phaseAge: 0 };
    } else if (cognitiveState.phase !== "hold") {
      if (cognitiveState.phaseAge >= FRAMES_PER_CASCADE_PHASE) {
        const idx = CASCADE_PHASES.indexOf(cognitiveState.phase);
        const next = idx >= 0 && idx < CASCADE_PHASES.length - 1 ? CASCADE_PHASES[idx + 1]! : "hold";
        cognitiveState = { ...cognitiveState, phase: next, phaseAge: 0 };
      } else {
        cognitiveState = { ...cognitiveState, phaseAge: cognitiveState.phaseAge + 1 };
      }
    }

    const vocab = COGNITIVE_DOMAINS[cognitiveState.domain];
    const phase = cognitiveState.phase;
    const cascade = resolveCascadeGlyphs(phase, cognitiveState.domain, vocab.flanks, frame);
    const eyeTemplate = pickCycle(vocab.perceive, Math.floor(frame / 2), "( ◕ ◕ )");
    const { left: eyeL, right: eyeR } = parseEyePair(eyeTemplate);

    const browLine = buildBrowLine(cascade.thirdEye, WIDTH, {
      left: cascade.browLeft,
      right: cascade.browRight,
    });
    const eyesLine = buildEyesLine(eyeL, eyeR);
    const beakLineStr = buildBeakLine(cascade.beak);
    const caption = fit((emotion.caption || statusCaption(emotion.mood, frame, null)).slice(0, WIDTH));

    const lines = [browLine, eyesLine, beakLineStr, caption];

    return { lines, domain: cognitiveState.domain, phase };
  }
}

const defaultCognitiveRuntime = new CognitiveRuntime();

export function renderCognitiveCompactLines(
  ctx: HootMoodContext,
  _offset: PupilOffset,
  frame: number,
  statusOverride?: string | null,
): string[] {
  const { lines } = defaultCognitiveRuntime.tick(ctx, frame);
  if (!statusOverride) return lines;
  const next = [...lines];
  next[next.length - 1] = fit(statusOverride.slice(0, WIDTH));
  return next;
}

export function minimalMoodContext(mood: HootMood, pathname = "/"): HootMoodContext {
  return {
    pathname,
    pageContext: {},
    hasError: mood === "error",
    coachOpen: mood === "talking" || mood === "thinking",
    chatLoading: mood === "thinking",
    topHintTone: mood === "alert" ? "warning" : null,
    hasTopHint: mood === "peeking" || mood === "curious",
  };
}

export function renderCompactLines(
  mood: HootMood,
  offset: PupilOffset,
  frame: number,
  statusOverride?: string | null,
  ctx?: HootMoodContext,
): string[] {
  const effectiveCtx = ctx ?? minimalMoodContext(mood);
  return renderCognitiveCompactLines(effectiveCtx, offset, frame, statusOverride);
}

function brandEyeLine(offset: PupilOffset, mood: HootMood, frame: number): string {
  const compact = eyeLine(offset, mood, frame).trim();
  const match = compact.match(/^\(\s*(.+?)\s*\)$/);
  const inner = match ? match[1]! : `${pupilChar(offset.lx)} ${pupilChar(offset.rx)}`;
  return brandFit(`  ( ${inner} )  `);
}

function brandBeakLine(mood: HootMood, frame: number): string {
  const compact = beakLine(mood, frame).trim();
  return brandFit(compact.length > 1 ? `     ${compact}     ` : "       ▽       ");
}

export function renderBrandLines(mood: HootMood, offset: PupilOffset, frame: number): string[] {
  const lines = [
    crownLine(mood, frame),
    brandEyeLine(offset, mood, frame),
    brandBeakLine(mood, frame),
    brandFit("     |___|     "),
    feetLine(frame),
    brandFit("      HOOT     "),
    brandFit(" LOCAL AI CMD  "),
  ];

  const scan = scanBarLine(mood, frame);
  if (scan) lines.splice(3, 0, scan);

  return lines;
}

export function renderOwl(
  mood: HootMood,
  offset: PupilOffset,
  frame: number,
  statusOverride?: string | null,
): string {
  return renderCompactLines(mood, offset, frame, statusOverride).join("\n");
}

export function isEyeGlowChar(ch: string): boolean {
  return EYE_GLOW_CHARS.has(ch);
}

export function eyeGlowColor(mood: HootMood): string {
  const map: Partial<Record<HootMood, string>> = {
    idle: "#7CFF7C",
    monitoring: "#7CFF7C",
    watchful: "#7CFF7C",
    logging: "#7CFF7C",
    scanning: "#60a5fa",
    syncing: "#60a5fa",
    alert: "#fb923c",
    error: "#f87171",
    celebrating: "#7CFF7C",
    proud: "#7CFF7C",
    launching: "#4ade80",
    thinking: "#a78bfa",
    building: "#f59e0b",
    installing: "#f59e0b",
    reading: "#93c5fd",
    talking: "#ffb042",
    peeking: "#fcd34d",
    curious: "#fcd34d",
  };
  return map[mood] || moodColor(mood);
}

export function asciiMotionClass(mood: HootMood): string {
  if (mood === "celebrating" || mood === "proud") return "hoot-ascii--celebrate";
  if (mood === "error") return "hoot-ascii--shake";
  if (mood === "launching") return "hoot-ascii--lift";
  if (mood === "syncing" || mood === "installing") return "hoot-ascii--pulse-fast";
  if (mood === "scanning" || mood === "monitoring" || mood === "logging" || mood === "watchful") return "hoot-ascii--pulse";
  return "hoot-ascii--idle";
}

export function moodLabel(mood: HootMood): string {
  const labels: Record<HootMood, string> = {
    idle: "watching",
    peeking: "noticed something",
    curious: "curious",
    scanning: "scanning…",
    syncing: "syncing…",
    thinking: "thinking…",
    error: "uh-oh!",
    launching: "launching…",
    celebrating: "nice!",
    proud: "solid!",
    talking: "hoot!",
    reading: "reading…",
    building: "building…",
    installing: "installing…",
    monitoring: "on watch",
    watchful: "on watch",
    alert: "heads up!",
    logging: "logging activity",
  };
  return labels[mood];
}

export function moodColor(mood: HootMood): string {
  const colors: Record<HootMood, string> = {
    idle: "#ffb042",
    peeking: "#fcd34d",
    curious: "#fcd34d",
    scanning: "#60a5fa",
    syncing: "#60a5fa",
    thinking: "#a78bfa",
    error: "#f87171",
    launching: "#4ade80",
    celebrating: "#4ade80",
    proud: "#4ade80",
    talking: "#ffb042",
    reading: "#93c5fd",
    building: "#f59e0b",
    installing: "#f59e0b",
    monitoring: "#34d399",
    watchful: "#34d399",
    alert: "#fb923c",
    logging: "#34d399",
  };
  return colors[mood];
}

export function moodFrameInterval(mood: HootMood, cognitive = false): number {
  let ms: number;
  if (mood === "idle" || mood === "peeking" || mood === "curious") ms = 800;
  else if (mood === "monitoring" || mood === "watchful" || mood === "reading" || mood === "logging") ms = 500;
  else if (mood === "syncing" || mood === "installing") ms = 280;
  else if (mood === "alert" || mood === "launching") ms = 300;
  else ms = 400;
  if (cognitive) return Math.max(100, Math.floor(ms * 0.38));
  return ms;
}

export type HootMoodContext = {
  pathname: string;
  pageContext: Record<string, unknown>;
  hasError: boolean;
  coachOpen: boolean;
  chatLoading: boolean;
  topHintTone?: string | null;
  hasTopHint: boolean;
};

export type HootEmotion = {
  mood: HootMood;
  caption: string | null;
  triggerId: string;
};

const SIGNAL_EMOTIONS: Record<string, HootEmotion> = {
  "module:syncing": { mood: "syncing", caption: "Syncing CE skills…", triggerId: "module:syncing" },
  "module:installing": { mood: "installing", caption: "Installing module…", triggerId: "module:installing" },
  "module:install-fail": { mood: "error", caption: "Install failed", triggerId: "module:install-fail" },
  "module:ready": { mood: "proud", caption: "CE pack ready", triggerId: "module:ready" },
  "launch:blocked": { mood: "alert", caption: "Launch blocked", triggerId: "launch:blocked" },
  "launch:running": { mood: "launching", caption: "Session live", triggerId: "launch:running" },
  "profile:blocked": { mood: "alert", caption: "Profile blocked", triggerId: "profile:blocked" },
  "profile:ready": { mood: "proud", caption: "Profile ready", triggerId: "profile:ready" },
  "stack:weak": { mood: "alert", caption: "Stack needs work", triggerId: "stack:weak" },
  "stack:strong": { mood: "proud", caption: "Stack solid", triggerId: "stack:strong" },
  "burn:savings": { mood: "proud", caption: "RTK saving tokens", triggerId: "burn:savings" },
  "radar:external": { mood: "alert", caption: "Agents outside HOOT", triggerId: "radar:external" },
  "hint:warning": { mood: "alert", caption: "Heads up!", triggerId: "hint:warning" },
  "hint:celebration": { mood: "celebrating", caption: "Nice!", triggerId: "hint:celebration" },
  "hint:tip": { mood: "peeking", caption: "Noticed something", triggerId: "hint:tip" },
  "modules:agents-tab": { mood: "curious", caption: "Browsing agents", triggerId: "modules:agents-tab" },
  "modules:skills-tab": { mood: "reading", caption: "Browsing skills", triggerId: "modules:skills-tab" },
};

export function activeHootSignal(pc: Record<string, unknown>): string | null {
  const signal = pc.hootSignal as string | undefined;
  const at = Number(pc.hootSignalAt) || 0;
  const ttl = Number(pc.hootSignalTtl) || 0;
  if (!signal || !at || !ttl) return null;
  if (Date.now() - at > ttl) return null;
  return signal;
}

export function resolveHootEmotion(ctx: HootMoodContext): HootEmotion {
  const pc = ctx.pageContext;
  const path = ctx.pathname;
  const signal = activeHootSignal(pc);

  if (signal && SIGNAL_EMOTIONS[signal]) return SIGNAL_EMOTIONS[signal]!;

  if (ctx.hasError) return { mood: "error", caption: "Something broke", triggerId: "error" };
  if (ctx.coachOpen && ctx.chatLoading) return { mood: "thinking", caption: "Thinking…", triggerId: "coach:thinking" };
  if (ctx.coachOpen) return { mood: "talking", caption: "Chatting", triggerId: "coach:talking" };

  if (pc.tokenBurnRisk === "high") return { mood: "alert", caption: "RTK missing!", triggerId: "burn:high" };

  if (pc.productionSessionActive || pc.grokSessionActive) {
    const tokens = Number(pc.productionEstContextTokens || pc.grokEstContextTokens) || 0;
    const agent = String(pc.productionAgentName || "Agent").split(" ")[0];
    if (tokens >= 120000) {
      return { mood: "alert", caption: `${agent} context heavy`, triggerId: "production:heavy" };
    }
    return { mood: "coding", caption: tokens ? `${agent} ~${tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : tokens} ctx` : `${agent} live`, triggerId: "production:active" };
  }

  const externalAgents = Number(pc.agentRadarExternal) || 0;
  const dockAgents = Number(pc.agentRadarDock) || 0;
  const totalAgents = Number(pc.agentRadarTotal) || 0;

  if (externalAgents > 0) {
    return { mood: "alert", caption: `${externalAgents} outside HOOT`, triggerId: "radar:external" };
  }

  if (pc.burnLoading || pc.radarLoading || pc.scanLoading || pc.scanning) {
    return { mood: "scanning", caption: "Scanning…", triggerId: "scan:active" };
  }
  if (pc.launching) return { mood: "launching", caption: "Launching…", triggerId: "launch:active" };

  if (path === "/modules") {
    if (pc.modulesTab === "agents") return { mood: "curious", caption: "Browsing agents", triggerId: "path:modules-agents" };
    if (pc.modulesTab === "skills") return { mood: "reading", caption: "Browsing skills", triggerId: "path:modules-skills" };
    if (Number(pc.modulesOutdated) > 0 || Number(pc.modulesNeedSync) > 0) {
      return { mood: "alert", caption: "Modules need sync", triggerId: "modules:stale" };
    }
    if (ceDetectionReady(pc)) return { mood: "proud", caption: "CE pack ready", triggerId: "module:ready" };
    return { mood: "reading", caption: "Module registry", triggerId: "path:/modules" };
  }

  if (path === "/builder" || path === "/stack") {
    const score = Number(pc.stackScore) || 0;
    if (score > 0 && score < 50) return { mood: "alert", caption: `Stack ${score}%`, triggerId: "stack:weak" };
    if (score >= 80) return { mood: "proud", caption: `Stack ${score}%`, triggerId: "stack:strong" };
    if (pc.launching) return { mood: "launching", caption: "Saving profile…", triggerId: "stack:launch" };
    return { mood: "building", caption: "Composing stack", triggerId: "path:builder" };
  }

  if (path === "/terminal" || path === "/launch") {
    if (Number(pc.errorCount) > 0) return { mood: "alert", caption: "Session errors", triggerId: "session:error" };
    if (Number(pc.runningCount) > 0) return { mood: "launching", caption: `${pc.runningCount} live`, triggerId: "launch:running" };
    return { mood: "watchful", caption: "Standing by", triggerId: "path:terminal" };
  }

  if (path === "/scan") {
    if (pc.tokenBurnRisk === "medium" && pc.tokenBurnSaved) {
      return { mood: "proud", caption: `RTK saved ~${pc.tokenBurnSaved}`, triggerId: "burn:savings" };
    }
    if (totalAgents > 0) return { mood: "watchful", caption: `${totalAgents} agents seen`, triggerId: "radar:total" };
    if (pc.tokenBurnRisk === "medium") return { mood: "alert", caption: "Check RTK", triggerId: "burn:medium" };
    return pc.scanLoaded ? { mood: "peeking", caption: "Posture checked", triggerId: "scan:done" } : { mood: "idle", caption: "Run readiness scan", triggerId: "scan:idle" };
  }

  if (path === "/profiles") {
    if (Number(pc.profilesBlocked) > 0) return { mood: "alert", caption: "Profiles blocked", triggerId: "profile:blocked" };
    return { mood: "reading", caption: "Picking profile", triggerId: "path:profiles" };
  }

  if (path === "/activity") {
    const n = Number(pc.activityToday) || 0;
    return { mood: "logging", caption: n > 0 ? `${n} events today` : "Activity diary", triggerId: "path:activity" };
  }

  if (path === "/" && totalAgents > 0) {
    return { mood: "watchful", caption: `${totalAgents} running · ${dockAgents} docked`, triggerId: "radar:dashboard" };
  }

  if (path === "/memory" || path === "/settings") return { mood: "reading", caption: "Reviewing config", triggerId: `path:${path}` };

  if (ctx.topHintTone === "warning") return { mood: "alert", caption: "Coach warning", triggerId: "hint:warning" };
  if (ctx.topHintTone === "celebration") return { mood: "celebrating", caption: "Win!", triggerId: "hint:celebration" };
  if (ctx.hasTopHint) return { mood: "peeking", caption: "Coach tip", triggerId: "hint:tip" };

  if (ctx.chatLoading) return { mood: "thinking", caption: "Thinking…", triggerId: "chat:loading" };
  return { mood: "idle", caption: null, triggerId: "idle" };
}

function ceDetectionReady(pc: Record<string, unknown>): boolean {
  return Boolean(pc.cePluginDetected) || Number(pc.modulesReady) > 0;
}

export function resolveHootMoodFromContext(ctx: HootMoodContext): HootMood {
  return resolveHootEmotion(ctx).mood;
}

export function hootStatusFromContext(ctx: HootMoodContext): string | null {
  const emotion = resolveHootEmotion(ctx);
  if (emotion.caption) return emotion.caption;
  return null;
}

export function formatHootError(message: string, source?: string): string {
  const short = message.split("\n")[0].slice(0, 200);
  const src = source ? ` (${source})` : "";
  return `Something went wrong${src}: ${short}. Want me to walk you through a fix?`;
}