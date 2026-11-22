import { useEffect, useState } from 'react';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import { useInstructorTests } from '../../../context/InstructorTestsContext';
import TestRow from './TestRow';
import './TestManagementPage.css';

export default function TestManagementPage() {
  const { tests, isTestsLoading, testsError, loadTests, publishTest, unpublishTest, actionError, clearActionError } = useInstructorTests();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorRow, setErrorRow] = useState<number | null>(null);

  useEffect(() => { loadTests(); }, [loadTests]);

  const toggle = async (id: number, isPublished: boolean) => {
    clearActionError();
    setBusyId(id);
    setErrorRow(id);
    await (isPublished ? unpublishTest(id) : publishTest(id));
    setBusyId(null);
  };

  return (
    <PageContainer title="Tests" subtitle="The three tests students take, in order. Publish a test to make it available.">
      {testsError && <ErrorMessage message={testsError} onRetry={loadTests} />}
      {isTestsLoading && tests.length === 0 ? <Loading /> : tests.length === 0 && !testsError ? <EmptyState title="No tests yet" /> : (
        <div className="test-mgmt__list">
          {tests.map((t) => (
            <TestRow key={t.id} test={t} isBusy={busyId === t.id} error={errorRow === t.id ? actionError : null}
              onToggle={() => toggle(t.id, t.status === 'PUBLISHED')} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
