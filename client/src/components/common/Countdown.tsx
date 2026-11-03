import { useEffect, useRef, useState } from 'react';
import { formatRemaining, getRemainingMs } from '../../utils/serverClock';
import './Countdown.css';

interface Props { deadline: string; serverOffsetMs: number; onExpire?: () => void }

export default function Countdown({ deadline, serverOffsetMs, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() => getRemainingMs(deadline, serverOffsetMs));
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const ms = getRemainingMs(deadline, serverOffsetMs);
      setRemaining(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [deadline, serverOffsetMs]);

  const tone = remaining < 60_000 ? ' countdown--danger' : remaining < 5 * 60_000 ? ' countdown--warning' : '';
  return (
    <span className={`countdown${tone}`} role="timer" aria-label="Time left">
      {formatRemaining(remaining)}
    </span>
  );
}
