'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface ToastContextValue {
  /** Confirms an action that leaves no other visible trace. */
  notify: (message: string, tone?: Toast['tone']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** How long a toast stays before dismissing itself. */
const TOAST_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue['notify']>(
    (message, tone = 'success') => {
      // Date.now() collides if two fire in the same millisecond; the random
      // suffix keeps React keys unique.
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* `polite` rather than `assertive`: a confirmation should not interrupt
          whatever a screen-reader user is currently reading. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex animate-slide-up items-start gap-2 rounded-lg border p-3 text-xs shadow-md ${
              toast.tone === 'error'
                ? 'border-danger/30 bg-danger-muted text-foreground'
                : 'border-border bg-card text-foreground'
            }`}
          >
            {toast.tone === 'error' ? (
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
            ) : (
              <Check className="mt-px h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
