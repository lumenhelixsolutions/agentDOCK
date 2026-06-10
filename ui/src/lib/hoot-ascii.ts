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

const WIDTH = 11;
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

export function renderCompactLines(
  mood: HootMood,
  offset: PupilOffset,
  frame: number,
  statusOverride?: string | null,
): string[] {
  return [
    earLine(mood, frame),
    eyeLine(offset, mood, frame),
    beakLine(mood, frame),
    statusCaption(mood, frame, statusOverride),
  ];
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

export function moodFrameInterval(mood: HootMood): number {
  if (mood === "idle" || mood === "peeking" || mood === "curious") return 800;
  if (mood === "monitoring" || mood === "watchful" || mood === "reading" || mood === "logging") return 500;
  if (mood === "syncing" || mood === "installing") return 280;
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