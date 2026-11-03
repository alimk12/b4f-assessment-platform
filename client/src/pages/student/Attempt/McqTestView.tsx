import { useState } from 'react';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { useAttempt } from '../../../context/AttemptContext';
import { StudentQuestion } from '../../../types/student.types';
import QuestionCard from './QuestionCard';

interface Props {
  questions: StudentQuestion[]; isTimeUp: boolean;
  selections: Record<number, number>; savedIds: Set<number>; onSelect(questionId: number, optionId: number): void;
}

export default function McqTestView({ questions, isTimeUp, selections, savedIds, onSelect }: Props) {
  const { saveMcqAnswer, submitMcq, savingQuestionIds, failedQuestionIds, isSubmitting, actionError } = useAttempt();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const answered = questions.filter((q) => selections[q.id] !== undefined).length;
  const unanswered = questions.length - answered;

  const select = (questionId: number, optionId: number) => {
    onSelect(questionId, optionId);
    saveMcqAnswer(questionId, optionId);
  };
  const stateOf = (id: number) =>
    failedQuestionIds.includes(id) ? 'failed' : savingQuestionIds.includes(id) ? 'saving' : savedIds.has(id) ? 'saved' : 'idle';

  const submit = async () => {
    const answers = Object.entries(selections).map(([q, o]) => ({ questionId: Number(q), optionId: o }));
    await submitMcq(answers);
    setConfirmOpen(false);
  };

  return (
    <>
      {actionError && <ErrorMessage message={actionError} />}
      <div className="attempt__mcq-list">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} index={i} question={q} selected={selections[q.id] ?? null} isDisabled={isTimeUp || isSubmitting}
            saveState={stateOf(q.id)} onSelect={(o) => select(q.id, o)} />
        ))}
      </div>
      <div className="attempt__footer">
        <span><strong>{answered}</strong> / {questions.length} answered</span>
        <Button onClick={() => setConfirmOpen(true)} disabled={isTimeUp}>Submit answers</Button>
      </div>
      <ConfirmDialog isOpen={confirmOpen} title="Submit your answers?" confirmLabel="Submit" isLoading={isSubmitting}
        onConfirm={submit} onCancel={() => setConfirmOpen(false)}>
        {unanswered > 0 ? <p><strong>{unanswered}</strong> question{unanswered > 1 ? 's are' : ' is'} not answered and will count as wrong.</p> : <p>All questions are answered.</p>}
        <p className="ui-muted">You cannot change your answers after submitting.</p>
      </ConfirmDialog>
    </>
  );
}
