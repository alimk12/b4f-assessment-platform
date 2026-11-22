import { AttemptIntegrity } from '../../../types/student.types';

export default function IntegrityStatus({ integrity }: { integrity: AttemptIntegrity | null }) {
  if (!integrity) return null;
  const hot = integrity.focusViolations > 0 || integrity.clipboardViolations > 0;
  return (
    <span className={`attempt__integrity${hot ? ' attempt__integrity--hot' : ''}`} title="Exam rule warnings">
      Warnings: focus {integrity.focusViolations}/{integrity.focusLimit} · copy/paste {integrity.clipboardViolations}/{integrity.clipboardLimit}
    </span>
  );
}
