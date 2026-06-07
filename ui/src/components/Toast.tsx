import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"] = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    timers.current.set(id, setTimeout(() => removeToast(id), duration));
  }, [removeToast]);

  useEffect(() => {
    return () => { timers.current.forEach((t) => clearTimeout(t)); };
  }, []);

  const icons = {
    success: <CheckCircle2 size={16} color="#4ade80" />,
    error: <AlertCircle size={16} color="#ef4444" />,
    warning: <AlertTriangle size={16} color="#f59e0b" />,
    info: <Info size={16} color="#60a5fa" />,
  };

  const borders = {
    success: "rgba(74,222,128,0.3)",
    error: "rgba(239,68,68,0.3)",
    warning: "rgba(245,158,11,0.3)",
    info: "rgba(96,165,250,0.3)",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", top: 80, right: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#141414",
              border: `1px solid ${borders[t.type]}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 260,
              maxWidth: 400,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              animation: "toastSlideIn 0.25s ease",
            }}
          >
            {icons[t.type]}
            <span style={{ fontSize: 13, color: "#f5f5f5", flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer", opacity: 0.5, padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
