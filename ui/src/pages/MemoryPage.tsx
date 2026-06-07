import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MemoryPage() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getMemory().then((m) => setText(m.text));
  }, []);

  const save = async () => {
    await api.setMemory(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Memory</h2>
        <button
          onClick={save}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid rgba(74,222,128,0.3)",
            background: saved ? "rgba(74,222,128,0.2)" : "rgba(74,222,128,0.1)",
            color: "#4ade80",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
        This is the local learning layer. AgentDock reads this before recommending or launching stacks. Edit freely — the advisor parses evidence blocks automatically.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          flex: 1,
          minHeight: 500,
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 16,
          color: "#f5f5f5",
          fontFamily: "'GeistMono', monospace",
          fontSize: 13,
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />
    </div>
  );
}
