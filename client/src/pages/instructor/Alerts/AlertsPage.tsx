import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import CohortGate from '../../../components/common/CohortGate';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import Pagination from '../../../components/common/Pagination';
import { useAlerts } from '../../../context/AlertsContext';
import { useInstructorAttempts } from '../../../context/InstructorAttemptsContext';
import { AlertSeverity } from '../../../types/alert.types';
import { Cohort } from '../../../types/cohort.types';
import { PAGE_LIMIT } from '../../../constants';
import AttemptDetails from '../Attempts/AttemptDetails';
import AlertRow from './AlertRow';
import './AlertsPage.css';

function CohortAlerts({ cohort }: { cohort: Cohort }) {
  const { alerts, alertsMeta, isAlertsLoading, alertsError, loadAlerts, markRead, markAllRead } = useAlerts();
  const details = useInstructorAttempts();
  const [severity, setSeverity] = useState<AlertSeverity | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const query = { severity, unread: unreadOnly, page, limit: PAGE_LIMIT };
  useEffect(() => { loadAlerts(query); }, [cohort.id, severity, unreadOnly, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="ui-toolbar">
        <div>
          <label htmlFor="a-severity">Severity</label>
          <select id="a-severity" value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value as AlertSeverity | ''); }}>
            <option value="">All</option>
            <option value="DANGER">Danger</option>
            <option value="WARNING">Warning</option>
          </select>
        </div>
        <label className="alerts-page__check">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => { setPage(1); setUnreadOnly(e.target.checked); }} />
          Unread only
        </label>
        <Button variant="secondary" onClick={markAllRead} disabled={alerts.every((a) => a.readAt)}>Mark all as read</Button>
      </div>
      {alertsError && <ErrorMessage message={alertsError} onRetry={() => loadAlerts(query)} />}
      {isAlertsLoading && alerts.length === 0 ? <Loading /> : alerts.length === 0 && !alertsError ? (
        <EmptyState title="No alerts" text={unreadOnly || severity ? 'No alerts match these filters.' : 'Exam-rule violations of this cohort will appear here.'} />
      ) : (
        <div className="alerts-page__list">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} onRead={() => markRead(a.id)} onOpen={() => details.loadAttemptDetail(a.attemptId)} />
          ))}
        </div>
      )}
      <Pagination meta={alertsMeta} onPage={setPage} />
      {(details.selectedAttempt || details.isDetailLoading || details.detailError) && (
        <AttemptDetails attempt={details.selectedAttempt} isLoading={details.isDetailLoading} error={details.detailError} onClose={details.closeDetail} />
      )}
    </>
  );
}

export default function AlertsPage() {
  return (
    <PageContainer title="Alerts" subtitle="Every exam-rule violation of the selected cohort. Alerts are kept forever; mark them as read once reviewed.">
      <CohortGate>{(cohort) => <CohortAlerts cohort={cohort} />}</CohortGate>
    </PageContainer>
  );
}
