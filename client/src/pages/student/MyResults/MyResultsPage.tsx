import { useEffect } from 'react';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import StateBadge from '../../../components/common/StateBadge';
import { useStudentTests } from '../../../context/StudentTestsContext';
import { formatDateTime, formatScore } from '../../../utils/format';
import './MyResultsPage.css';

export default function MyResultsPage() {
  const { results, isResultsLoading, resultsError, loadResults } = useStudentTests();
  useEffect(() => { loadResults(); }, [loadResults]);

  return (
    <PageContainer title="My Results">
      {resultsError && <ErrorMessage message={resultsError} onRetry={loadResults} />}
      {isResultsLoading && results.length === 0 ? <Loading /> : results.length === 0 && !resultsError ? (
        <EmptyState title="No results yet" text="Finished tests will appear here." />
      ) : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Test</th><th>Status</th><th>Score</th><th>Finished</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.testId}>
                  <td>{r.testTitle}</td>
                  <td><StateBadge state={r.status} /></td>
                  <td>
                    <span className="my-results__score">{formatScore(r.score)}</span>
                    <span className={`my-results__label${r.status === 'TERMINATED' ? ' my-results__label--terminated' : ''}`}>{r.label}</span>
                  </td>
                  <td>{formatDateTime(r.terminatedAt ?? r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
