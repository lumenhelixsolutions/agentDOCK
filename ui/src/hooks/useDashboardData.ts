import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { TokenBurnReport } from "@/components/TokenBurnPanel";

export interface DashboardData {
  profiles: any[];
  projects: any[];
  activeProjectData: any;
  scan: any;
  usage: any;
  portfolio: any;
  research: any;
  memory: string;
  tokenBurn: TokenBurnReport | null;
}

export interface DashboardState extends DashboardData {
  loading: boolean;
  /** Data sources that rejected on the last load (widget-level error states). */
  failedSources: Set<string>;
  reload: () => void;
  setProjects: (p: any[]) => void;
  setActiveProjectData: (d: any) => void;
  setTokenBurn: (t: TokenBurnReport | null) => void;
}

/**
 * Loads every dashboard data source in parallel, tracking failures per source
 * so each widget can render its own error state instead of one global toast.
 */
export function useDashboardData(onTotalFailure: () => void): DashboardState {
  const [data, setData] = useState<DashboardData>({
    profiles: [],
    projects: [],
    activeProjectData: null,
    scan: null,
    usage: null,
    portfolio: null,
    research: null,
    memory: "",
    tokenBurn: null,
  });
  const [loading, setLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const failures = new Set<string>();
    const track = <T,>(name: string, promise: Promise<T>, fallback: T): Promise<T> =>
      promise.catch(() => {
        failures.add(name);
        return fallback;
      });

    Promise.all([
      track("profiles", api.getProfiles(), [] as any[]),
      track("projects", api.getProjects(), { projects: [], active: null }),
      track("activeProject", api.getActiveProject(), { active: null, project: null }),
      track("scan", api.runScan(), null),
      track("usage", api.getUsage(), null),
      track("portfolio", api.getPortfolioHealth(), null),
      track("research", api.getResearch(), null),
      track("memory", api.getMemory(), { text: "" }),
      track("tokenBurn", api.getTokenBurn(), null),
    ]).then(([profiles, projectData, activeData, scan, usage, portfolio, research, memoryData, tokenBurn]) => {
      if (cancelled || !mounted.current) return;
      setData({
        profiles: profiles || [],
        projects: projectData?.projects || [],
        activeProjectData: activeData || { active: null, project: null },
        scan,
        usage,
        portfolio,
        research,
        memory: memoryData?.text || "",
        tokenBurn,
      });
      setFailedSources(failures);
      setLoading(false);
      if (failures.size >= 9) onTotalFailure();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return useMemo(
    () => ({
      ...data,
      loading,
      failedSources,
      reload,
      setProjects: (projects: any[]) => setData((d) => ({ ...d, projects })),
      setActiveProjectData: (activeProjectData: any) => setData((d) => ({ ...d, activeProjectData })),
      setTokenBurn: (tokenBurn: TokenBurnReport | null) => setData((d) => ({ ...d, tokenBurn })),
    }),
    [data, loading, failedSources, reload],
  );
}
