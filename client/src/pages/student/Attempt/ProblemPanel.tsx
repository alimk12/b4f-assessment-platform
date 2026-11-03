import { useState } from 'react';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAttempt } from '../../../context/AttemptContext';
import CodeEditor from '../../../editor/CodeEditor';
import { StudentProblem } from '../../../types/student.types';
import { showValue } from '../../../utils/format';
import RunOutput from './RunOutput';
import SubmitResultBox from './SubmitResultBox';

interface Props {
  problem: StudentProblem; code: string; onCodeChange(code: string): void; isTimeUp: boolean;
  onViolation(type: 'PASTE_EXTERNAL' | 'DROP_EXTERNAL'): void;
}

export default function ProblemPanel({ problem, code, onCodeChange, isTimeUp, onViolation }: Props) {
  const { runCode, submitCode, runResults, submitResults, runningProblemId, isSubmitting } = useAttempt();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = runResults[problem.id];
  const submitted = !!problem.submission;
  const isRunning = runningProblemId === problem.id;
  const locked = isTimeUp || submitted;
  const mockLabel = submitResults[problem.id]?.mode === 'MOCK' ? submitResults[problem.id].label : undefined;

  return (
    <div className="attempt__panel">
      <div className="ui-card">
        <h2>{problem.title}</h2>
        <div className="ui-muted" style={{ marginBottom: '0.6rem' }}>Function: <code>{problem.functionName}</code> · {problem.points} points</div>
        <div className="attempt__desc">{problem.description}</div>
        {problem.sample && (
          <div className="attempt__sample">
            <div className="attempt__sample-label">Sample input</div>
            {problem.functionName}({problem.sample.args.map(showValue).join(', ')})
            <div className="attempt__sample-label" style={{ marginTop: '0.4rem' }}>Expected output</div>
            {showValue(problem.sample.expected)}
          </div>
        )}
      </div>
      <div>
        <CodeEditor value={code} onChange={onCodeChange} isReadOnly={locked}
          errorLine={run?.error?.line ?? null} errorMessage={run?.error ? `${run.error.type}: ${run.error.message}` : null}
          height="380px" onViolation={locked ? undefined : onViolation} />
        <div className="attempt__actions">
          <Button variant="secondary" onClick={() => runCode(problem.id, code)} isLoading={isRunning}
            disabled={locked || problem.runsRemaining <= 0 || isSubmitting}>▶ Run</Button>
          <span className="attempt__runs">{problem.runsRemaining} runs left</span>
          <span style={{ flex: 1 }} />
          <Button variant="success" onClick={() => setConfirmOpen(true)} disabled={locked || isRunning}>Submit</Button>
        </div>
        <RunOutput result={run} isRunning={isRunning} />
        <SubmitResultBox submission={problem.submission} mockLabel={mockLabel} />
      </div>
      <ConfirmDialog isOpen={confirmOpen} title={`Submit "${problem.title}"?`} confirmLabel="Submit" variant="primary" isLoading={isSubmitting}
        onConfirm={async () => { await submitCode(problem.id, code); setConfirmOpen(false); }} onCancel={() => setConfirmOpen(false)}>
        <p>Your code is checked against the hidden test cases. You can submit each problem <strong>once</strong>.</p>
      </ConfirmDialog>
    </div>
  );
}
