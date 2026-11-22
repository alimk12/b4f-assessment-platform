import { useEffect } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import StateBadge from '../../../components/common/StateBadge';
import { InstructorAttemptDetail } from '../../../types/instructor.types';
import { formatDateTime, formatDuration, formatScore } from '../../../utils/format';

const VIOLATION_LABEL: Record<string, string> = {
  FULLSCREEN_EXIT: 'Left full screen', TAB_HIDDEN: 'Switched tab / window', COPY: 'Copy', CUT: 'Cut',
  PASTE_EXTERNAL: 'Paste from outside', DROP_EXTERNAL: 'Drop from outside', NEW_SESSION: 'Opened on another window/device',
};

interface Props { attempt: InstructorAttemptDetail | null; isLoading: boolean; error: string | null; onClose(): void }

export default function AttemptDetails({ attempt, isLoading, error, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="ui-dialog__backdrop" role="dialog" aria-modal="true" aria-label="Attempt details" onClick={onClose}>
      <div className="ui-dialog attempts-details" onClick={(e) => e.stopPropagation()}>
        {isLoading && !attempt && <Loading />}
        {error && <ErrorMessage message={error} />}
        {attempt && (
          <>
            <h2>{attempt.student.fullName} — {attempt.test.title}</h2>
            <div className="attempts-details__grid">
              <span className="attempts-details__label">Status</span><span><StateBadge state={attempt.status} /></span>
              <span className="attempts-details__label">Email</span><span>{attempt.student.email}</span>
              <span className="attempts-details__label">Started</span><span>{formatDateTime(attempt.startedAt)}</span>
              <span className="attempts-details__label">Deadline</span><span>{formatDateTime(attempt.deadline)}</span>
              <span className="attempts-details__label">{attempt.status === 'TERMINATED' ? 'Terminated' : 'Submitted'}</span>
              <span>{formatDateTime(attempt.terminatedAt ?? attempt.submittedAt)}</span>
              <span className="attempts-details__label">Time used</span><span>{formatDuration(attempt.timeUsedSeconds)}</span>
              <span className="attempts-details__label">Score</span>
              <span>{attempt.status === 'IN_PROGRESS' ? '—' : formatScore(attempt.score)}</span>
              {attempt.mcq && (<><span className="attempts-details__label">Correct</span><span>{attempt.mcq.correctCount} / {attempt.mcq.totalCount}</span></>)}
            </div>
            {attempt.terminationReason && <div className="attempts-details__reason">{attempt.terminationReason}</div>}
            {attempt.problems && (
              <div className="attempts-details__section">
                <h3>Problems</h3>
                <table>
                  <thead><tr><th>Problem</th><th>Runs</th><th>Hidden tests</th><th>Points</th></tr></thead>
                  <tbody>
                    {attempt.problems.map((p) => (
                      <tr key={p.problemId}>
                        <td>{p.title}</td><td>{p.runCount}</td>
                        <td>{p.submitted ? `${p.passedCount} / ${p.totalCount}` : 'Not submitted'}</td>
                        <td>{p.points ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="attempts-details__section">
              <h3>Violation log ({attempt.violations.length})</h3>
              {attempt.violations.length === 0 ? <p className="ui-muted">No violations recorded.</p> : (
                <table>
                  <thead><tr><th>Time</th><th>Event</th><th>Group</th><th>Counted</th></tr></thead>
                  <tbody>
                    {attempt.violations.map((v, i) => (
                      <tr key={i}>
                        <td>{new Date(v.occurredAt).toLocaleTimeString('en-GB')}</td>
                        <td>{VIOLATION_LABEL[v.type] ?? v.type}</td>
                        <td>{v.group}</td>
                        <td>{v.counted ? 'Yes' : 'No (duplicate / log only)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="ui-dialog__actions"><Button variant="secondary" onClick={onClose}>Close</Button></div>
          </>
        )}
      </div>
    </div>
  );
}
