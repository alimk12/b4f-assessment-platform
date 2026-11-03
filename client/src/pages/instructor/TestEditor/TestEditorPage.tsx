import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import StateBadge from '../../../components/common/StateBadge';
import { useInstructorTests } from '../../../context/InstructorTestsContext';
import { InstructorProblem, InstructorQuestion } from '../../../types/instructor.types';
import ProblemForm from './ProblemForm';
import ProblemList from './ProblemList';
import QuestionForm from './QuestionForm';
import QuestionList from './QuestionList';
import './TestEditorPage.css';

type ToDelete = { kind: 'question'; item: InstructorQuestion } | { kind: 'problem'; item: InstructorProblem } | null;

export default function TestEditorPage() {
  const testId = Number(useParams().testId);
  const ctx = useInstructorTests();
  const { currentTest: test, isTestLoading, testError, loadTest, isSaving, actionError, clearActionError } = ctx;
  const [editingQ, setEditingQ] = useState<InstructorQuestion | null>(null);
  const [editingP, setEditingP] = useState<InstructorProblem | null>(null);
  const [toDelete, setToDelete] = useState<ToDelete>(null);

  useEffect(() => { clearActionError(); loadTest(testId); }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!Number.isInteger(testId) || testId < 1) return <PageContainer title="Test not found."><Link to="/instructor/tests">Back to tests</Link></PageContainer>;
  if (testError) return <PageContainer title="Test editor"><ErrorMessage message={testError} onRetry={() => loadTest(testId)} /><Link to="/instructor/tests">Back to tests</Link></PageContainer>;
  if (!test || test.id !== testId) return <Loading />;

  const locked = test.isContentLocked;
  const confirmDelete = async () => {
    if (!toDelete) return;
    const ok = toDelete.kind === 'question' ? await ctx.deleteQuestion(toDelete.item.id) : await ctx.deleteProblem(toDelete.item.id);
    if (ok) {
      if (toDelete.kind === 'question' && editingQ?.id === toDelete.item.id) setEditingQ(null);
      if (toDelete.kind === 'problem' && editingP?.id === toDelete.item.id) setEditingP(null);
    }
    setToDelete(null);
  };

  return (
    <PageContainer
      wide
      title={test.title}
      subtitle={<><Link to="/instructor/tests">← Tests</Link> · {test.durationMinutes} min · <StateBadge state={test.status} /> {isTestLoading && '· refreshing…'}</>}
    >
      {locked && <div className="test-editor__lock">🔒 Content is locked because a student has started this test.</div>}
      <div className="test-editor__layout">
        <div>
          <h2>{test.type === 'MCQ' ? `Questions (${test.questions?.length ?? 0})` : `Problems (${test.problems?.length ?? 0})`}</h2>
          {test.type === 'MCQ' ? (
            <QuestionList questions={test.questions ?? []} selectedId={editingQ?.id ?? null} isLocked={locked}
              onEdit={(q) => { clearActionError(); setEditingQ(q); }} onDelete={(q) => setToDelete({ kind: 'question', item: q })} />
          ) : (
            <ProblemList problems={test.problems ?? []} selectedId={editingP?.id ?? null} isLocked={locked}
              onEdit={(p) => { clearActionError(); setEditingP(p); }} onDelete={(p) => setToDelete({ kind: 'problem', item: p })} />
          )}
        </div>
        <div>
          {test.type === 'MCQ' ? (
            <QuestionForm editing={editingQ} isLocked={locked} isSaving={isSaving} serverError={actionError}
              onSave={async (p) => { const ok = await ctx.saveQuestion(test.id, p, editingQ?.id); if (ok) setEditingQ(null); return ok; }}
              onCancel={() => setEditingQ(null)} />
          ) : (
            <ProblemForm editing={editingP} isLocked={locked} isSaving={isSaving} serverError={actionError}
              onSave={async (p) => { const ok = await ctx.saveProblem(test.id, p, editingP?.id); if (ok) setEditingP(null); return ok; }}
              onCancel={() => setEditingP(null)} />
          )}
        </div>
      </div>
      <ConfirmDialog isOpen={!!toDelete} title={toDelete?.kind === 'problem' ? 'Delete this problem?' : 'Delete this question?'}
        confirmLabel="Delete" variant="danger" isLoading={isSaving} onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
        <p>{toDelete?.kind === 'problem' ? toDelete.item.title : toDelete?.item.text}</p>
        <p className="ui-muted">This cannot be undone.</p>
      </ConfirmDialog>
    </PageContainer>
  );
}
