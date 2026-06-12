import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { coachConfirmLevel, coachConfirmMessage } from "@/lib/coach-command-policy";

type EmitAction = (target: string) => void;

type CoachExecuteOptions = {
  onStatus?: (msg: string | null) => void;
};

export function useCoachCommandExecute(emitCoachAction?: EmitAction, options?: CoachExecuteOptions) {
  const navigate = useNavigate();

  return useCallback(
    async (cmd: Record<string, unknown>) => {
      const level = coachConfirmLevel(cmd);
      if (level !== "auto") {
        const ok = window.confirm(coachConfirmMessage(cmd, level));
        if (!ok) return;
      }
      const label = String(cmd.type || "action");
      options?.onStatus?.(`HOOT running ${label}…`);
      try {
        const res = await api.coachExecute(cmd);
        const last = res.results?.[res.results.length - 1] as Record<string, unknown> | undefined;
        if (res.route) navigate(res.route);
        if (res.target && emitCoachAction) emitCoachAction(String(res.target));
        if (res.message) alert(String(res.message));
        if (res.launched && res.session) {
          options?.onStatus?.(`Launched ${(res.session as { profileName?: string }).profileName || "session"}`);
          navigate("/terminal");
          return;
        }
        if (last?.type === "runScan") {
          options?.onStatus?.("Scan complete");
          navigate("/scan");
          return;
        }
        if (last && last.ok === false) {
          options?.onStatus?.(String(last.error || "Command blocked"));
          return;
        }
        if (res.launched) navigate("/terminal");
        options?.onStatus?.(null);
      } catch {
        switch (cmd.type) {
          case "launch":
          case "launchProfile":
            navigate("/profiles");
            break;
          case "runScan":
            navigate("/scan");
            break;
          case "switchProject":
            navigate("/");
            break;
          case "showMessage":
            alert(String(cmd.text || ""));
            break;
          case "openUrl":
            window.open(String(cmd.url || ""), "_blank");
            break;
          default:
            options?.onStatus?.(null);
            break;
        }
      }
    },
    [emitCoachAction, navigate, options],
  );
}