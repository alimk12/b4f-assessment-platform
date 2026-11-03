import { RunResult } from '../../../types/execution.types';
import { showValue } from '../../../utils/format';

const TITLE: Record<string, string> = {
  PASSED: '✓ Passed', WRONG_ANSWER: '✗ Wrong answer', SYNTAX_ERROR: '✗ Syntax error', RUNTIME_ERROR: '✗ Runtime error',
  FUNCTION_NOT_FOUND: '✗ Function not found', TIME_LIMIT_EXCEEDED: '✗ Time limit exceeded', MOCK: '[MOCK] Not executed',
};

export default function RunOutput({ result, isRunning }: { result: RunResult | undefined; isRunning: boolean }) {
  if (isRunning) return <div className="attempt__output"><span className="attempt__output-empty">Running your code…</span></div>;
  if (!result) return <div className="attempt__output"><span className="attempt__output-empty">Press Run to test your function with the sample case.</span></div>;
  const tone = result.status === 'PASSED' ? 'ok' : result.status === 'MOCK' ? 'mock' : 'bad';
  const ran = result.status === 'PASSED' || result.status === 'WRONG_ANSWER';
  return (
    <div className="attempt__output" aria-live="polite">
      <div className={`attempt__output-status attempt__output-status--${tone}`}>{TITLE[result.status] ?? result.status}</div>
      <div className="attempt__output-msg">{result.message}</div>
      {result.error && (
        <div className="attempt__output-err">
          {result.error.type}: {result.error.message}{result.error.line ? `  (line ${result.error.line})` : ''}
        </div>
      )}
      {result.status !== 'MOCK' && (
        <>
          <div className="attempt__output-row"><span className="attempt__output-key">Input</span><span>{result.input.map(showValue).join(', ')}</span></div>
          <div className="attempt__output-row"><span className="attempt__output-key">Expected</span><span>{showValue(result.expectedOutput)}</span></div>
          {ran && <div className="attempt__output-row"><span className="attempt__output-key">Your output</span><span>{showValue(result.actualOutput)}</span></div>}
          {result.timeMs !== null && <div className="attempt__output-row"><span className="attempt__output-key">Time</span><span>{result.timeMs} ms</span></div>}
        </>
      )}
      {result.logs.length > 0 && (
        <div className="attempt__console"><div className="attempt__output-key">Console</div>{result.logs.join('\n')}</div>
      )}
    </div>
  );
}
