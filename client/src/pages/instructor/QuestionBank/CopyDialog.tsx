import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import { useCohort } from '../../../context/CohortContext';
import { useInstructorTests } from '../../../context/InstructorTestsContext';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { cohortLabel } from '../../../types/cohort.types';
import { TestType } from '../../../types/common.types';

export interface CopyTarget { kind: 'test' | 'question' | 'problem'; sourceId: number; label: string; type: TestType }

/** Choose one of my tests (selected cohort, same type, not locked) and copy into it. The source never changes. */
export default function CopyDialog({ target, onClose }: { target: CopyTarget; onClose(): void }) {
  const { selectedCohort } = useCohort();
  const { tests, isTestsLoading, loadTests } = useInstructorTests();
  const bank = useQuestionBank();
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    bank.clearCopyState();
    if (selectedCohort) loadTests(selectedCohort.id);
  }, [selectedCohort?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = tests.filter((t) => t.type === target.type);
  useEffect(() => {
    const firstOpen = candidates.find((t) => !t.isContentLocked);
    if (!targetId && firstOpen) setTargetId(String(firstOpen.id));
  }, [tests]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    const id = Number(targetId);
    if (target.kind === 'test') await bank.copyTest(id, target.sourceId);
    else if (target.kind === 'question') await bank.copyQuestion(id, target.sourceId);
    else await bank.copyProblem(id, target.sourceId);
  };

  return (
    <div className="ui-dialog__backdrop" role="dialog" aria-modal="true" aria-label="Copy to my test">
      <div className="ui-dialog">
        <h2>Copy {target.label}</h2>
        {!selectedCohort ? <p>Select one of your cohorts in the navbar first.</p> : (
          <>
            <p className="ui-muted">Into a test of <strong>{cohortLabel(selectedCohort)}</strong>. The copy is added at the end; the original is not changed.</p>
            {isTestsLoading && tests.length === 0 ? <Loading /> : candidates.length === 0 ? (
              <p>Your cohort has no test of this type.</p>
            ) : (
              <div className="ui-field">
                <label htmlFor="copy-target">Copy into</label>
                <select id="copy-target" value={targetId} onChange={(e) => { bank.clearCopyState(); setTargetId(e.target.value); }}>
                  <option value="">Choose a test…</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.isContentLocked}>
                      {t.title}{t.isContentLocked ? ' (locked — a student has started it)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {bank.copyError && <ErrorMessage message={bank.copyError} />}
            {bank.copyMessage && <div className="bank-copy__done" role="status">{bank.copyMessage}</div>}
          </>
        )}
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={onClose}>{bank.copyMessage ? 'Close' : 'Cancel'}</Button>
          {!bank.copyMessage && selectedCohort && (
            <Button onClick={run} disabled={!targetId} isLoading={bank.isCopying}>Copy</Button>
          )}
        </div>
      </div>
    </div>
  );
}
