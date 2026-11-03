import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import { InstructorQuestion } from '../../../types/instructor.types';

interface Props { questions: InstructorQuestion[]; selectedId: number | null; isLocked: boolean; onEdit(q: InstructorQuestion): void; onDelete(q: InstructorQuestion): void }

export default function QuestionList({ questions, selectedId, isLocked, onEdit, onDelete }: Props) {
  if (questions.length === 0) return <EmptyState title="No questions yet" text="Add the first question with the form." />;
  return (
    <div className="test-editor__list">
      {questions.map((q, i) => (
        <div key={q.id} className={`ui-card test-editor__item${selectedId === q.id ? ' test-editor__item--active' : ''}`}>
          <div>
            <div className="test-editor__item-text">{i + 1}. {q.text}</div>
            <ol className="test-editor__options" type="A">
              {q.options.map((o) => (
                <li key={o.id} className={o.isCorrect ? 'test-editor__option--correct' : ''}>{o.text}{o.isCorrect ? ' ✓ correct' : ''}</li>
              ))}
            </ol>
          </div>
          <div className="test-editor__item-actions">
            <Button size="small" variant="secondary" onClick={() => onEdit(q)} disabled={isLocked}>Edit</Button>
            <Button size="small" variant="danger" onClick={() => onDelete(q)} disabled={isLocked}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
