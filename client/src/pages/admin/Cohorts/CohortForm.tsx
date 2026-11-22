import { FormEvent, useState } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { useAdmin } from '../../../context/AdminContext';
import { useCohort } from '../../../context/CohortContext';
import { City, cohortLabel } from '../../../types/cohort.types';

/** Create a cohort; its three DRAFT tests can be copied from any cohort (A-2). */
export default function CohortForm({ cities, onCreated }: { cities: City[]; onCreated(): void }) {
  const { createCohort, isSaving } = useAdmin();
  const { cohorts: allCohorts } = useCohort(); // ADMIN: every cohort
  const [name, setName] = useState('');
  const [cityId, setCityId] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { actionError } = useAdmin();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cityId) return setError('Please enter the cohort name and choose a city.');
    setError(null);
    const ok = await createCohort({ name: name.trim(), cityId: Number(cityId), copyFromCohortId: copyFrom ? Number(copyFrom) : undefined });
    if (ok) {
      setName('');
      setCopyFrom('');
      onCreated();
    }
  };

  return (
    <form className="ui-card admin-form" onSubmit={onSubmit} noValidate>
      <h2 className="admin-form__title">New cohort</h2>
      {actionError && <ErrorMessage message={actionError} />}
      <div className="ui-form-row">
        <div>
          <label htmlFor="co-name">Name</label>
          <input id="co-name" value={name} maxLength={60} placeholder="e.g. Cohort 9" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="co-city">City</label>
          <select id="co-city" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">Choose a city…</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="co-copy">Copy tests from</label>
          <select id="co-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            <option value="">Empty tests</option>
            {allCohorts.map((c) => <option key={c.id} value={c.id}>{cohortLabel(c)}</option>)}
          </select>
        </div>
        <Button type="submit" isLoading={isSaving}>Create cohort</Button>
      </div>
      {error && <div className="admin-form__error">{error}</div>}
    </form>
  );
}
