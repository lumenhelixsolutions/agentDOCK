import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Cpu,
  Brain,
  Wrench,
  Terminal,
  FileOutput,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Play,
  Save,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface StackNode {
  id: string;
  type: "llm" | "tool" | "agent" | "processor" | "output";
  label: string;
  config: Record<string, any>;
}

const NODE_TYPES = [
  { type: "llm", label: "LLM", icon: Brain, color: "#4ade80" },
  { type: "tool", label: "Tool", icon: Wrench, color: "#60a5fa" },
  { type: "agent", label: "Agent", icon: Terminal, color: "#f59e0b" },
  { type: "processor", label: "Processor", icon: Cpu, color: "#a78bfa" },
  { type: "output", label: "Output", icon: FileOutput, color: "#f472b6" },
];

const LLM_OPTIONS = [
  { id: "llama3.1:8b", name: "Llama 3.1 8B", context: 8192, backend: "ollama", mode: "local" },
  { id: "llama3.1:8b-instruct-q8_0", name: "Llama 3.1 8B Q8_0", context: 64000, backend: "ollama", mode: "local" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", context: 200000, backend: "anthropic", mode: "cloud" },
  { id: "gpt-4o", name: "GPT-4o", context: 128000, backend: "openai", mode: "cloud" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1000000, backend: "google", mode: "cloud" },
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B", context: 32768, backend: "ollama", mode: "local" },
];

const AGENT_OPTIONS = [
  { id: "hermes", name: "Hermes Agent" },
  { id: "opencode", name: "OpenCode" },
  { id: "codex", name: "Codex CLI" },
  { id: "claude-code", name: "Claude Code" },
  { id: "kimi", name: "Kimi CLI" },
  { id: "aider", name: "Aider" },
  { id: "gemini-cli", name: "Gemini CLI" },
];

export default function StackBuilder() {
  const [nodes, setNodes] = useState<StackNode[]>([]);
  const [scan, setScan] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.runScan().then((s) => setScan(s)).catch(() => {});
  }, []);

  const analyze = useCallback(() => {
    if (!scan) return;
    const newIssues: string[] = [];
    let newScore = 100;

    for (const node of nodes) {
      if (node.type === "llm") {
        const llm = LLM_OPTIONS.find((l) => l.id === node.config.model);
        if (!llm) continue;
        if (llm.mode === "local") {
          const ollama = scan.tools?.ollama;
          if (!ollama?.present) {
            newIssues.push(`Ollama not installed — required for ${llm.name}`);
            newScore -= 30;
          } else {
            const loaded = scan.ollama?.loaded_models || [];
            const isLoaded = loaded.some((m: any) => m.name === llm.id || m.name === `${llm.id}:latest`);
            if (!isLoaded) {
              newIssues.push(`${llm.name} is not loaded. Run: ollama pull ${llm.id}`);
              newScore -= 15;
            }
          }
          const vramGB = ((scan.hardware?.gpu?.[0]?.memory_total_mb || 0) / 1024);
          if (llm.context >= 64000 && vramGB < 8) {
            newIssues.push(`${llm.name} needs 8GB+ VRAM. You have ${vramGB.toFixed(1)}GB. Use q8_0 quantization.`);
            newScore -= 20;
          }
        }
        if (llm.mode === "cloud") {
          const envKey = `${llm.backend.toUpperCase()}_API_KEY`;
          const env = scan.env?.[envKey];
          if (!env?.present) {
            newIssues.push(`Missing ${envKey} — required for ${llm.name}`);
            newScore -= 25;
          }
        }
      }
      if (node.type === "agent") {
        const agent = AGENT_OPTIONS.find((a) => a.id === node.config.agent);
        if (!agent) continue;
        const coder = (scan.coders || []).find((c: any) => c.id === node.config.agent);
        if (!coder?.detection?.present) {
          newIssues.push(`${agent.name} not detected on PATH`);
          newScore -= 20;
        }
      }
    }

    if (nodes.length === 0) {
      newIssues.push("Stack is empty — add at least one node");
      newScore = 0;
    }
    if (!nodes.some((n) => n.type === "llm")) {
      newIssues.push("No LLM selected — every stack needs a model");
      newScore -= 20;
    }
    if (!nodes.some((n) => n.type === "agent")) {
      newIssues.push("No agent selected — add an agent frontend");
      newScore -= 10;
    }

    setIssues(newIssues);
    setScore(Math.max(0, newScore));
  }, [nodes, scan]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  const addNode = (type: string) => {
    const def = NODE_TYPES.find((n) => n.type === type);
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const config: any = {};
    if (type === "llm") config.model = LLM_OPTIONS[0].id;
    if (type === "agent") config.agent = AGENT_OPTIONS[0].id;
    if (type === "tool") config.command = "";
    setNodes((prev) => [...prev, { id, type: type as any, label: def.label, config }]);
    setSelected(id);
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selected === id) setSelected(null);
  };

  const updateNode = (id: string, patch: Partial<StackNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const selectedNode = nodes.find((n) => n.id === selected);

  const getScoreColor = () => {
    if (score >= 80) return "#4ade80";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 128px)", gap: 16 }}>
      {/* Left Palette */}
      <div
        style={{
          width: collapsed ? 48 : 200,
          flexShrink: 0,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 12,
          padding: collapsed ? "12px 8px" : 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          transition: "width 0.3s",
        }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer", alignSelf: "flex-end", marginBottom: 8 }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {!collapsed && <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, margin: "0 0 8px" }}>Palette</h3>}
        {NODE_TYPES.map((nt) => {
          const Icon = nt.icon;
          return (
            <button
              key={nt.type}
              onClick={() => addNode(nt.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px" : "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                color: "#dadada",
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.2s",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = nt.color; e.currentTarget.style.background = `${nt.color}10`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <Icon size={16} color={nt.color} />
              {!collapsed && nt.label}
            </button>
          );
        })}
      </div>

      {/* Center Canvas */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Stack Builder</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setNodes([]); setSelected(null); }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={14} /> Clear
            </button>
            <button
              onClick={() => alert("Save stacks coming in Phase 3")}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,176,66,0.3)", background: "rgba(255,176,66,0.1)", color: "#ffb042", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        <div style={{ flex: 1, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, overflow: "auto" }}>
          {nodes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4, gap: 12 }}>
              <Plus size={32} />
              <span style={{ fontSize: 13 }}>Click a node type from the palette to start building</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {nodes.map((node, idx) => {
                const def = NODE_TYPES.find((n) => n.type === node.type);
                const Icon = def?.icon || Plus;
                const isSelected = selected === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelected(node.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? def?.color || "#ffb042" : "rgba(255,255,255,0.06)"}`,
                      background: isSelected ? `${def?.color}08` : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${def?.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={def?.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#f5f5f5", fontWeight: 500 }}>
                        {idx + 1}. {node.label}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, fontFamily: "'GeistMono', monospace" }}>
                        {node.type === "llm" && (LLM_OPTIONS.find((l) => l.id === node.config.model)?.name || node.config.model)}
                        {node.type === "agent" && (AGENT_OPTIONS.find((a) => a.id === node.config.agent)?.name || node.config.agent)}
                        {node.type === "tool" && (node.config.command || "No command")}
                        {node.type === "processor" && (node.config.type || "Processor")}
                        {node.type === "output" && (node.config.format || "Text")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Health Score */}
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5 }}>Health Score</span>
            <span style={{ fontSize: 24, fontFamily: "'GeistMono', monospace", fontWeight: 300, color: getScoreColor() }}>{score}</span>
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            <div style={{ width: `${score}%`, height: "100%", background: getScoreColor(), transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Issues */}
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {issues.length === 0 ? <CheckCircle2 size={14} color="#4ade80" /> : <AlertTriangle size={14} color="#f59e0b" />}
            <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5 }}>
              {issues.length === 0 ? "No Issues" : `${issues.length} Issue${issues.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ padding: 10, borderRadius: 6, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", fontSize: 12, color: "#f5f5f5", lineHeight: 1.5 }}>
                {issue}
              </div>
            ))}
            {issues.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.5, textAlign: "center", padding: 20 }}>
                This stack looks good. Ready to launch.
              </div>
            )}
          </div>
        </div>

        {/* Config Editor */}
        {selectedNode && (
          <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <h3 style={{ fontSize: 13, margin: "0 0 12px", color: "#f5f5f5" }}>Config: {selectedNode.label}</h3>
            {selectedNode.type === "llm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Model</label>
                <select
                  value={selectedNode.config.model}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, model: e.target.value } })}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 12 }}
                >
                  {LLM_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.context.toLocaleString()} ctx)</option>
                  ))}
                </select>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Temperature</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={selectedNode.config.temperature ?? 0.3}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, temperature: parseFloat(e.target.value) } })}
                />
                <span style={{ fontSize: 11, opacity: 0.5 }}>{selectedNode.config.temperature ?? 0.3}</span>
              </div>
            )}
            {selectedNode.type === "agent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Agent</label>
                <select
                  value={selectedNode.config.agent}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, agent: e.target.value } })}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 12 }}
                >
                  {AGENT_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedNode.type === "tool" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Command</label>
                <input
                  value={selectedNode.config.command}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, command: e.target.value } })}
                  placeholder="e.g. git diff"
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 12, fontFamily: "'GeistMono', monospace" }}
                />
              </div>
            )}
            {selectedNode.type === "processor" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Type</label>
                <select
                  value={selectedNode.config.type || "filter"}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, type: e.target.value } })}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 12 }}
                >
                  <option value="filter">Filter</option>
                  <option value="transform">Transform</option>
                  <option value="validate">Validate</option>
                </select>
              </div>
            )}
            {selectedNode.type === "output" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 11, opacity: 0.5 }}>Format</label>
                <select
                  value={selectedNode.config.format || "text"}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, format: e.target.value } })}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 12 }}
                >
                  <option value="text">Text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="diff">Diff</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Launch */}
        <button
          onClick={() => alert("Launch from Stack Builder coming in Phase 3")}
          disabled={score < 50}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            border: "1px solid rgba(74,222,128,0.3)",
            background: score >= 50 ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.03)",
            color: score >= 50 ? "#4ade80" : "#6b7280",
            cursor: score >= 50 ? "pointer" : "not-allowed",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Play size={14} /> Launch Stack
        </button>
      </div>
    </div>
  );
}
