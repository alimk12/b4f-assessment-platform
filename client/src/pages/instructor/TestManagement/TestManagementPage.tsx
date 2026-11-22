import { useEffect, useState } from 'react';
import CohortGate from '../../../components/common/CohortGate';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import StateBadge from '../../../components/common/StateBadge';
import { useInstructorTests } from '../../../context/InstructorTestsContext';
import { Cohort, cohortLabel } from '../../../types/cohort.types';
import TestRow from './TestRow';
import './TestManagementPage.css';

function CohortTests({ cohort }: { cohort: Cohort }) {
  const { tests, isTestsLoading, testsError, loadTests, publishTest, unpublishTest, actionError, clearActionError } = useInstructorTests();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorRow, setErrorRow] = useState<number | null>(null);

  useEffect(() => { loadTests(cohort.id); }, [loadTests, cohort.id]);

  const toggle = async (id: number, isPublished: boolean) => {
    clearActionError();
    setBusyId(id);
    setErrorRow(id);
    await (isPublished ? unpublishTest(id) : publishTest(id));
    setBusyId(null);
  };

  return (
    <>
      <div className="test-mgmt__cohort">
        <strong>{cohortLabel(cohort)}</strong> <StateBadge state={cohort.status} />
        <span className="ui-muted">Join code for students: <span className="ui-code">{cohort.joinCode}</span></span>
      </div>
      {testsError && <ErrorMessage message={testsError} onRetry={() => loadTests(cohort.id)} />}
      {isTestsLoading && tests.length === 0 ? <Loading /> : tests.length === 0 && !testsError ? <EmptyState title="No tests yet" /> : (
        <div className="test-mgmt__list">
          {tests.map((t) => (
            <TestRow key={t.id} test={t} isBusy={busyId === t.id} error={errorRow === t.id ? actionError : null}
              onToggle={() => toggle(t.id, t.status === 'PUBLISHED')} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TestManagementPage() {
  return (
    <PageContainer title="Tests" subtitle="The three tests of the selected cohort, in order. Publish a test to make it available.">
      <CohortGate>{(cohort) => <CohortTests cohort={cohort} />}</CohortGate>
    </PageContainer>
  );
}
