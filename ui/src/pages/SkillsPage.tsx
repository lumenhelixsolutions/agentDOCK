import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Wrench, Search, X, Loader2, AlertCircle, BookOpen } from "lucide-react";

const categoryColors: Record<string, string> = {
  strategy: "#60a5fa",
  ideation: "#f472b6",
  planning: "#a78bfa",
  execution: "#4ade80",
  review: "#f59e0b",
  analysis: "#ef4444",
  product: "#2dd4bf",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [skillContent, setSkillContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    api.getSkills()
      .then((data) => {
        setSkills(data.skills || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of skills) {
      if (s.category) set.add(s.category);
    }
    return ["all", ...Array.from(set).sort()];
  }, [skills]);

  const filtered = useMemo(() => {
    let list = skills;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((s) => s.category === categoryFilter);
    }
    return list;
  }, [skills, search, categoryFilter]);

  const handleSelect = async (skill: any) => {
    setSelectedSkill(skill);
    setSkillContent(null);
    if (skill.cached) {
      setContentLoading(true);
      try {
        const data = await api.getSkillContent(skill.id);
        setSkillContent(data.content);
      } catch (e) {
        setSkillContent(`Failed to load content: ${e}`);
      } finally {
        setContentLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", opacity: 0.5 }}>
        <Loader2 size={32} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
        <p>Loading skills catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
        <p style={{ color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Wrench size={24} color="#ffb042" />
        <h1 style={{ fontSize: 20, fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
          Compound Engineering Skills
        </h1>
        <span style={{ fontSize: 12, opacity: 0.4, marginLeft: "auto" }}>
          {skills.length} skills ({skills.filter((s) => s.cached).length} cached)
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
          <Search size={14} opacity={0.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#f5f5f5",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: categoryFilter === cat ? "rgba(255,255,255,0.08)" : "transparent",
                color: categoryFilter === cat ? "#ffffff" : "#dadada",
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {filtered.map((skill) => {
          const color = categoryColors[skill.category] || "#6b7280";
          return (
            <div
              key={skill.id}
              onClick={() => handleSelect(skill)}
              style={{
                padding: 18,
                borderRadius: 12,
                background: selectedSkill?.id === skill.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${selectedSkill?.id === skill.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  selectedSkill?.id === skill.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, margin: 0, fontWeight: 500, color: "#f5f5f5" }}>{skill.name}</h3>
                <span
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color,
                    background: `${color}15`,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {skill.category}
                </span>
              </div>
              <p style={{ fontSize: 12, opacity: 0.6, margin: 0, lineHeight: 1.5, marginBottom: 10 }}>
                {skill.description}
              </p>
              <div style={{ display: "flex", gap: 8, fontSize: 11, opacity: 0.4, fontFamily: "'GeistMono', monospace" }}>
                <span>{skill.cached ? "Cached" : "On-demand"}</span>
                <span>{skill.compatible_frontends?.join(", ") || ""}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", opacity: 0.5 }}>
          <BookOpen size={32} style={{ marginBottom: 12 }} />
          <p>No skills match your filters.</p>
        </div>
      )}

      {selectedSkill && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 480,
            background: "#0d0d0d",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            padding: 24,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 400, margin: 0 }}>{selectedSkill.name}</h2>
            <button
              onClick={() => setSelectedSkill(null)}
              style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>

          {selectedSkill.cached ? (
            contentLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <pre
                style={{
                  flex: 1,
                  overflow: "auto",
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#dadada",
                  fontFamily: "'GeistMono', monospace",
                  background: "rgba(255,255,255,0.02)",
                  padding: 16,
                  borderRadius: 8,
                  margin: 0,
                }}
              >
                {skillContent}
              </pre>
            )
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, textAlign: "center" }}>
              <div>
                <BookOpen size={32} style={{ marginBottom: 12 }} />
                <p>This skill is available on-demand.</p>
                <p style={{ fontSize: 11 }}>Run `node scripts/sync-ce-skills.js` to cache it locally.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
