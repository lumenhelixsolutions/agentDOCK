import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Layers3, Play, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { NODE_TYPES, WIZARD_STEPS, type AgentOption, type LlmOption, type StackNode, type WizardStep } from "@/lib/stack-options";
import type { ProfileDiff, StackIssue } from "@/lib/stack-compatibility";
import { btn } from "@/components/terminal/primitives";

export function WizardStepper({
  step,
  onStep,
  hasAgent,
  hasLlm,
  hasTool,
}: {
  step: WizardStep;
  onStep: (s: WizardStep) => void;
  hasAgent: boolean;
  hasLlm: boolean;
  hasTool: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {WIZARD_STEPS.map((s, i) => {
        const active = step === s.id;
        const done =
          (s.id === "agent" && hasAgent) || (s.id === "llm" && hasLlm) || (s.id === "tools" && hasTool) || (s.id === "review" && hasAgent && hasLlm);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStep(s.id)}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs ${
              active
                ? "hoot-gold-chip font-semibold"
                : done
                  ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-400"
                  : "border-border bg-foreground/[0.02] text-foreground/75"
            }`}
          >
            <span className="opacity-50">{i + 1}.</span> {s.label}
          </button>
        );
      })}
      <span className="ml-1 text-[11px] opacity-45">{WIZARD_STEPS.find((s) => s.id === step)?.hint}</span>
    </div>
  );
}

export function NodePalette({ collapsed, onToggle, onAdd }: { collapsed: boolean; onToggle: () => void; onAdd: (type: string) => void }) {
  return (
    <div className={`hoot-card-soft flex shrink-0 flex-row gap-2 rounded-xl p-3 lg:flex-col ${collapsed ? "lg:w-12 lg:px-2" : "lg:w-[200px] lg:p-4"}`}>
      <button onClick={onToggle} aria-label={collapsed ? "Expand palette" : "Collapse palette"} className="hidden self-end text-foreground/70 lg:block">
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      {!collapsed && <h3 className="m-0 hidden text-[11px] uppercase tracking-[3px] opacity-50 lg:block">Palette</h3>}
      {NODE_TYPES.map((nt) => {
        const Icon = nt.icon;
        return (
          <button
            key={nt.type}
            onClick={() => onAdd(nt.type)}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs hover:opacity-90 ${nt.chip} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <Icon size={16} />
            <span className={collapsed ? "lg:hidden" : ""}>{nt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Stack node row with its compatibility issues attached inline. */
export function NodeList({
  nodes,
  selected,
  issuesByNode,
  llmOptions,
  agentOptions,
  onSelect,
  onRemove,
}: {
  nodes: StackNode[];
  selected: string | null;
  issuesByNode: Map<string, StackIssue[]>;
  llmOptions: LlmOption[];
  agentOptions: AgentOption[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {nodes.map((node, idx) => {
        const def = NODE_TYPES.find((n) => n.type === node.type);
        const Icon = def?.icon || Plus;
        const isSelected = selected === node.id;
        const nodeIssues = issuesByNode.get(node.id) || [];
        return (
          <div key={node.id} className={`rounded-[10px] border ${isSelected ? "hoot-active-item" : "border-border bg-foreground/[0.02]"}`}>
            <div onClick={() => onSelect(node.id)} className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${def?.chip}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-foreground">
                  {idx + 1}. {node.label}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] opacity-50">
                  {node.type === "llm" && (llmOptions.find((l) => l.id === node.config.model)?.name || node.config.model)}
                  {node.type === "agent" && (agentOptions.find((a) => a.id === node.config.agent)?.name || node.config.agent)}
                  {node.type === "tool" && (node.config.command || "No command")}
                  {node.type === "processor" && (node.config.type || "Processor")}
                  {node.type === "output" && (node.config.format || "Text")}
                </div>
              </div>
              {nodeIssues.length > 0 && (
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                    nodeIssues.some((i) => i.severity === "block")
                      ? "border-red-400/30 bg-red-400/10 text-red-400"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-500"
                  }`}
                >
                  <AlertTriangle size={10} /> {nodeIssues.length}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(node.id);
                }}
                aria-label={`Remove ${node.label}`}
                className="text-red-400 opacity-60 hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {nodeIssues.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border px-4 py-2.5">
                {nodeIssues.map((issue, i) => (
                  <div key={i} className={`text-[11px] leading-relaxed ${issue.severity === "block" ? "text-red-400" : "text-amber-500"}`}>
                    {issue.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HealthPanel({ score, issues }: { score: number; issues: StackIssue[] }) {
  const scoreClass = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-500" : "text-red-400";
  const barClass = score >= 80 ? "bg-emerald-400" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  const stackIssues = issues.filter((i) => !i.nodeId);
  return (
    <>
      <div className="hoot-card-soft rounded-xl p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[3px] opacity-50">Health Score</span>
          <span className={`font-mono text-2xl font-light ${scoreClass}`}>{score}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
          <div className={`h-full transition-[width] duration-300 ${barClass}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="hoot-card-soft flex-1 overflow-auto rounded-xl p-4">
        <div className="mb-2.5 flex items-center gap-2">
          {issues.length === 0 ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-500" />}
          <span className="text-[11px] uppercase tracking-[3px] opacity-50">
            {issues.length === 0 ? "No Issues" : `${issues.length} Issue${issues.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {stackIssues.map((issue, i) => (
            <div key={i} className="rounded-md border border-amber-400/10 bg-amber-400/[0.04] p-2.5 text-xs leading-normal text-foreground">
              {issue.text}
            </div>
          ))}
          {issues.length > stackIssues.length && (
            <div className="text-[11px] opacity-50">{issues.length - stackIssues.length} node-level issue(s) shown inline on the stack.</div>
          )}
          {issues.length === 0 && <div className="px-2 py-5 text-center text-xs opacity-50">This stack looks good. Ready to launch.</div>}
        </div>
      </div>
    </>
  );
}

/** Review-step comparison against the closest existing profile. */
export function ProfileDiffCard({ diff, capability }: { diff: ProfileDiff | null; capability: { tier: string; warnings: string[]; description: string } | null }) {
  return (
    <div className="hoot-card-soft rounded-xl p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Layers3 size={14} className="hoot-gold-text" />
        <span className="text-[11px] uppercase tracking-[3px] opacity-50">Vs existing profiles</span>
      </div>
      {diff ? (
        <div className="flex flex-col gap-2 text-xs">
          <div className="text-foreground">
            Closest: <span className="font-semibold">{diff.profile.meta?.name || diff.profile.id}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <DiffChip same={diff.sameAgent} label="agent" />
            <DiffChip same={diff.sameModel} label="model" />
            <DiffChip same={diff.sameMode} label="mode" />
          </div>
          {diff.exactDuplicate ? (
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-2 text-[11px] text-amber-500">
              This duplicates an existing profile — consider launching{" "}
              <Link to="/profiles" className="underline">
                {diff.profile.id}
              </Link>{" "}
              instead of saving a copy.
            </div>
          ) : (
            <div className="text-[11px] opacity-55">Differs where unmarked — saving creates a distinct profile.</div>
          )}
        </div>
      ) : (
        <div className="text-xs opacity-50">No similar existing profile — this stack is new ground.</div>
      )}
      {capability && (
        <div className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed">
          <span className="hoot-gold-text font-semibold uppercase tracking-wider">Model tier: {capability.tier}</span>
          <span className="opacity-60"> — {capability.description}</span>
          {capability.warnings.length > 0 && (
            <div className="mt-1 text-amber-500">Rules warn against: {capability.warnings.join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffChip({ same, label }: { same: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
        same ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" : "border-border bg-foreground/5 text-muted-foreground"
      }`}
    >
      {same ? "same" : "diff"} {label}
    </span>
  );
}

export function CanvasEmptyState({ onCustom, children }: { onCustom: () => void; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
      <Sparkles size={36} className="hoot-gold-text opacity-70" />
      <div className="max-w-[420px] text-center">
        <div className="text-base font-medium text-foreground">Start with a guided stack</div>
        <p className="mb-0 mt-2 text-[13px] leading-normal opacity-55">
          Pick a quick-start template or follow the wizard steps above. HOOT suggests fixes based on what is actually installed.
        </p>
      </div>
      <div className="grid w-full max-w-[960px] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
        <button type="button" onClick={onCustom} className="hoot-card-soft min-h-[120px] rounded-xl p-4 text-left text-foreground/85">
          <div className="text-[13px] font-medium">Custom wizard</div>
          <div className="mt-1 text-[11px] opacity-65">Agent first, then model — HOOT guides each step</div>
        </button>
      </div>
    </div>
  );
}

export function CanvasActions({ onClear, onSave, saving, disabled }: { onClear: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <div className="flex gap-2">
      <button onClick={onClear} className={btn.danger}>
        <Trash2 size={12} /> Clear
      </button>
      <button onClick={onSave} disabled={disabled || saving} className={btn.primary}>
        <Save size={12} /> {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}

export function LaunchButton({ score, launching, onLaunch }: { score: number; launching: boolean; onLaunch: () => void }) {
  const ready = score >= 50 && !launching;
  return (
    <button onClick={onLaunch} disabled={!ready} className={`${btn.success} justify-center !py-3 text-[13px] disabled:opacity-40`}>
      <Play size={14} /> {launching ? "Launching…" : "Launch Stack"}
    </button>
  );
}
