import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Camera, ClipboardCopy, Maximize2, MessageCircle, Pause, Play, Repeat } from "lucide-react";

export interface HootMenuState {
  x: number;
  y: number;
}

interface Props {
  menu: HootMenuState;
  paused: boolean;
  variant: "compact" | "grand";
  onClose: () => void;
  onTogglePause: () => void;
  onToggleVariant: () => void;
  onCopySnapshot: () => void;
  onCopyStatus: () => void;
}

/** Premium right-click menu for the HOOT face. Rendered via portal. */
export default function HootContextMenu({
  menu,
  paused,
  variant,
  onClose,
  onTogglePause,
  onToggleVariant,
  onCopySnapshot,
  onCopyStatus,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const fire = (action: () => void) => () => {
    action();
    onClose();
  };

  const items: Array<{ icon: typeof Pause; label: string; hint?: string; action: () => void }> = [
    { icon: paused ? Play : Pause, label: paused ? "Resume face" : "Pause face", action: onTogglePause },
    {
      icon: Repeat,
      label: variant === "grand" ? "Compact face" : "Grand face",
      hint: "switch silhouette",
      action: onToggleVariant,
    },
    {
      icon: MessageCircle,
      label: "Talk to HOOT",
      hint: "open coach",
      action: () => window.dispatchEvent(new CustomEvent("hoot:open-coach")),
    },
    {
      icon: Maximize2,
      label: "Cooldown popout",
      action: () => window.dispatchEvent(new CustomEvent("hoot:open-popout")),
    },
    { icon: Camera, label: "Copy face snapshot", hint: "ASCII frame", action: onCopySnapshot },
    { icon: ClipboardCopy, label: "Copy status report", action: onCopyStatus },
  ];

  const left = Math.min(menu.x, window.innerWidth - 230);
  const top = Math.min(menu.y, window.innerHeight - items.length * 38 - 56);

  return createPortal(
    <div
      ref={ref}
      className="hoot-menu"
      role="menu"
      aria-label="HOOT options"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="hoot-menu-head">HOOT · ops owl</div>
      {items.map(({ icon: Icon, label, hint, action }) => (
        <button key={label} role="menuitem" className="hoot-menu-item" onClick={fire(action)}>
          <Icon size={14} />
          <span className="hoot-menu-label">{label}</span>
          {hint && <span className="hoot-menu-hint">{hint}</span>}
        </button>
      ))}
    </div>,
    document.body,
  );
}