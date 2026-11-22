import { AttemptIntegrity } from '../../../types/student.types';

export default function IntegrityStatus({ integrity }: { integrity: AttemptIntegrity | null }) {
  if (!integrity) return null;
  const devices = integrity.deviceSwitches ?? 0;
  const hot = integrity.focusViolations > 0 || integrity.clipboardViolations > 0 || devices > 0;
  return (
    <span className={`attempt__integrity${hot ? ' attempt__integrity--hot' : ''}`} title="Exam rule warnings">
      Warnings: focus {integrity.focusViolations}/{integrity.focusLimit} · copy/paste {integrity.clipboardViolations}/{integrity.clipboardLimit}
      {' · '}devices {devices}/{integrity.deviceAllowed ?? 2}
    </span>
  );
}
