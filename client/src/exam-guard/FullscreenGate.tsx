import { ReactNode } from 'react';
import Button from '../components/common/Button';
import './ExamGuard.css';

interface Props { isFullscreen: boolean; onEnter: () => void; children: ReactNode }

export default function FullscreenGate({ isFullscreen, onEnter, children }: Props) {
  if (isFullscreen) return <>{children}</>;
  return (
    <div className="exam-guard-gate">
      <div className="exam-guard-gate__box">
        <div className="exam-guard-gate__icon" aria-hidden="true">⛶</div>
        <h2>Return to full screen to continue.</h2>
        <p className="exam-guard-gate__text">The exam is only shown in full screen. Your timer is still running.</p>
        <Button onClick={onEnter}>Return to full screen</Button>
      </div>
    </div>
  );
}
