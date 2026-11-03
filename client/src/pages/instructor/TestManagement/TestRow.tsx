import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import StateBadge from '../../../components/common/StateBadge';
import { InstructorTestSummary } from '../../../types/instructor.types';

interface Props { test: InstructorTestSummary; isBusy: boolean; error: string | null; onToggle(): void }

export default function TestRow({ test, isBusy, error, onToggle }: Props) {
  const items = test.type === 'MCQ' ? `${test.questionCount} questions` : `${test.problemCount} problems`;
  return (
    <div className="ui-card test-mgmt-row">
      <div className="test-mgmt-row__order">{test.order}</div>
      <div>
        <div className="test-mgmt-row__title">
          <h3 style={{ margin: 0 }}>{test.title}</h3>
          <StateBadge state={test.status} />
          <StateBadge state={test.type} />
        </div>
        <div className="test-mgmt-row__meta">
          {test.durationMinutes} min · {items} · {test.attemptCount} attempts ({test.inProgressCount} in progress)
        </div>
        {test.isContentLocked && <div className="test-mgmt-row__lock">🔒 Content locked — a student has started this test</div>}
      </div>
      <div className="test-mgmt-row__actions">
        <Link to={`/instructor/tests/${test.id}`} className="ui-btn ui-btn--secondary">{test.isContentLocked ? 'View content' : 'Edit content'}</Link>
        <Button variant={test.status === 'PUBLISHED' ? 'secondary' : 'primary'} isLoading={isBusy} onClick={onToggle}>
          {test.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>
      {error && <div className="test-mgmt-row__error" role="alert">{error}</div>}
    </div>
  );
}
