import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Countdown from '../../../components/common/Countdown';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import { GRACE_SECONDS } from '../../../constants';
import { useAttempt } from '../../../context/AttemptContext';
import FullscreenGate from '../../../exam-guard/FullscreenGate';
import { useExamGuard } from '../../../exam-guard/useExamGuard';
import { useFullscreen } from '../../../exam-guard/useFullscreen';
import ViolationWarningDialog from '../../../exam-guard/ViolationWarningDialog';
import AttemptResult from './AttemptResult';
import CodingTestView from './CodingTestView';
import IntegrityStatus from './IntegrityStatus';
import McqTestView from './McqTestView';
import './AttemptPage.css';

export default function AttemptPage() {
  const attemptId = Number(useParams().attemptId);
  const ctx = useAttempt();
  const { attempt, isAttemptLoading, attemptError, loadAttempt, serverOffsetMs, integrity, lastWarning, clearWarning, reportViolation, isSessionReplaced } = ctx;
  const { isFullscreen, enter, exit } = useFullscreen();
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  // Kept here (outside the full-screen gate) so leaving full screen never loses work.
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [codeMap, setCodeMap] = useState<Record<number, string>>({});
  const initRef = useRef<number | null>(null);

  useEffect(() => {
    setIsTimeUp(false);
    if (!attempt || attempt.id !== attemptId) loadAttempt(attemptId);
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!attempt || attempt.id !== attemptId || initRef.current === attempt.id) return;
    initRef.current = attempt.id;
    const sel: Record<number, number> = {};
    attempt.questions?.forEach((q) => { if (q.selectedOptionId !== null) sel[q.id] = q.selectedOptionId; });
    setSelections(sel);
    setSavedIds(new Set(Object.keys(sel).map(Number)));
  }, [attempt, attemptId]);

  const isActive = attempt?.id === attemptId && attempt.status === 'IN_PROGRESS' && !isTimeUp;
  useExamGuard({ isActive, onViolation: reportViolation });

  useEffect(() => {
    if (attempt && attempt.id === attemptId && attempt.status !== 'IN_PROGRESS') exit();
  }, [attempt?.status, attempt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTimeUp = useCallback(() => {
    setIsTimeUp(true);
    window.setTimeout(() => loadAttempt(attemptId), GRACE_SECONDS * 1000 + 500);
  }, [attemptId, loadAttempt]);

  const resumeHere = async () => {
    if (!attempt) return;
    setIsResuming(true);
    await enter();
    await ctx.startAttempt(attempt.testId, true);
    setIsResuming(false);
  };

  if (isSessionReplaced) {
    return (
      <div className="ui-card attempt__session">
        <h2>This attempt is open in another window or device.</h2>
        <p className="ui-muted">Only one window can take the exam at a time. Continuing here closes the other window's session.</p>
        <Button onClick={resumeHere} isLoading={isResuming} disabled={!attempt}>Continue here</Button>
        {!attempt && <p style={{ marginTop: '1rem' }}><Link to="/student/tests">Back to My Tests</Link> and press Continue.</p>}
      </div>
    );
  }
  if (attemptError) return <div className="attempt__body attempt__body--narrow"><ErrorMessage message={attemptError} onRetry={() => loadAttempt(attemptId)} /><Link to="/student/tests">Back to My Tests</Link></div>;
  if (!attempt || attempt.id !== attemptId) return <Loading label={isAttemptLoading ? 'Loading your test…' : 'Loading…'} />;

  if (attempt.status !== 'IN_PROGRESS') {
    return <div className="attempt"><div className="attempt__body attempt__body--narrow"><AttemptResult attempt={attempt} /></div></div>;
  }

  const view = attempt.type === 'MCQ' ? (
    <McqTestView questions={attempt.questions ?? []} isTimeUp={isTimeUp} selections={selections} savedIds={savedIds}
      onSelect={(q, o) => { setSelections((s) => ({ ...s, [q]: o })); setSavedIds((s) => new Set(s).add(q)); }} />
  ) : (
    <CodingTestView problems={attempt.problems ?? []} mode={attempt.executionMode} isTimeUp={isTimeUp}
      codeMap={codeMap} onCodeChange={(id, c) => setCodeMap((m) => ({ ...m, [id]: c }))} />
  );

  return (
    <>
    <FullscreenGate isFullscreen={isFullscreen} onEnter={enter}>
      <div className="attempt">
        <header className="attempt__header">
          <span className="attempt__title">{attempt.testTitle}</span>
          <IntegrityStatus integrity={integrity} />
          <Countdown deadline={attempt.deadline} serverOffsetMs={serverOffsetMs} onExpire={onTimeUp} />
        </header>
        <main className={`attempt__body${attempt.type === 'MCQ' ? ' attempt__body--narrow' : ''}`}>
          {isTimeUp && <div className="attempt__timeup" role="alert">Time is over. Your work is being finalized…</div>}
          {view}
        </main>
      </div>
    </FullscreenGate>
    {/* Outside the gate, so the warning is readable even when full screen was left. */}
    <ViolationWarningDialog warning={lastWarning} onReturn={() => { clearWarning(); enter(); }} />
    </>
  );
}
