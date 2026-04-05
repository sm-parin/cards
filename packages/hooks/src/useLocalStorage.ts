import { useState, useCallback } from 'react';

/**
 * useState backed by localStorage.
 * Safe for SSR — reads from localStorage only on client, falls back to initialValue.
 * Returns [value, setValue, removeValue].
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      console.error(`useLocalStorage set error for key "${key}":`, err);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      console.error(`useLocalStorage remove error for key "${key}":`, err);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
