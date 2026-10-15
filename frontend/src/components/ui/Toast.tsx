import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastItem = { id: number; kind: 'success' | 'error'; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, kind, message }]);
    setTimeout(() => setItems((current) => current.filter((t) => t.id !== id)), 4500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
              t.kind === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast needs ToastProvider');
  return ctx;
}
