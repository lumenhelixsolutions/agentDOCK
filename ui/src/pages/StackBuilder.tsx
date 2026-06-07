import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  Cpu, Brain, Wrench, Terminal, FileOutput, AlertTriangle, CheckCircle2,
  Plus, Trash2, Play, Save, ChevronRight, ChevronDown, BookOpen,
  Download, ExternalLink, Copy, Search, RefreshCw, Sparkles,
  Server, Box, GitBranch, Gauge, Package, Shield, Zap,
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
  { id: "hermes", name: "Hermes Agent", install: "npm install -g @nousresearch/hermes-agent" },
  { id: "opencode", name: "OpenCode", install: "npm install -g opencode" },
  { id: "codex", name: "Codex CLI", install: "npm install -g @openai/codex" },
  { id: "claude-code", name: "Claude Code", install: "npm install -g @anthropic-ai/claude-code" },
  { id: "kimi", name: "Kimi CLI", install: "npm install -g kimi-code" },
  { id: "aider", name: "Aider", install: "pip install aider-chat" },
  { id: "gemini-cli", name: "Gemini CLI", install: "npm install -g @google/gemini-cli" },
];

const RESEARCH_CATEGORIES = [
  { id: "mcp", label: "MCP Servers", icon: Server, color: "#4ade80" },
  { id: "agents", label: "Agent Software", icon: Brain, color: "#60a5fa" },
  { id: "models", label: "AI Model Mgmt", icon: Box, color: "#f59e0b" },
  { id: "compression", label: "Compression", icon: Gauge, color: "#a78bfa" },
  { id: "prompts", label: "Prompt Tools", icon: Sparkles, color: "#f472b6" },
  { id: "git", label: "Git Tools", icon: GitBranch, color: "#fb923c" },
];

