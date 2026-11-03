import { Link } from 'react-router-dom';
import StateBadge from '../../../components/common/StateBadge';
import { StudentAttempt } from '../../../types/student.types';

export default function AttemptResult({ attempt }: { attempt: StudentAttempt }) {
  const r = attempt.result;
  const terminated = attempt.status === 'TERMINATED';
  return (
    <div className={`ui-card attempt__result${terminated ? ' attempt__result--terminated' : ''}`}>
      <StateBadge state={attempt.status} />
      <h1 style={{ marginTop: '0.75rem' }}>{attempt.testTitle}</h1>
      <div className="attempt__result-score">{r?.score === null || r?.score === undefined ? '—' : `${r.score}%`}</div>
      <div className="attempt__result-label">{r?.label ?? ''}</div>
      {terminated && r?.terminationReason && <div className="attempt__result-reason">{r.terminationReason}</div>}
      {r?.problems && (
        <table className="attempt__result-problems">
          <thead><tr><th>Problem</th><th>Status</th><th>Points</th></tr></thead>
          <tbody>
            {r.problems.map((p) => (
              <tr key={p.problemId}><td>{p.title}</td><td>{p.submitted ? 'Submitted' : 'Not submitted'}</td><td>{p.points}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: '1.25rem' }}><Link to="/student/tests" className="ui-btn ui-btn--primary">Back to My Tests</Link></p>
    </div>
  );
}
