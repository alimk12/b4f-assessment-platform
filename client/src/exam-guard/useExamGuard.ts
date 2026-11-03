import { useEffect, useRef } from 'react';
import { ClientViolationType } from '../types/common.types';

interface Options { isActive: boolean; onViolation: (type: ClientViolationType) => void }

const groupOf = (t: ClientViolationType) => (t === 'FULLSCREEN_EXIT' || t === 'TAB_HIDDEN' ? 'FOCUS' : 'CLIPBOARD');
const inAllowedArea = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-exam-clipboard="allow"]');

export function useExamGuard({ isActive, onViolation }: Options) {
  const cbRef = useRef(onViolation);
  cbRef.current = onViolation;

  useEffect(() => {
    if (!isActive) return;
    const lastSent: Record<string, number> = {};
    const report = (type: ClientViolationType) => {
      const g = groupOf(type);
      const now = Date.now();
      if (lastSent[g] && now - lastSent[g] < 1000) return; // same group within 1 s → once
      lastSent[g] = now;
      cbRef.current(type);
    };

    const onFullscreen = () => { if (!document.fullscreenElement) report('FULLSCREEN_EXIT'); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') report('TAB_HIDDEN'); };
    const onCopy = (e: ClipboardEvent) => {
      if (inAllowedArea(e.target)) return;
      e.preventDefault();
      report(e.type === 'cut' ? 'CUT' : 'COPY');
    };
    const onContextMenu = (e: MouseEvent) => { if (!inAllowedArea(e.target)) e.preventDefault(); };

    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCopy, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
    };
  }, [isActive]);
}
