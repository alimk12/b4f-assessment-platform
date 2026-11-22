import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import StateBadge from '../../../components/common/StateBadge';
import { useAttempt } from '../../../context/AttemptContext';
import { useStudentTests } from '../../../context/StudentTestsContext';
import { useFullscreen } from '../../../exam-guard/useFullscreen';
import './TestIntroPage.css';

export default function TestIntroPage() {
  const testId = Number(useParams().testId);
  const { currentTest: test, isTestLoading, testError, loadTest } = useStudentTests();
  const { startAttempt, actionError, clearActionError } = useAttempt();
  const { isSupported, enter, exit } = useFullscreen();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);

  useEffect(() => { clearActionError(); loadTest(testId); }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (testError) return <PageContainer title="Test"><ErrorMessage message={testError} /><Link to="/student/tests">Back to My Tests</Link></PageContainer>;
  if (isTestLoading || !test) return <Loading />;

  const isOpen = test.state === 'AVAILABLE' || test.state === 'IN_PROGRESS';

  const start = async () => {
    setFsError(null);
    setIsStarting(true);
    const ok = await enter();
    if (!ok) {
      setIsStarting(false);
      setFsError('Full screen was not allowed. Please allow full screen and try again.');
      return;
    }
    const id = await startAttempt(test.id, true);
    setIsStarting(false);
    if (id) navigate(`/student/attempts/${id}`);
    else await exit();
  };

  return (
    <PageContainer title={test.title} subtitle={<Link to="/student/tests">← My Tests</Link>}>
      <div className="ui-card test-intro">
        <div className="test-intro__facts">
          <span className="test-intro__fact">{test.type === 'MCQ' ? 'Multiple choice' : 'Coding'}</span>
          <span className="test-intro__fact">⏱ {test.durationMinutes} minutes</span>
          <span className="test-intro__fact">{test.itemCount} {test.type === 'MCQ' ? 'questions' : 'problems'}</span>
          <StateBadge state={test.state} />
        </div>
        {test.state === 'LOCKED' && <ErrorMessage message={test.lockReason ?? 'This test is not available.'} />}
        {(test.state === 'SUBMITTED' || test.state === 'EXPIRED' || test.state === 'TERMINATED') && (
          <ErrorMessage message="You have already finished this test." />
        )}
        <h2>Rules</h2>
        <ul className="test-intro__rules">
          <li>You can take this test <strong>once</strong>.</li>
          <li>The timer starts when you press <strong>Start test</strong>. It does not stop if you refresh or close the page.</li>
          <li>When the time is over, your answers are no longer accepted.</li>
          <li>The test runs in <strong>full screen</strong>.</li>
          <li className="test-intro__rule--strong">Leaving full screen or switching tabs: the first time is a warning, the second time ends your exam.</li>
          <li className="test-intro__rule--strong">Copy, cut or paste from outside: two warnings, the third time ends your exam.</li>
          <li>If your exam is ended, your score counts only what you saved before that moment.</li>
          {test.type === 'CODING' && <li>Inside the code editor, copy and paste of your own code works normally.</li>}
        </ul>
        {!isSupported && <div className="test-intro__unsupported">This exam needs full screen. Please use a computer with Chrome, Edge or Firefox.</div>}
        {isOpen && (
          <label className="test-intro__pledge">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>I will take this exam alone, stay in full screen, and not copy or paste.<br />I understand that breaking these rules ends my exam.</span>
          </label>
        )}
        {(actionError || fsError) && <ErrorMessage message={(fsError ?? actionError) as string} />}
        <div className="test-intro__actions">
          {isOpen && (
            <Button onClick={start} disabled={!accepted || !isSupported} isLoading={isStarting}>
              {test.state === 'IN_PROGRESS' ? 'Continue test' : 'Start test'}
            </Button>
          )}
          <Link to="/student/tests">Back to My Tests</Link>
        </div>
      </div>
    </PageContainer>
  );
}
