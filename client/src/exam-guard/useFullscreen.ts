import { useCallback, useEffect, useState } from 'react';

export function useFullscreen() {
  const isSupported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async () => {
    if (!isSupported) return false;
    if (document.fullscreenElement) return true;
    try {
      // Some browsers never settle the promise when full screen is refused, so stop waiting after 3 s.
      await Promise.race([document.documentElement.requestFullscreen(), new Promise((r) => setTimeout(r, 3000))]);
    } catch {
      return false;
    }
    return !!document.fullscreenElement;
  }, [isSupported]);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
  }, []);

  return { isSupported, isFullscreen, enter, exit };
}
