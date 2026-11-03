import { StudentProblem } from '../../../types/student.types';

export default function SubmitResultBox({ submission, mockLabel }: { submission: StudentProblem['submission']; mockLabel?: string }) {
  if (!submission) return null;
  return (
    <div className="attempt__submit-box" role="status">
      Submitted · {mockLabel ?? `${submission.passedCount} / ${submission.totalCount} hidden tests passed`} · {submission.points} points
    </div>
  );
}
