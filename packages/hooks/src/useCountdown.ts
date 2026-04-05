import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownOptions {
  /** Duration in milliseconds */
  durationMs: number;
  /** Called when timer reaches zero */
  onExpire?: () => void;
  /** Auto-start on mount */
  autoStart?: boolean;
}

interface UseCountdownReturn {
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** 0–1, where 1 = full and 0 = expired */
  progress: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useCountdown({
  durationMs,
  onExpire,
  autoStart = false,
}: UseCountdownOptions): UseCountdownReturn {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isRunning) { clear(); return; }

    intervalRef.current = setInterval(() => {
      setRemainingMs(prev => {
        if (prev <= 100) {
          clear();
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return clear;
  }, [isRunning]);

  useEffect(() => {
    setRemainingMs(durationMs);
  }, [durationMs]);

  const start  = useCallback(() => setIsRunning(true),  []);
  const pause  = useCallback(() => setIsRunning(false), []);
  const reset  = useCallback(() => {
    clear();
    setIsRunning(false);
    setRemainingMs(durationMs);
  }, [durationMs]);

  return {
    remainingMs,
    progress: durationMs > 0 ? remainingMs / durationMs : 0,
    isRunning,
    start,
    pause,
    reset,
  };
}
