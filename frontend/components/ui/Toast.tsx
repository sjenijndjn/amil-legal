"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
}

interface ToastContextValue {
  notify: (msg: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 lg:bottom-6 inset-x-3 sm:inset-x-auto sm:right-5 z-50 flex flex-col gap-2.5 sm:max-w-md pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border-subtle bg-navy-card px-4 py-3 text-ivory-primary shadow-legal transition-all"
          >
            {t.variant === "error" ? (
              <AlertTriangle className="h-5 w-5 text-status-error shrink-0 mt-0.5" />
            ) : t.variant === "info" ? (
              <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ivory-primary">{t.title}</p>
              {t.description && (
                <p className="text-xs text-ivory-secondary mt-0.5 leading-relaxed break-words">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ivory-secondary hover:text-ivory-primary"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
