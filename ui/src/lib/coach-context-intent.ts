/** Client-side mirror of server live-context triggers (repo/memory/git questions). */

export function wantsLiveCoachContext(text: string): boolean {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return false;
  return /\b(git status|git health|uncommitted|repo state|read memory|memory file|what(?:'s| is) in memory|handoff packet|full context|refresh context|read(?: the)? repo|agents\.md|project brain|filesystem context|live context)\b/.test(t);
}