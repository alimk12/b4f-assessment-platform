import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import StateBadge from '../../../components/common/StateBadge';
import { StudentTestCard } from '../../../types/student.types';

interface Props { test: StudentTestCard; isBusy: boolean; error: string | null; onContinue(): void }

export default function TestCard({ test, isBusy, error, onContinue }: Props) {
  const items = `${test.itemCount} ${test.type === 'MCQ' ? 'questions' : 'problems'}`;
  return (
    <div className={`ui-card my-tests-card${test.state === 'LOCKED' ? ' my-tests-card--locked' : ''}`}>
      <div className="my-tests-card__step">{test.order}</div>
      <div>
        <div className="my-tests-card__title"><h3 style={{ margin: 0 }}>{test.title}</h3><StateBadge state={test.state} /></div>
        <div className="my-tests-card__meta">{test.type === 'MCQ' ? 'Multiple choice' : 'Coding'} · {test.durationMinutes} min · {items}</div>
        {test.state === 'LOCKED' && test.lockReason && <div className="my-tests-card__note">🔒 {test.lockReason}</div>}
        {test.state === 'EXPIRED' && <div className="my-tests-card__note">Expired — not submitted</div>}
        {test.state === 'TERMINATED' && <div className="my-tests-card__note my-tests-card__note--terminated">Terminated — exam rules violated</div>}
      </div>
      <div>
        {test.state === 'AVAILABLE' && <Link to={`/student/tests/${test.id}`} className="ui-btn ui-btn--primary">Open</Link>}
        {test.state === 'IN_PROGRESS' && <Button variant="primary" isLoading={isBusy} onClick={onContinue}>Continue</Button>}
        {(test.state === 'SUBMITTED' || test.state === 'TERMINATED') && <div className="my-tests-card__score">{test.score}%</div>}
      </div>
      {error && <div className="my-tests-card__error" role="alert">{error}</div>}
    </div>
  );
}
