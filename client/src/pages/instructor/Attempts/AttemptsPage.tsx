import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CohortGate from '../../../components/common/CohortGate';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import StateBadge from '../../../components/common/StateBadge';
import { useInstructorAttempts } from '../../../context/InstructorAttemptsContext';
import { useInstructorTests } from '../../../context/InstructorTestsContext';
import { Cohort } from '../../../types/cohort.types';
import { AttemptFilters } from '../../../types/instructor.types';
import { formatDateTime, formatDuration, formatScore } from '../../../utils/format';
import AttemptDetails from './AttemptDetails';
import AttemptsFilters from './AttemptsFilters';
import './AttemptsPage.css';

function CohortAttempts({ cohort }: { cohort: Cohort }) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<AttemptFilters>(() => ({
    testId: params.get('testId') ?? '', status: params.get('status') ?? '', search: params.get('search') ?? '',
  }), [params]);
  const { tests, loadTests } = useInstructorTests();
  const a = useInstructorAttempts();

  useEffect(() => { loadTests(cohort.id); }, [cohort.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { a.loadAttempts(cohort.id, filters); }, [cohort.id, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilters = (f: AttemptFilters) => {
    const next = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v && String(v).trim()) next.set(k, String(v).trim()); });
    setParams(next);
  };

  return (
    <>
      <AttemptsFilters tests={tests} value={filters} onChange={setFilters} />
      {a.attemptsError && <ErrorMessage message={a.attemptsError} onRetry={() => a.loadAttempts(cohort.id, filters)} />}
      {a.isAttemptsLoading && a.attempts.length === 0 ? <Loading /> : a.attempts.length === 0 && !a.attemptsError ? (
        <EmptyState title="No attempts match these filters." text="Try other filters." />
      ) : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Student</th><th>Test</th><th>Status</th><th>Started</th><th>Submitted</th><th>Time used</th><th>Score</th><th>Violations</th></tr>
            </thead>
            <tbody>
              {a.attempts.map((r) => (
                <tr key={r.id} className={`attempts-table__row${r.deviceSwitchCount > 0 ? ' attempts-table__row--device' : ''}`} tabIndex={0}
                  onClick={() => a.loadAttemptDetail(r.id)} onKeyDown={(e) => { if (e.key === 'Enter') a.loadAttemptDetail(r.id); }}>
                  <td><div className="attempts-table__name">{r.student.fullName}</div><div className="attempts-table__email">{r.student.email}</div></td>
                  <td>{r.test.title}</td>
                  <td><StateBadge state={r.status} /></td>
                  <td>{formatDateTime(r.startedAt)}</td>
                  <td>{formatDateTime(r.terminatedAt ?? r.submittedAt)}</td>
                  <td>{formatDuration(r.timeUsedSeconds)}</td>
                  <td>
                    {r.status === 'IN_PROGRESS' ? '—' : formatScore(r.score)}
                    {r.status === 'TERMINATED' && <span className="attempts-table__score-note">Terminated</span>}
                  </td>
                  <td>
                    <span className={r.violationCount > 0 ? 'attempts-table__violations--some' : ''}>{r.violationCount}</span>
                    {r.deviceSwitchCount > 0 && (
                      <span className="attempts-table__device" title="Opened on another device">
                        Device ×{r.deviceSwitchCount}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(a.selectedAttempt || a.isDetailLoading || a.detailError) && (
        <AttemptDetails attempt={a.selectedAttempt} isLoading={a.isDetailLoading} error={a.detailError} onClose={a.closeDetail} />
      )}
    </>
  );
}

export default function AttemptsPage() {
  return (
    <PageContainer wide title="Attempts" subtitle="Every attempt of the selected cohort. Click a row to see details and the violation log.">
      <CohortGate>{(cohort) => <CohortAttempts cohort={cohort} />}</CohortGate>
    </PageContainer>
  );
}
