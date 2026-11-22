import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import Pagination from '../../../components/common/Pagination';
import StateBadge from '../../../components/common/StateBadge';
import { PAGE_LIMIT } from '../../../constants';
import { useAdmin } from '../../../context/AdminContext';
import { useCohort } from '../../../context/CohortContext';
import { Cohort, cohortLabel } from '../../../types/cohort.types';
import { formatDateTime } from '../../../utils/format';
import CohortForm from './CohortForm';
import '../AdminPages.css';

export default function CohortsPage() {
  const admin = useAdmin();
  const { loadCohorts: reloadNavbarCohorts } = useCohort();
  const [cityId, setCityId] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'ARCHIVED'>('');
  const [page, setPage] = useState(1);
  const [toArchive, setToArchive] = useState<Cohort | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => { admin.loadCities(); admin.clearActionError(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    admin.loadCohorts({ cityId: cityId ? Number(cityId) : undefined, status: status || undefined, page, limit: PAGE_LIMIT });
  }, [cityId, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterChange = (ok: boolean) => { if (ok) reloadNavbarCohorts(); return ok; };

  const archive = async () => {
    if (!toArchive) return;
    setBusyId(toArchive.id);
    afterChange(await admin.archiveCohort(toArchive.id));
    setBusyId(null);
    setToArchive(null);
  };

  const newCode = async (c: Cohort) => {
    setBusyId(c.id);
    afterChange(await admin.newJoinCode(c.id));
    setBusyId(null);
  };

  return (
    <PageContainer wide title="Cohorts" subtitle="Every cohort in every city. A new cohort gets its three tests as drafts, optionally copied from another cohort.">
      <CohortForm cities={admin.cities} onCreated={() => afterChange(true)} />
      <div className="ui-toolbar">
        <div>
          <label htmlFor="c-city">City</label>
          <select id="c-city" value={cityId} onChange={(e) => { setPage(1); setCityId(e.target.value); }}>
            <option value="">All cities</option>
            {admin.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="c-status">Status</label>
          <select id="c-status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'ACTIVE' | 'ARCHIVED'); }}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>
      {admin.adminError && <ErrorMessage message={admin.adminError} />}
      {admin.isAdminLoading && admin.cohorts.length === 0 ? <Loading /> : admin.cohorts.length === 0 && !admin.adminError ? (
        <EmptyState title="No cohorts match these filters." />
      ) : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Cohort</th><th>Status</th><th>Join code</th><th>Students</th><th>Instructors</th><th>Created</th><th /></tr></thead>
            <tbody>
              {admin.cohorts.map((c) => (
                <tr key={c.id}>
                  <td><strong>{cohortLabel(c)}</strong></td>
                  <td><StateBadge state={c.status} /></td>
                  <td>
                    <span className="ui-code">{c.joinCode}</span>{' '}
                    {c.status === 'ACTIVE' && (
                      <Button variant="secondary" size="small" isLoading={busyId === c.id} onClick={() => newCode(c)}>New code</Button>
                    )}
                  </td>
                  <td>{c.studentCount}</td>
                  <td>{c.instructors.length ? c.instructors.map((i) => i.fullName).join(', ') : <span className="ui-muted">None</span>}</td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td>
                    {c.status === 'ACTIVE' && (
                      <Button variant="secondary" size="small" onClick={() => { admin.clearActionError(); setToArchive(c); }}>Archive</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={admin.cohortsMeta} onPage={setPage} />
      <ConfirmDialog isOpen={!!toArchive} title={`Archive ${toArchive ? cohortLabel(toArchive) : ''}?`} confirmLabel="Archive" variant="danger"
        isLoading={busyId === toArchive?.id} onConfirm={archive} onCancel={() => setToArchive(null)}>
        <p>Its students will no longer see any test, and new sign-ups with its code are refused. Every result and alert is kept.</p>
        {admin.actionError && <ErrorMessage message={admin.actionError} />}
      </ConfirmDialog>
    </PageContainer>
  );
}
