import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import Pagination from '../../../components/common/Pagination';
import StateBadge from '../../../components/common/StateBadge';
import { PAGE_LIMIT } from '../../../constants';
import { useAdmin } from '../../../context/AdminContext';
import { useCohort } from '../../../context/CohortContext';
import { InstructorAccount } from '../../../types/admin.types';
import { cohortLabel } from '../../../types/cohort.types';
import InstructorForm from './InstructorForm';
import '../AdminPages.css';

function LinkCohort({ instructor }: { instructor: InstructorAccount }) {
  const { linkInstructor, isSaving } = useAdmin();
  const { cohorts } = useCohort();
  const [cohortId, setCohortId] = useState('');
  const free = cohorts.filter((c) => c.status === 'ACTIVE' && !instructor.cohorts.some((ic) => ic.id === c.id));
  if (!free.length) return null;
  return (
    <div className="admin-link">
      <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} aria-label={`Link ${instructor.fullName} to a cohort`}>
        <option value="">Link to cohort…</option>
        {free.map((c) => <option key={c.id} value={c.id}>{cohortLabel(c)}</option>)}
      </select>
      <Button size="small" variant="secondary" disabled={!cohortId} isLoading={isSaving}
        onClick={async () => { if (await linkInstructor(Number(cohortId), instructor.id)) setCohortId(''); }}>Link</Button>
    </div>
  );
}

export default function InstructorsPage() {
  const admin = useAdmin();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { admin.clearActionError(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { admin.loadInstructors({ search: query || undefined, page, limit: PAGE_LIMIT }); }, [query, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(search.trim()); };

  return (
    <PageContainer wide title="Instructors" subtitle="Instructor accounts and the cohorts each one can manage.">
      <InstructorForm />
      <form className="ui-toolbar" onSubmit={onSearch}>
        <div>
          <label htmlFor="i-search">Name or email</label>
          <input id="i-search" value={search} placeholder="Search…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {admin.adminError && <ErrorMessage message={admin.adminError} />}
      {admin.isAdminLoading && admin.instructors.length === 0 ? <Loading /> : admin.instructors.length === 0 && !admin.adminError ? (
        <EmptyState title="No instructors found" />
      ) : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Instructor</th><th>Status</th><th>Cohorts</th><th /></tr></thead>
            <tbody>
              {admin.instructors.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.fullName}</strong><div className="ui-muted">{i.email}</div></td>
                  <td><StateBadge state={i.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>
                    {i.cohorts.map((c) => (
                      <span key={c.id} className="admin-chip">
                        {c.name} — {c.city}
                        <button type="button" className="admin-chip__remove" title="Unlink" aria-label={`Unlink from ${c.name}`}
                          onClick={() => admin.unlinkInstructor(c.id, i.id)}>×</button>
                      </span>
                    ))}
                    <LinkCohort instructor={i} />
                  </td>
                  <td>
                    <Button size="small" variant={i.isActive ? 'secondary' : 'primary'} isLoading={admin.isSaving}
                      onClick={() => admin.updateInstructor(i.id, { isActive: !i.isActive })}>
                      {i.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={admin.instructorsMeta} onPage={setPage} />
    </PageContainer>
  );
}
