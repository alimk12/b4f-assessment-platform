import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { AttemptFilters, InstructorTestSummary } from '../../../types/instructor.types';

interface Props { tests: InstructorTestSummary[]; value: AttemptFilters; onChange(f: AttemptFilters): void }

export default function AttemptsFilters({ tests, value, onChange }: Props) {
  const [search, setSearch] = useState(value.search ?? '');
  useEffect(() => setSearch(value.search ?? ''), [value.search]);
  const submit = (e: FormEvent) => { e.preventDefault(); onChange({ ...value, search }); };
  return (
    <form className="attempts-filters" onSubmit={submit}>
      <div>
        <label htmlFor="f-test">Test</label>
        <select id="f-test" value={value.testId ?? ''} onChange={(e) => onChange({ ...value, testId: e.target.value })}>
          <option value="">All tests</option>
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-status">Status</label>
        <select id="f-status" value={value.status ?? ''} onChange={(e) => onChange({ ...value, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>
      <div>
        <label htmlFor="f-search">Student name or email</label>
        <input id="f-search" value={search} placeholder="Search…" onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary">Search</Button>
    </form>
  );
}
