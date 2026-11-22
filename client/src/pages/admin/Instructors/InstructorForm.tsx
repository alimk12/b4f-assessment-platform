import { FormEvent, useState } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { useAdmin } from '../../../context/AdminContext';
import { useCohort } from '../../../context/CohortContext';
import { cohortLabel } from '../../../types/cohort.types';

export default function InstructorForm() {
  const { createInstructor, isSaving, actionError } = useAdmin();
  const { cohorts } = useCohort();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cohortIds, setCohortIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => setCohortIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return setError('Please fill in the name, email and password.');
    setError(null);
    if (await createInstructor({ fullName: fullName.trim(), email: email.trim(), password, cohortIds })) {
      setFullName('');
      setEmail('');
      setPassword('');
      setCohortIds([]);
    }
  };

  return (
    <form className="ui-card admin-form" onSubmit={onSubmit} noValidate>
      <h2 className="admin-form__title">New instructor</h2>
      {actionError && <ErrorMessage message={actionError} />}
      <div className="ui-form-row">
        <div>
          <label htmlFor="in-name">Full name</label>
          <input id="in-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="in-email">Email</label>
          <input id="in-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="in-password">Password</label>
          <input id="in-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" isLoading={isSaving}>Create instructor</Button>
      </div>
      {cohorts.some((c) => c.status === 'ACTIVE') && (
        <div className="admin-form__checks" role="group" aria-label="Cohorts">
          {cohorts.filter((c) => c.status === 'ACTIVE').map((c) => (
            <label key={c.id} className="admin-form__check">
              <input type="checkbox" checked={cohortIds.includes(c.id)} onChange={() => toggle(c.id)} /> {cohortLabel(c)}
            </label>
          ))}
        </div>
      )}
      {error && <div className="admin-form__error">{error}</div>}
    </form>
  );
}