export default function StackBuilder() {
  const [nodes, setNodes] = useState<StackNode[]>([]);
  const [scan, setScan] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [research, setResearch] = useState<any>(null);
  const [mcp, setMcp] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<"builder" | "research" | "install">("builder");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.runScan().catch(() => null),
      api.getCatalog().catch(() => null),
      api.getResearch().catch(() => null),
      api.getMcp().catch(() => null),
    ]).then(([s, c, r, m]) => {
      setScan(s);
      setCatalog(c);
      setResearch(r);
      setMcp(m);
    });
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
          if (!ollama?.present) { newIssues.push(`Ollama not installed — required for ${llm.name}`); newScore -= 30; }
          else {
            const loaded = scan.ollama?.loaded_models || [];
            const isLoaded = loaded.some((m: any) => m.name === llm.id || m.name === `${llm.id}:latest`);
            if (!isLoaded) { newIssues.push(`${llm.name} is not loaded. Run: ollama pull ${llm.id}`); newScore -= 15; }
          }
          const vramGB = ((scan.hardware?.gpu?.[0]?.memory_total_mb || 0) / 1024);
          if (llm.context >= 64000 && vramGB < 8) { newIssues.push(`${llm.name} needs 8GB+ VRAM. You have ${vramGB.toFixed(1)}GB.`); newScore -= 20; }
        }
        if (llm.mode === "cloud") {
          const envKey = `${llm.backend.toUpperCase()}_API_KEY`;
          const env = scan.env?.[envKey];
          if (!env?.present) { newIssues.push(`Missing ${envKey} — required for ${llm.name}`); newScore -= 25; }
        }
      }
      if (node.type === "agent") {
        const agent = AGENT_OPTIONS.find((a) => a.id === node.config.agent);
        if (!agent) continue;
        const coder = (scan.coders || []).find((c: any) => c.id === node.config.agent);
        if (!coder?.detection?.present) { newIssues.push(`${agent.name} not detected. Install: ${agent.install}`); newScore -= 20; }
      }
    }

    if (nodes.length === 0) { newIssues.push("Stack is empty — add at least one node"); newScore = 0; }
    if (!nodes.some((n) => n.type === "llm")) { newIssues.push("No LLM selected — every stack needs a model"); newScore -= 20; }
    if (!nodes.some((n) => n.type === "agent")) { newIssues.push("No agent selected — add an agent frontend"); newScore -= 10; }

    setIssues(newIssues);
    setScore(Math.max(0, newScore));
  }, [nodes, scan]);

  useEffect(() => { analyze(); }, [analyze]);

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

  const removeNode = (id: string) => { setNodes((prev) => prev.filter((n) => n.id !== id)); if (selected === id) setSelected(null); };
  const updateNode = (id: string, patch: Partial<StackNode>) => { setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n))); };
  const selectedNode = nodes.find((n) => n.id === selected);
  const getScoreColor = () => score >= 80 ? "#4ade80" : score >= 50 ? "#f59e0b" : "#ef4444";

  const missingTools = useMemo(() => {
    if (!scan || !catalog) return [];
    return (catalog.tools || []).filter((t: any) => {
      const coder = (scan.coders || []).find((c: any) => c.id === t.id || c.command === t.command);
      return !coder?.detection?.present;
    });
  }, [scan, catalog]);

  const mcpConfigs = useMemo(() => (mcp?.configs || []), [mcp]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  };

  const launchStack = async () => {
    if (score < 50 || nodes.length === 0) return;
    setLaunching(true);
    try {
      const llmNode = nodes.find((n) => n.type === "llm");
      const agentNode = nodes.find((n) => n.type === "agent");
      const llm = llmNode ? LLM_OPTIONS.find((l) => l.id === llmNode.config.model) : null;
      const agent = agentNode ? AGENT_OPTIONS.find((a) => a.id === agentNode.config.agent) : null;
      const mode = llm?.mode || "hybrid";
      const name = `stack-${mode}-${agent?.id || "custom"}-${Date.now()}`;
      const profileId = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60);
      const launchCmd = agent
        ? `${agent.id} ${mode === "local" ? "--local" : ""}`
        : `echo "Custom stack: ${profileId}"`;
      const meta: any = {
        name: `Custom ${mode} stack`,
        mode,
        status: "experimental",
        command: agent?.id || "",
        backend: llm?.backend || "",
        model: llm?.id || "",
        required_context: llm?.context || 0,
      };
      if (llm?.mode === "cloud") {
        const envKey = `${llm.backend.toUpperCase()}_API_KEY`;
        meta.required_env = [envKey];
      }
      await api.createProfile({ id: profileId, meta, description: `Auto-generated stack profile. LLM: ${llm?.name || "none"}, Agent: ${agent?.name || "none"}`, launch: launchCmd });
      toast.showToast(`Profile "${profileId}" created. Launching...`, "success");
      const result = await api.launch(profileId);
      if (result.launched) {
        toast.showToast(`Stack launched! Session: ${result.session?.id?.slice(0, 8)}`, "success");
        window.location.href = "/terminal";
      } else if (result.blocked) {
        toast.showToast(`Launch blocked: ${result.message}`, "warning");
      } else {
        toast.showToast("Launch completed.", "info");
      }
    } catch (e: any) {
      toast.showToast(e.message || "Launch failed", "error");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Stack Builder</h2>
          <p style={{ fontSize: 12, opacity: 0.5, margin: "4px 0 0" }}>Visual pipeline designer with real-time system analysis</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["builder", "research", "install"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: tab === t ? "rgba(255,176,66,0.4)" : "rgba(255,255,255,0.08)",
                background: tab === t ? "rgba(255,176,66,0.1)" : "rgba(255,255,255,0.02)",
                color: tab === t ? "#ffb042" : "#dadada",
                cursor: "pointer",
                fontSize: 12,
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Builder Tab */}
      {tab === "builder" && (
        <div style={{ display: "flex", height: "calc(100vh - 220px)", gap: 16 }}>
          {/* Palette */}
          <div style={{ width: collapsed ? 48 : 200, flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: collapsed ? "12px 8px" : 16, display: "flex", flexDirection: "column", gap: 8, transition: "width 0.3s" }}>
            <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer", alignSelf: "flex-end", marginBottom: 8 }}>
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, margin: "0 0 8px" }}>Palette</h3>}
            {NODE_TYPES.map((nt) => {
              const Icon = nt.icon;
              return (
                <button key={nt.type} onClick={() => addNode(nt.type)} style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "10px" : "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#dadada", cursor: "pointer", fontSize: 12, transition: "all 0.2s", justifyContent: collapsed ? "center" : "flex-start" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = nt.color; e.currentTarget.style.background = `${nt.color}10`; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                  <Icon size={16} color={nt.color} />
                  {!collapsed && nt.label}
                </button>
              );
            })}
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setNodes([]); setSelected(null); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={12} /> Clear
              </button>
              <button onClick={() => alert("Save stacks coming in Phase 3")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,176,66,0.3)", background: "rgba(255,176,66,0.1)", color: "#ffb042", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Save size={12} /> Save
              </button>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, overflow: "auto" }}>
              {nodes.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4, gap: 12 }}>
                  <Plus size={32} />
                  <span style={{ fontSize: 13 }}>Click a node type to start building</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {nodes.map((node, idx) => {
                    const def = NODE_TYPES.find((n) => n.type === node.type);
                    const Icon = def?.icon || Plus;
                    const isSelected = selected === node.id;
                    return (
                      <div key={node.id} onClick={() => setSelected(node.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 10, border: `1px solid ${isSelected ? def?.color || "#ffb042" : "rgba(255,255,255,0.06)"}`, background: isSelected ? `${def?.color}08` : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${def?.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={16} color={def?.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#f5f5f5", fontWeight: 500 }}>{idx + 1}. {node.label}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, fontFamily: "'GeistMono', monospace" }}>
                            {node.type === "llm" && (LLM_OPTIONS.find((l) => l.id === node.config.model)?.name || node.config.model)}
                            {node.type === "agent" && (AGENT_OPTIONS.find((a) => a.id === node.config.agent)?.name || node.config.agent)}
                            {node.type === "tool" && (node.config.command || "No command")}
                            {node.type === "processor" && (node.config.type || "Processor")}
                            {node.type === "output" && (node.config.format || "Text")}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6 }}>
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
          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5 }}>Health Score</span>
                <span style={{ fontSize: 24, fontFamily: "'GeistMono', monospace", fontWeight: 300, color: getScoreColor() }}>{score}</span>
              </div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                <div style={{ width: `${score}%`, height: "100%", background: getScoreColor(), transition: "width 0.3s" }} />
              </div>
            </div>

            <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", flex: 1, overflow: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {issues.length === 0 ? <CheckCircle2 size={14} color="#4ade80" /> : <AlertTriangle size={14} color="#f59e0b" />}
                <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5 }}>{issues.length === 0 ? "No Issues" : `${issues.length} Issue${issues.length > 1 ? "s" : ""}`}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {issues.map((issue, i) => (
                  <div key={i} style={{ padding: 10, borderRadius: 6, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)", fontSize: 12, color: "#f5f5f5", lineHeight: 1.5 }}>{issue}</div>
                ))}
                {issues.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, textAlign: "center", padding: 20 }}>This stack looks good. Ready to launch.</div>}
              </div>
            </div>

            {selectedNode && (
              <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <h3 style={{ fontSize: 13, margin: "0 0 10px", color: "#f5f5f5" }}>Config: {selectedNode.label}</h3>
                {selectedNode.type === "llm" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.5 }}>Model</label>
                    <select value={selectedNode.config.model} onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, model: e.target.value } })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#f5f5f5", fontSize: 12 }}>
                      {LLM_OPTIONS.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.context.toLocaleString()} ctx)</option>)}
                    </select>
                    <label style={{ fontSize: 11, opacity: 0.5 }}>Temperature: {selectedNode.config.temperature ?? 0.3}</label>
                    <input type="range" min={0} max={1} step={0.1} value={selectedNode.config.temperature ?? 0.3} onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, temperature: parseFloat(e.target.value) } })} style={{ accentColor: "#ffb042" }} />
                  </div>
                )}
                {selectedNode.type === "agent" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.5 }}>Agent</label>
                    <select value={selectedNode.config.agent} onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, agent: e.target.value } })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#f5f5f5", fontSize: 12 }}>
                      {AGENT_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <p style={{ fontSize: 10, opacity: 0.4, margin: "4px 0 0" }}>Not installed? Check the Install tab.</p>
                  </div>
                )}
                {selectedNode.type === "tool" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.5 }}>Command</label>
                    <input value={selectedNode.config.command} onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, command: e.target.value } })} placeholder="e.g. git diff" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#f5f5f5", fontSize: 12, fontFamily: "'GeistMono', monospace" }} />
                  </div>
                )}
              </div>
            )}

            <button onClick={launchStack} disabled={score < 50 || launching} style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.3)", background: score >= 50 && !launching ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.03)", color: score >= 50 && !launching ? "#4ade80" : "#6b7280", cursor: score >= 50 && !launching ? "pointer" : "not-allowed", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Play size={14} /> {launching ? "Launching..." : "Launch Stack"}
            </button>
          </div>
        </div>
      )}

      {/* Research Tab */}
      {tab === "research" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {RESEARCH_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", minWidth: 160, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={20} color={cat.color} />
                  <span style={{ fontSize: 13, color: "#f5f5f5" }}>{cat.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Latest Research Brief</h3>
              <button onClick={() => api.runResearch().then((r) => setResearch(r)).catch(() => {})} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,176,66,0.3)", background: "rgba(255,176,66,0.1)", color: "#ffb042", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {research?.text ? (
              <pre style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.8, whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif", margin: 0, maxHeight: 400, overflow: "auto", padding: 12, background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                {research.text}
              </pre>
            ) : (
              <div style={{ opacity: 0.4, fontSize: 12, padding: 20, textAlign: "center" }}>No research brief yet. Click Refresh to generate.</div>
            )}
          </div>

          <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <h3 style={{ fontSize: 14, margin: "0 0 12px", color: "#f5f5f5" }}>MCP Server Configs Detected</h3>
            {mcpConfigs.length === 0 ? (
              <div style={{ opacity: 0.4, fontSize: 12 }}>No MCP configs found. Check Claude Desktop, Cursor, or Cline configs.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mcpConfigs.map((cfg: any, i: number) => (
                  <div key={i} style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 13, color: "#f5f5f5" }}>{cfg.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, fontFamily: "'GeistMono', monospace" }}>{cfg.path}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {cfg.servers?.map((s: string) => (
                        <span key={s} style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 10 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Install Tab */}
      {tab === "install" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Search size={14} opacity={0.5} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools, agents, models..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontSize: 13 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {/* Missing Tools */}
            {missingTools.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())).map((tool: any) => (
              <InstallCard key={tool.id} tool={tool} scan={scan} onCopy={copyText} copied={copied} />
            ))}

            {/* Installed Tools */}
            {(catalog?.tools || []).filter((t: any) => {
              const coder = (scan?.coders || []).find((c: any) => c.id === t.id || c.command === t.command);
              return coder?.detection?.present && (!search || t.name.toLowerCase().includes(search.toLowerCase()));
            }).map((tool: any) => (
              <InstallCard key={tool.id} tool={tool} scan={scan} onCopy={copyText} copied={copied} installed />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InstallCard({ tool, scan, onCopy, copied, installed }: { tool: any; scan: any; onCopy: (text: string, id: string) => void; copied: string | null; installed?: boolean }) {
  const cmd = tool.install_windows || tool.install_guide || tool.install || "See official docs";
  const isCopied = copied === tool.id;
  const envKeys = scan?.env ? Object.entries(scan.env).filter(([_, v]: [string, any]) => v?.present).map(([k]) => k) : [];
  const needsKey = tool.required_env?.length && !tool.required_env.some((k: string) => envKeys.includes(k));

  return (
    <div style={{ padding: 16, borderRadius: 12, background: installed ? "rgba(74,222,128,0.03)" : "rgba(255,255,255,0.02)", border: `1px solid ${installed ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)"}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#f5f5f5" }}>{tool.name}</span>
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: installed ? "rgba(74,222,128,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${installed ? "rgba(74,222,128,0.2)" : "rgba(245,158,11,0.2)"}`, color: installed ? "#4ade80" : "#f59e0b" }}>
            {installed ? "Installed" : "Missing"}
          </span>
        </div>
        {tool.official && (
          <a href={tool.official} target="_blank" rel="noopener noreferrer" style={{ color: "#dadada", opacity: 0.5 }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <p style={{ fontSize: 12, opacity: 0.6, margin: 0, lineHeight: 1.5 }}>{tool.best_for || tool.description || ""}</p>

      <div style={{ padding: 10, borderRadius: 6, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <code style={{ fontSize: 11, fontFamily: "'GeistMono', monospace", color: "#f5f5f5", wordBreak: "break-all" }}>{cmd}</code>
        <button onClick={() => onCopy(cmd, tool.id)} style={{ background: "none", border: "none", color: isCopied ? "#4ade80" : "#dadada", cursor: "pointer", opacity: 0.6, flexShrink: 0 }}>
          {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {tool.prerequisites && (
        <div style={{ fontSize: 11, opacity: 0.5 }}>Requires: {tool.prerequisites}</div>
      )}

      {needsKey && (
        <div style={{ padding: 8, borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", fontSize: 11, color: "#ef4444" }}>
          Missing API key: {tool.required_env.join(", ")}
        </div>
      )}

      {tool.docs && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tool.docs.map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none" }}>Docs {i + 1} ↗</a>
          ))}
        </div>
      )}
    </div>
  );
}
