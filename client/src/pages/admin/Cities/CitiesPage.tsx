import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import { useAdmin } from '../../../context/AdminContext';
import '../AdminPages.css';

export default function CitiesPage() {
  const { cities, loadCities, isAdminLoading, adminError, createCity, isSaving, actionError, clearActionError } = useAdmin();
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => { loadCities(); clearActionError(); }, [loadCities]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFieldError('Please enter the city name.');
    setFieldError(null);
    if (await createCity(name.trim())) setName('');
  };

  return (
    <PageContainer title="Cities" subtitle="Every city where B4F runs cohorts.">
      <form className="ui-card admin-form" onSubmit={onSubmit} noValidate>
        <h2 className="admin-form__title">Add a city</h2>
        {actionError && <ErrorMessage message={actionError} />}
        <div className="ui-form-row">
          <div>
            <label htmlFor="city-name">City name</label>
            <input id="city-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Homs" />
          </div>
          <Button type="submit" isLoading={isSaving}>Add city</Button>
        </div>
        {fieldError && <div className="admin-form__error">{fieldError}</div>}
      </form>
      {adminError && <ErrorMessage message={adminError} onRetry={loadCities} />}
      {isAdminLoading && cities.length === 0 ? <Loading /> : cities.length === 0 && !adminError ? <EmptyState title="No cities yet" /> : (
        <div className="ui-card ui-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>City</th><th>Cohorts</th></tr></thead>
            <tbody>{cities.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.cohortCount}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
