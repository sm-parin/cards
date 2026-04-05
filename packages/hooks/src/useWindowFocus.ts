import { useState, useEffect } from 'react';

/**
 * Returns true when the browser tab is focused.
 * Use this to pause timers or animations when the user switches tabs.
 */
export function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur  = () => setFocused(false);

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur',  onBlur);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur',  onBlur);
    };
  }, []);

  return focused;
}
