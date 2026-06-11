import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CooldownRegistry } from "@/lib/cooldown";

/**
 * Shared registry source for every deck surface (page, top-bar strip, popout).
 * Polls the kernel every `pollMs`; countdowns tick locally every second.
 */
export function useCooldownRegistry(pollMs = 30000) {
  const [registry, setRegistry] = useState<CooldownRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const busyRef = useRef(false);

  const reload = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setFailed(false);
    try {
      const data = (await api.getProviderCooldown()) as unknown as CooldownRegistry;
      setRegistry(data);
    } catch {
      setFailed(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const poll = setInterval(reload, pollMs);
    return () => clearInterval(poll);
  }, [reload, pollMs]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const patch = useCallback(
    async (body: { provider?: string; status?: string; cooldown_until?: string | null; preset?: string; current_session_provider?: string | null }) => {
      const data = (await api.patchProviderCooldown(body)) as unknown as CooldownRegistry;
      setRegistry(data);
      return data;
    },
    [],
  );

  return { registry, loading, failed, nowMs, reload, patch };
}
