import { useEffect } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import StateBadge from '../../../components/common/StateBadge';
import { InstructorAttemptDetail, VIOLATION_LABEL, ViolationSummary } from '../../../types/instructor.types';
import { formatDateTime, formatDuration, formatScore } from '../../../utils/format';

/** Permanent violation summary, also after the attempt ended (A-8). */
function SummaryBlock({ s }: { s: ViolationSummary }) {
  const items = [
    { label: 'Device switches', value: `${s.device.count} / ${s.device.allowed}`, danger: s.device.count > 0 },
    { label: 'Full screen / tab', value: `${s.focus.count} / ${s.focus.limit}`, danger: false, hot: s.focus.count > 0 },
    { label: 'Copy / paste', value: `${s.clipboard.count} / ${s.clipboard.limit}`, danger: false, hot: s.clipboard.count > 0 },
  ];
  return (
    <div className="attempts-summary">
      {items.map((i) => (
        <div key={i.label} className={`attempts-summary__item${i.danger ? ' attempts-summary__item--danger' : i.hot ? ' attempts-summary__item--hot' : ''}`}>
          <div className="attempts-summary__value">{i.value}</div>
          <div className="attempts-summary__label">{i.label}</div>
        </div>
      ))}
    </div>
  );
}

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
            {attempt.violationSummary && <SummaryBlock s={attempt.violationSummary} />}
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
                      <tr key={i} className={v.type === 'DEVICE_SWITCH' && v.counted ? 'attempts-log__danger' : undefined}>
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
