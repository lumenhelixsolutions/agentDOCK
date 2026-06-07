import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Scan,
  Layers,
  Brain,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "System Scan", path: "/scan", icon: Scan },
  { label: "Profiles", path: "/profiles", icon: Layers },
  { label: "Memory", path: "/memory", icon: Brain },
  { label: "Terminal", path: "/terminal", icon: Terminal },
];

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#dadada",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 200,
      }}
    >
      <aside
        style={{
          width: collapsed ? 64 : 220,
          flexShrink: 0,
          background: "#0d0d0d",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: 64,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #c8966a, #e8a050)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#0a0a0a", fontSize: 16, fontWeight: 700 }}>A</span>
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: "'GeistMono', monospace",
                fontSize: 16,
                fontWeight: 400,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                whiteSpace: "nowrap",
              }}
            >
              AgentDock
            </span>
          )}
        </div>

        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: isActive ? "#ffb042" : "#dadada",
                  background: isActive ? "rgba(255, 176, 66, 0.08)" : "transparent",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: 300,
                  letterSpacing: "0.02em",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#dadada";
                  }
                }}
              >
                <Icon size={18} strokeWidth={1.5} />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "#dadada",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main
        style={{
          flex: 1,
          marginLeft: collapsed ? 64 : 220,
          transition: "margin-left 0.3s ease",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            height: 64,
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "3px", textTransform: "uppercase", color: "#dadada", opacity: 0.5 }}>
            {navItems.find((n) => n.path === location.pathname)?.label ?? "AgentDock"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StatusDot label="127.0.0.1" color="#4ade80" />
            <StatusDot label="Local" color="#ffb042" />
          </div>
        </header>

        <div style={{ padding: "32px", flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function StatusDot({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}60`,
        }}
      />
      <span style={{ fontSize: 11, letterSpacing: "0.05em", color: "#dadada", opacity: 0.6 }}>{label}</span>
    </div>
  );
}
