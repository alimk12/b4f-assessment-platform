import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/students.api';
import { PageMeta } from '../types/common.types';
import { CreateStudentInput, StudentAccount, StudentsQuery, UpdateStudentInput } from '../types/students.types';
import { useCohort } from './CohortContext';

interface Value {
  students: StudentAccount[];
  studentsMeta: PageMeta | null;
  isStudentsLoading: boolean;
  studentsError: string | null;
  actionError: string | null;
  isSaving: boolean;
  loadStudents(query: StudentsQuery): Promise<void>;
  createStudent(input: CreateStudentInput): Promise<boolean>;
  updateStudent(userId: number, input: UpdateStudentInput): Promise<boolean>;
  resetPassword(userId: number, newPassword: string): Promise<boolean>;
  signOutStudent(userId: number): Promise<boolean>;
  clearActionError(): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Student accounts of the selected cohort (A-11). */
export function InstructorStudentsProvider({ children }: { children: ReactNode }) {
  const { selectedCohortId } = useCohort();
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [studentsMeta, setMeta] = useState<PageMeta | null>(null);
  const [isStudentsLoading, setIsLoading] = useState(false);
  const [studentsError, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastQuery, setLastQuery] = useState<StudentsQuery>({});

  const loadStudents = useCallback(async (q: StudentsQuery) => {
    if (!selectedCohortId) return;
    setLastQuery(q);
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.getStudents(selectedCohortId, q);
      setStudents(page.data);
      setMeta(page.meta);
    } catch (e) {
      setError(message(e));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCohortId]);

  const act = useCallback(async (fn: () => Promise<unknown>, reload = true) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await fn();
      if (reload) await loadStudents(lastQuery);
      return true;
    } catch (e) {
      setActionError(message(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [loadStudents, lastQuery]);

  const value = useMemo<Value>(() => ({
    students, studentsMeta, isStudentsLoading, studentsError, actionError, isSaving, loadStudents,
    createStudent: (input) => act(() => api.createStudent(selectedCohortId as number, input)),
    updateStudent: (id, input) => act(() => api.updateStudent(id, input)),
    resetPassword: (id, pw) => act(() => api.resetStudentPassword(id, pw), false),
    signOutStudent: (id) => act(() => api.signOutStudent(id), false),
    clearActionError: () => setActionError(null),
  }), [students, studentsMeta, isStudentsLoading, studentsError, actionError, isSaving, loadStudents, act, selectedCohortId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstructorStudents() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInstructorStudents must be used inside InstructorStudentsProvider');
  return ctx;
}
