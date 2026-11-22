import { FormEvent, useState } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { useInstructorStudents } from '../../../context/InstructorStudentsContext';
import { StudentAccount } from '../../../types/students.types';

interface Props { student?: StudentAccount; onSaved(name: string): void; onCancel?(): void }

/** Add a student, or edit the name / email of one (when `student` is given). */
export default function StudentForm({ student, onSaved, onCancel }: Props) {
  const { createStudent, updateStudent, isSaving, actionError } = useInstructorStudents();
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!student;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || (!isEdit && !password)) return setError('Please fill in all fields.');
    setError(null);
    const ok = isEdit
      ? await updateStudent(student.id, { fullName: fullName.trim(), email: email.trim() })
      : await createStudent({ fullName: fullName.trim(), email: email.trim(), password });
    if (ok) {
      onSaved(fullName.trim());
      if (!isEdit) { setFullName(''); setEmail(''); setPassword(''); }
    }
  };

  return (
    <form className="ui-card students-form" onSubmit={onSubmit} noValidate>
      <h2 className="students-form__title">{isEdit ? `Edit ${student.fullName}` : 'Add a student'}</h2>
      {actionError && <ErrorMessage message={actionError} />}
      <div className="ui-form-row">
        <div>
          <label htmlFor="st-name">Full name</label>
          <input id="st-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-email">Email</label>
          <input id="st-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {!isEdit && (
          <div>
            <label htmlFor="st-password">Password</label>
            <input id="st-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        <div className="students-form__buttons">
          <Button type="submit" isLoading={isSaving}>{isEdit ? 'Save' : 'Add student'}</Button>
          {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
        </div>
      </div>
      {error && <div className="students-form__error">{error}</div>}
    </form>
  );
}
