import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import { useAttempt } from '../../../context/AttemptContext';
import { useStudentTests } from '../../../context/StudentTestsContext';
import { useFullscreen } from '../../../exam-guard/useFullscreen';
import TestCard from './TestCard';
import './MyTestsPage.css';

export default function MyTestsPage() {
  const { tests, isTestsLoading, testsError, loadTests } = useStudentTests();
  const { startAttempt, actionError } = useAttempt();
  const { enter } = useFullscreen();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorId, setErrorId] = useState<number | null>(null);

  useEffect(() => { loadTests(); }, [loadTests]);

  const resume = async (testId: number) => {
    setBusyId(testId);
    setErrorId(testId);
    await enter();
    const id = await startAttempt(testId, true);
    setBusyId(null);
    if (id) navigate(`/student/attempts/${id}`);
  };

  return (
    <PageContainer title="My Tests" subtitle="Take the tests in order. Each test can be taken once, and the timer starts when you press Start.">
      {testsError && <ErrorMessage message={testsError} onRetry={loadTests} />}
      {isTestsLoading && tests.length === 0 ? <Loading /> : tests.length === 0 && !testsError ? (
        <EmptyState title="No tests yet" text="Your instructor has not published any tests." />
      ) : (
        <div className="my-tests__list">
          {tests.map((t) => (
            <TestCard key={t.id} test={t} isBusy={busyId === t.id} error={errorId === t.id ? actionError : null} onContinue={() => resume(t.id)} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
