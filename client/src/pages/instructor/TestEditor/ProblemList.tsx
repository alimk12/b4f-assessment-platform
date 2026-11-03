import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import { InstructorProblem } from '../../../types/instructor.types';

interface Props { problems: InstructorProblem[]; selectedId: number | null; isLocked: boolean; onEdit(p: InstructorProblem): void; onDelete(p: InstructorProblem): void }

export default function ProblemList({ problems, selectedId, isLocked, onEdit, onDelete }: Props) {
  if (problems.length === 0) return <EmptyState title="No problems yet" text="Add the first problem with the form." />;
  return (
    <div className="test-editor__list">
      {problems.map((p) => {
        const hidden = p.testCases.filter((c) => c.visibility === 'HIDDEN').length;
        return (
          <div key={p.id} className={`ui-card test-editor__item${selectedId === p.id ? ' test-editor__item--active' : ''}`}>
            <div>
              <div className="test-editor__item-text">{p.title}</div>
              <div className="test-editor__meta">
                <code>{p.functionName}()</code> · {p.points} points · {p.testCases.length - hidden} sample + {hidden} hidden cases
              </div>
            </div>
            <div className="test-editor__item-actions">
              <Button size="small" variant="secondary" onClick={() => onEdit(p)} disabled={isLocked}>Edit</Button>
              <Button size="small" variant="danger" onClick={() => onDelete(p)} disabled={isLocked}>Delete</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
