export type HootMood =
  | "idle"
  | "peeking"
  | "scanning"
  | "thinking"
  | "error"
  | "launching"
  | "celebrating"
  | "talking"
  | "reading"
  | "building"
  | "monitoring"
  | "alert";

export type PupilOffset = { lx: number; ly: number; rx: number; ry: number };

const WIDTH = 11;
const PUPIL_CHARS = ["·", "o", "O", "●"] as const;

function fit(line: string): string {
  if (line.length === WIDTH) return line;
  if (line.length > WIDTH) return line.slice(0, WIDTH);
  const pad = WIDTH - line.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + line + " ".repeat(WIDTH - line.length - left);
}

function pupilChar(offset: number): string {
  const idx = Math.max(0, Math.min(3, Math.round((offset + 1) * 1.5)));
  return PUPIL_CHARS[idx];
}

function earLine(mood: HootMood, frame: number): string {
  const ears: Partial<Record<HootMood, string[]>> = {
    idle: ["  /\\_/\\  ", "  /\\_/\\  "],
    peeking: ["  /•_•\\  ", "  /\\_/\\  "],
    scanning: ["> scan <  ", " [~~~~]  "],
    thinking: ["  /~ ~\\  ", "  /\\_/\\  "],
    error: ["  /x x\\  ", "  /X X\\  "],
    launching: ["  />>\\  ", "  />>>\\ "],
    celebrating: ["  \\^ ^/  ", "  \\♪ ♪/  "],
    talking: ["  /◠ ◠\\  ", "  /\\_/\\  "],
    reading: ["  /‾‾‾\\  ", "  /\\_/\\  "],
    building: ["  /=#=\\  ", "  /\\+/\\  "],
    monitoring: [" |● ● ●| ", " |○ ○ ○| "],
    alert: ["  /! !\\  ", "  /!! !\\ "],
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
  };
  const variants = beaks[mood] || beaks.idle!;
  return fit(variants[frame % variants.length]!);
}

function statusCaption(mood: HootMood, frame: number, override?: string | null): string {
  if (override) return fit(override);
  const caps: Record<HootMood, string[]> = {
    idle: [" watching "],
    peeking: [" noticed  "],
    scanning: [" ~scan~  ", " .scan.  "],
    thinking: [" thinking ", "   ...   "],
    error: ["  uh-oh!  "],
    launching: [" go now>> ", "  lift..  "],
    celebrating: ["  nice!   "],
    talking: ["  hoot!   ", "  ~~~    "],
    reading: [" reading  ", "  memo..  "],
    building: [" +stack   ", " |pipe|  "],
    monitoring: [" [live]   ", " (watch) "],
    alert: [" !warn!   ", " check!  "],
  };
  const variants = caps[mood] || caps.idle;
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

export function renderOwl(
  mood: HootMood,
  offset: PupilOffset,
  frame: number,
  statusOverride?: string | null,
): string {
  return [
    earLine(mood, frame),
    eyeLine(offset, mood, frame),
    beakLine(mood, frame),
    statusCaption(mood, frame, statusOverride),
  ].join("\n");
}

export function moodLabel(mood: HootMood): string {
  const labels: Record<HootMood, string> = {
    idle: "watching",
    peeking: "noticed something",
    scanning: "scanning…",
    thinking: "thinking…",
    error: "uh-oh!",
    launching: "launching…",
    celebrating: "nice!",
    talking: "hoot!",
    reading: "reading…",
    building: "building…",
    monitoring: "on watch",
    alert: "heads up!",
  };
  return labels[mood];
}

export function moodColor(mood: HootMood): string {
  const colors: Record<HootMood, string> = {
    idle: "#ffb042",
    peeking: "#fcd34d",
    scanning: "#60a5fa",
    thinking: "#a78bfa",
    error: "#f87171",
    launching: "#4ade80",
    celebrating: "#4ade80",
    talking: "#ffb042",
    reading: "#93c5fd",
    building: "#f59e0b",
    monitoring: "#34d399",
    alert: "#fb923c",
  };
  return colors[mood];
}

export function moodFrameInterval(mood: HootMood): number {
  if (mood === "idle" || mood === "peeking") return 800;
  if (mood === "monitoring" || mood === "reading") return 500;
  if (mood === "alert" || mood === "launching") return 300;
  return 400;
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

export function resolveHootMoodFromContext(ctx: HootMoodContext): HootMood {
  if (ctx.hasError) return "error";
  if (ctx.coachOpen && ctx.chatLoading) return "thinking";
  if (ctx.coachOpen) return "talking";

  const path = ctx.pathname;
  const pc = ctx.pageContext;

  if (pc.scanning || pc.scanLoading) return "scanning";
  if (pc.launching) return "launching";

  if (pc.tokenBurnRisk === "high") return "alert";

  const externalAgents = Number(pc.agentRadarExternal) || 0;
  const dockAgents = Number(pc.agentRadarDock) || 0;
  if (externalAgents > 0) return "monitoring";
  if (dockAgents > 0 && (path === "/terminal" || path === "/launch")) return "monitoring";

  if (path === "/terminal" || path === "/launch") {
    if (Number(pc.errorCount) > 0) return "alert";
    if (Number(pc.runningCount) > 0) return "monitoring";
    return "monitoring";
  }

  if (path === "/builder" || path === "/stack") {
    if (Number(pc.stackScore) > 0 && Number(pc.stackScore) < 50) return "alert";
    return "building";
  }

  if (path === "/scan") {
    if (pc.radarLoading) return "scanning";
    if (pc.scanLoaded === false && pc.scanLoading) return "scanning";
    if (pc.burnLoading) return "scanning";
    if (Number(pc.agentRadarTotal) > 0) return "monitoring";
    if (pc.tokenBurnRisk === "medium") return "alert";
    return pc.scanLoaded ? "peeking" : "idle";
  }

  if (path === "/modules") {
    if (Number(pc.modulesOutdated) > 0 || Number(pc.modulesNeedSync) > 0) return "alert";
    return "reading";
  }

  if (path === "/memory" || path === "/profiles" || path === "/skills" || path === "/settings") return "reading";

  if (path === "/" && Number(pc.agentRadarTotal) > 0) return "monitoring";
  if (path === "/" && pc.tokenBurnRisk === "high") return "alert";

  if (ctx.topHintTone === "warning") return "alert";
  if (ctx.topHintTone === "celebration") return "celebrating";
  if (ctx.hasTopHint) return "peeking";

  if (ctx.chatLoading) return "thinking";
  return "idle";
}

export function hootStatusFromContext(ctx: HootMoodContext): string | null {
  const pc = ctx.pageContext;
  const ext = Number(pc.agentRadarExternal) || 0;
  const total = Number(pc.agentRadarTotal) || 0;
  const dock = Number(pc.agentRadarDock) || 0;
  if (pc.tokenBurnRisk === "high") return "High token burn risk — RTK missing";
  if (pc.tokenBurnRisk === "medium" && pc.tokenBurnSaved) return `RTK saved ~${pc.tokenBurnSaved}`;
  if (ext > 0) return `${ext} agent${ext === 1 ? "" : "s"} outside HOOT`;
  if (total > 0 && ctx.pathname === "/") return `${total} running · ${dock} docked`;
  if (Number(pc.runningCount) > 0) return `${pc.runningCount} session(s) live`;
  return null;
}

export function formatHootError(message: string, source?: string): string {
  const short = message.split("\n")[0].slice(0, 200);
  const src = source ? ` (${source})` : "";
  return `Something went wrong${src}: ${short}. Want me to walk you through a fix?`;
}