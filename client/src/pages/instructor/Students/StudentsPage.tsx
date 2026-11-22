import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import CohortGate from '../../../components/common/CohortGate';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import Pagination from '../../../components/common/Pagination';
import StateBadge from '../../../components/common/StateBadge';
import { PAGE_LIMIT } from '../../../constants';
import { useInstructorStudents } from '../../../context/InstructorStudentsContext';
import { Cohort, cohortLabel } from '../../../types/cohort.types';
import { StudentAccount } from '../../../types/students.types';
import { formatDateTime } from '../../../utils/format';
import ResetPasswordDialog from './ResetPasswordDialog';
import StudentForm from './StudentForm';
import './StudentsPage.css';

function CohortStudents({ cohort }: { cohort: Cohort }) {
  const s = useInstructorStudents();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'DISABLED'>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StudentAccount | null>(null);
  const [resetting, setResetting] = useState<StudentAccount | null>(null);
  const [signingOut, setSigningOut] = useState<StudentAccount | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { s.clearActionError(); setNotice(null); }, [cohort.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    s.loadStudents({ search: query || undefined, status, page, limit: PAGE_LIMIT });
  }, [cohort.id, query, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(search.trim()); };
  const isArchived = cohort.status === 'ARCHIVED';

  return (
    <>
      <p className="students-page__cohort">
        <strong>{cohortLabel(cohort)}</strong> <StateBadge state={cohort.status} />
        {!isArchived && <span className="ui-muted">Students can also sign up themselves with the code <span className="ui-code">{cohort.joinCode}</span>.</span>}
      </p>
      {!isArchived && !editing && <StudentForm onSaved={(name) => setNotice(`${name} was added.`)} />}
      {editing && <StudentForm student={editing} onCancel={() => setEditing(null)} onSaved={(name) => { setEditing(null); setNotice(`${name} was updated.`); }} />}
      {notice && <div className="students-page__notice" role="status">{notice}</div>}
      <form className="ui-toolbar" onSubmit={onSearch}>
        <div>
          <label htmlFor="s-search">Name or email</label>
          <input id="s-search" value={search} placeholder="Search…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="s-status">Status</label>
          <select id="s-status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'ACTIVE' | 'DISABLED'); }}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {s.actionError && !editing && !resetting && !signingOut && <ErrorMessage message={s.actionError} />}
      {s.studentsError && <ErrorMessage message={s.studentsError} onRetry={() => s.loadStudents({ search: query, status, page, limit: PAGE_LIMIT })} />}
      {s.isStudentsLoading && s.students.length === 0 ? <Loading /> : s.students.length === 0 && !s.studentsError ? (
        <EmptyState title={query || status ? 'No students match these filters.' : 'No students yet'} text={query || status ? undefined : 'Add a student or share the cohort code.'} />
      ) : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Student</th><th>Status</th><th>Attempts</th><th>Last sign-in</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {s.students.map((st) => (
                <tr key={st.id}>
                  <td><strong>{st.fullName}</strong><div className="ui-muted">{st.email}</div></td>
                  <td><StateBadge state={st.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>{st.attemptCount}</td>
                  <td>{st.lastSignInAt ? formatDateTime(st.lastSignInAt) : <span className="ui-muted">Never</span>}</td>
                  <td>{formatDateTime(st.createdAt)}</td>
                  <td>
                    <div className="students-page__actions">
                      <Button size="small" variant="secondary" onClick={() => { s.clearActionError(); setNotice(null); setEditing(st); }}>Edit</Button>
                      <Button size="small" variant={st.isActive ? 'secondary' : 'primary'} isLoading={s.isSaving}
                        onClick={async () => { if (await s.updateStudent(st.id, { isActive: !st.isActive })) setNotice(`${st.fullName} was ${st.isActive ? 'disabled' : 'enabled'}.`); }}>
                        {st.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => { s.clearActionError(); setResetting(st); }}>Reset password</Button>
                      <Button size="small" variant="secondary" onClick={() => { s.clearActionError(); setSigningOut(st); }}>Sign out everywhere</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={s.studentsMeta} onPage={setPage} />
      {resetting && <ResetPasswordDialog student={resetting} onClose={() => setResetting(null)} />}
      <ConfirmDialog isOpen={!!signingOut} title={`Sign ${signingOut?.fullName ?? ''} out everywhere?`} confirmLabel="Sign out"
        isLoading={s.isSaving} onCancel={() => setSigningOut(null)}
        onConfirm={async () => {
          if (signingOut && await s.signOutStudent(signingOut.id)) {
            setNotice(`${signingOut.fullName} was signed out of every device.`);
            setSigningOut(null);
          }
        }}>
        <p>The student must sign in again. If they are in an exam, the timer keeps running, and opening it again counts as a device change.</p>
        {s.actionError && <ErrorMessage message={s.actionError} />}
      </ConfirmDialog>
    </>
  );
}

export default function StudentsPage() {
  return (
    <PageContainer wide title="Students" subtitle="Student accounts of the selected cohort.">
      <CohortGate>{(cohort) => <CohortStudents cohort={cohort} />}</CohortGate>
    </PageContainer>
  );
}
