import { type ReactNode, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Layers3,
  PanelLeft,
  PlayCircle,
  Radar,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import HootMascot from "./hoot/HootMascot";
import HootMark from "./HootMark";
import { BRAND } from "@/lib/brand";
import HelpTooltip from "./HelpTooltip";
import ViewGuideBar from "./ViewGuideBar";
import { ToastProvider } from "./Toast";
import { getViewDoc } from "@/lib/app-docs";

const priorityRoutes = ["/", "/scan", "/profiles", "/terminal"];

const navGroups = [
  {
    title: "Command Center",
    items: [
      { label: "Overview", path: "/", icon: Radar, desc: "Mission status, priorities, and next action" },
      { label: "Readiness", path: "/scan", icon: ShieldCheck, desc: "System posture, tools, and environment health" },
      { label: "Profiles", path: "/profiles", icon: Layers3, desc: "Operational roles, audit posture, and fit" },
      { label: "Sessions", path: "/terminal", icon: TerminalSquare, desc: "Live terminals, launches, and continuity" },
      { label: "Launch Center", path: "/launch", icon: PlayCircle, desc: "Stage, validate, and launch execution" },
    ],
  },
  {
    title: "Intelligence",
    items: [{ label: "Memory", path: "/memory", icon: BookOpen, desc: "Captured evidence, notes, and outcomes" }],
  },
  {
    title: "Build + Configure",
    items: [
      { label: "Stack Builder", path: "/builder", icon: Sparkles, desc: "Compose premium operator stacks" },
      { label: "Modules", path: "/modules", icon: Wrench, desc: "Plugin packs, skills, MCP — manager · installer · loader" },
      { label: "Settings", path: "/settings", icon: SettingsIcon, desc: "Providers, policies, keys, and local state" },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const current = useMemo(() => {
    for (const group of navGroups) {
      const found = group.items.find((item) => item.path === location.pathname);
      if (found) return { ...found, group: group.title };
    }
    return { label: BRAND.name, desc: BRAND.subtitle, group: "Command Center" };
  }, [location.pathname]);

  const viewDoc = useMemo(() => getViewDoc(location.pathname), [location.pathname]);

  const focusItems = useMemo(
    () =>
      navGroups
        .flatMap((group) => group.items)
        .filter((item) => priorityRoutes.includes(item.path)),
    [],
  );

  return (
    <ToastProvider>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(255,176,66,0.08), transparent 28%), linear-gradient(180deg, #090909 0%, #0d0d0d 100%)",
          color: "#ece8e1",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <aside
          style={{
            width: collapsed ? 88 : 280,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(12,12,12,0.92) 100%)",
            backdropFilter: "blur(18px)",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            inset: "0 auto 0 0",
            zIndex: 50,
            boxShadow: "20px 0 60px rgba(0,0,0,0.28)",
            transition: "width 0.25s ease",
          }}
        >
          <div style={{ padding: collapsed ? "18px 16px" : "22px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <HootMark size={40} />
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em" }}>{BRAND.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.35 }}>
                    {BRAND.subtitle}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 14px 15px",
                  borderRadius: 18,
                  background: "linear-gradient(180deg, rgba(255,176,66,0.12) 0%, rgba(255,255,255,0.03) 100%)",
                  border: "1px solid rgba(255,176,66,0.14)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,211,154,0.8)" }}>
                  Active focus
                </div>
                <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "#fff7ed", lineHeight: 1.3 }}>
                  Keep overview, readiness, profiles, and sessions in one operating loop.
                </div>
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: "rgba(236,232,225,0.62)" }}>
                  Prioritize what is healthy, who is configured, and which sessions need action next.
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "16px 10px 20px" }}>
            {navGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: 18 }}>
                {!collapsed && (
                  <div style={{ padding: "0 10px 8px", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.38 }}>
                    {group.title}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: 16,
                          padding: collapsed ? "12px" : "12px 14px",
                          textDecoration: "none",
                          color: active ? "#fff7ed" : "rgba(236,232,225,0.78)",
                          background: active ? "linear-gradient(180deg, rgba(255,176,66,0.18), rgba(255,176,66,0.08))" : "rgba(255,255,255,0.01)",
                          border: active ? "1px solid rgba(255,176,66,0.22)" : "1px solid transparent",
                          boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 24px rgba(0,0,0,0.18)" : "none",
                        }}
                      >
                        <Icon size={18} strokeWidth={1.8} color={active ? "#ffb042" : undefined} />
                        {!collapsed && (
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{item.label}</div>
                              <span onClick={(e) => e.preventDefault()} style={{ display: "inline-flex" }}>
                                <HelpTooltip title={item.label} body={item.desc} size={11} />
                              </span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.48, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.desc}
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {!collapsed && (
              <div
                style={{
                  marginTop: 8,
                  padding: "14px",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.44, marginBottom: 10 }}>
                  Core views
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {focusItems.map((item, index) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          textDecoration: "none",
                          color: "inherit",
                          padding: "10px 0",
                          borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#fff7ed" : "#ece8e1" }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "rgba(236,232,225,0.5)", marginTop: 2 }}>{item.desc}</div>
                        </div>
                        <Compass size={15} color={active ? "#ffb042" : "rgba(236,232,225,0.38)"} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{
              padding: "14px 16px",
              border: "none",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "transparent",
              color: "#cfc8bc",
              cursor: "pointer",
              display: "flex",
              justifyContent: collapsed ? "center" : "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            {!collapsed && <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.5 }}>Dock</span>}
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </aside>

        <main
          style={{
            flex: 1,
            marginLeft: collapsed ? 88 : 280,
            transition: "margin-left 0.25s ease",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 40,
              backdropFilter: "blur(18px)",
              background: "linear-gradient(180deg, rgba(9,9,9,0.88) 0%, rgba(9,9,9,0.72) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "22px 30px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, opacity: 0.46, letterSpacing: "0.18em", textTransform: "uppercase" }}>{current.group}</div>
                <div
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,176,66,0.18)",
                    background: "rgba(255,176,66,0.08)",
                    color: "#ffd39a",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  Command shell
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-0.04em", color: "#ffffff" }}>{current.label}</div>
                  <HelpTooltip title={viewDoc.title} body={viewDoc.summary} features={viewDoc.features} size={16} />
                </div>
                <div style={{ fontSize: 14, opacity: 0.72, marginTop: 4, maxWidth: 760 }}>{current.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "stretch", gap: 12, flexWrap: "wrap" }}>
                <TopMetric
                  icon={<Radar size={16} strokeWidth={1.9} color="#ffb042" />}
                  label="Primary loop"
                  value="Overview → Readiness → Profiles → Sessions"
                />
                <TopMetric
                  icon={<PanelLeft size={16} strokeWidth={1.9} color="#86efac" />}
                  label="Operator focus"
                  value="Resolve blockers, launch with intent, stay in context"
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <StatusPill label="127.0.0.1 active" tone="green" />
              <StatusPill label="Local-first command" tone="gold" />
              <StatusPill label="Profiles + sessions in focus" tone="slate" />
            </div>
          </header>

          <div style={{ padding: "28px 30px 34px", flex: 1 }}>
            <ViewGuideBar />
            <Outlet />
          </div>
        </main>

        <HootMascot />
      </div>
    </ToastProvider>
  );
}

function TopMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 220,
        padding: "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.46 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#f5f1ea", marginTop: 5, lineHeight: 1.45 }}>{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "gold" | "slate" }) {
  const styles = {
    green: { bg: "rgba(74,222,128,0.08)", color: "#86efac", border: "rgba(74,222,128,0.18)" },
    gold: { bg: "rgba(255,176,66,0.08)", color: "#ffd39a", border: "rgba(255,176,66,0.18)" },
    slate: { bg: "rgba(255,255,255,0.05)", color: "#ddd6cb", border: "rgba(255,255,255,0.08)" },
  }[tone];

  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}
