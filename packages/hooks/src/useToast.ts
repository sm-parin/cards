import { useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    durationMs = 3000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, variant };
    setToasts(prev => [...prev, toast]);
    const timer = setTimeout(() => dismissToast(id), durationMs);
    timers.current.set(id, timer);
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
