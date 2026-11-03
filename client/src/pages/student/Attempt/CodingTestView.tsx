import { useState } from 'react';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { starterCode } from '../../../constants';
import { useAttempt } from '../../../context/AttemptContext';
import { ExecutionMode } from '../../../types/execution.types';
import { StudentProblem } from '../../../types/student.types';
import ExecutionModeNotice from './ExecutionModeNotice';
import ProblemPanel from './ProblemPanel';
import ProblemSidebar from './ProblemSidebar';

interface Props {
  problems: StudentProblem[]; mode: ExecutionMode | null; isTimeUp: boolean;
  codeMap: Record<number, string>; onCodeChange(problemId: number, code: string): void;
}

export default function CodingTestView({ problems, mode, isTimeUp, codeMap, onCodeChange }: Props) {
  const { finishCoding, isSubmitting, actionError, reportViolation } = useAttempt();
  const [activeId, setActiveId] = useState(problems[0]?.id ?? 0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = problems.find((p) => p.id === activeId) ?? problems[0];
  const notSubmitted = problems.filter((p) => !p.submission).length;
  if (!active) return null;

  return (
    <>
      <ExecutionModeNotice mode={mode} />
      {actionError && <ErrorMessage message={actionError} />}
      <div className="attempt__coding">
        <div>
          <ProblemSidebar problems={problems} activeId={active.id} onSelect={setActiveId} />
          <Button variant="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setConfirmOpen(true)} disabled={isTimeUp}>Finish test</Button>
        </div>
        <ProblemPanel key={active.id} problem={active} code={codeMap[active.id] ?? starterCode(active.functionName)}
          onCodeChange={(c) => onCodeChange(active.id, c)} isTimeUp={isTimeUp} onViolation={reportViolation} />
      </div>
      <ConfirmDialog isOpen={confirmOpen} title="Finish the coding test?" confirmLabel="Finish test" isLoading={isSubmitting}
        onConfirm={async () => { await finishCoding(); setConfirmOpen(false); }} onCancel={() => setConfirmOpen(false)}>
        {notSubmitted > 0
          ? <p><strong>{notSubmitted}</strong> problem{notSubmitted > 1 ? 's are' : ' is'} not submitted and will get 0 points.</p>
          : <p>All problems are submitted.</p>}
        <p className="ui-muted">You cannot come back to this test after finishing.</p>
      </ConfirmDialog>
    </>
  );
}
