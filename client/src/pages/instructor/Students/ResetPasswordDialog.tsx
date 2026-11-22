import { useState } from 'react';
import Button from '../../../components/common/Button';
import ErrorMessage from '../../../components/common/ErrorMessage';
import { useInstructorStudents } from '../../../context/InstructorStudentsContext';
import { StudentAccount } from '../../../types/students.types';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function randomPassword(length = 10) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Sets a new password; the student's sessions end. The password is shown once to hand over. */
export default function ResetPasswordDialog({ student, onClose }: { student: StudentAccount; onClose(): void }) {
  const { resetPassword, isSaving, actionError } = useInstructorStudents();
  const [password, setPassword] = useState(randomPassword);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(null);
    if (await resetPassword(student.id, password)) setDone(true);
  };

  return (
    <div className="ui-dialog__backdrop" role="dialog" aria-modal="true" aria-label="Reset password">
      <div className="ui-dialog">
        <h2>Reset password — {student.fullName}</h2>
        {done ? (
          <>
            <p>The new password is set and the student was signed out of every device. Give them this password:</p>
            <p className="students-reset__password ui-code">{password}</p>
            <div className="ui-dialog__actions"><Button onClick={onClose}>Done</Button></div>
          </>
        ) : (
          <>
            {actionError && <ErrorMessage message={actionError} />}
            <div className="ui-field">
              <label htmlFor="rp-password">New password</label>
              <div className="students-reset__row">
                <input id="rp-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
                <Button variant="secondary" size="small" onClick={() => setPassword(randomPassword())}>Generate</Button>
              </div>
              {error && <div className="students-form__error">{error}</div>}
            </div>
            <div className="ui-dialog__actions">
              <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button onClick={save} isLoading={isSaving}>Set password</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
