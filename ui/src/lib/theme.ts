/** Central theme state: `.light` class on <html>, persisted, event-synced. */
const STORAGE_KEY = "hoot-theme";
const EVENT = "hoot-theme-change";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function onThemeChange(cb: (t: Theme) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
