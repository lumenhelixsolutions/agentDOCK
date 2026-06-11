/** User-facing HOOT brand constants (technical slug stays `agentdock`). */
export const BRAND = {
  name: "HOOT",
  subtitle: "Local AI Command Center",
  title: "HOOT · Local AI Command Center",
  mascotTagline: "My Ops OWL",
  dockLabel: "HOOT docked",
  externalLabel: "outside HOOT",
  legacyName: "AgentDock",
} as const;

/**
 * Brand colors resolve through the theme token layer (ui/src/index.css),
 * so they adapt to dark/light. Hex fallbacks preserve the dark-theme values.
 */
export const BRAND_COLORS = {
  gold: "var(--hoot-gold, #ffb042)",
  goldLight: "var(--hoot-gold-light, #f5c878)",
  goldMid: "var(--hoot-gold-mid, #e8a050)",
  goldDark: "var(--hoot-gold-dark, #c8872e)",
  ink: "var(--hoot-ink, #0a0a0a)",
  face: "var(--hoot-face, #12100e)",
  glow: "var(--hoot-glow, rgba(255,176,66,0.28))",
} as const;
