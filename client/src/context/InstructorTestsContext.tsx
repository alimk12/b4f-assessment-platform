import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/instructor.api';
import { InstructorTestDetail, InstructorTestSummary, ProblemPayload, QuestionPayload } from '../types/instructor.types';

interface Value {
  tests: InstructorTestSummary[];
  isTestsLoading: boolean;
  testsError: string | null;
  /** The three tests of one cohort (A-1). */
  loadTests(cohortId: number): Promise<void>;
  currentTest: InstructorTestDetail | null;
  isTestLoading: boolean;
  testError: string | null;
  loadTest(testId: number): Promise<void>;
  isSaving: boolean;
  actionError: string | null;
  publishTest(testId: number): Promise<boolean>;
  unpublishTest(testId: number): Promise<boolean>;
  saveQuestion(testId: number, payload: QuestionPayload, questionId?: number): Promise<boolean>;
  deleteQuestion(questionId: number): Promise<boolean>;
  saveProblem(testId: number, payload: ProblemPayload, problemId?: number): Promise<boolean>;
  deleteProblem(problemId: number): Promise<boolean>;
  clearActionError(): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export function InstructorTestsProvider({ children }: { children: ReactNode }) {
  const [tests, setTests] = useState<InstructorTestSummary[]>([]);
  const [isTestsLoading, setIsTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState<string | null>(null);
  const [currentTest, setCurrentTest] = useState<InstructorTestDetail | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testsCohortId, setTestsCohortId] = useState<number | null>(null);

  const loadTests = useCallback(async (cohortId: number) => {
    setTestsCohortId(cohortId);
    setIsTestsLoading(true);
    setTestsError(null);
    try {
      setTests(await api.getInstructorTests(cohortId));
    } catch (e) {
      setTestsError(message(e));
    } finally {
      setIsTestsLoading(false);
    }
  }, []);

  const reloadTests = useCallback(async () => {
    if (testsCohortId) setTests(await api.getInstructorTests(testsCohortId));
  }, [testsCohortId]);

  const loadTest = useCallback(async (testId: number) => {
    setIsTestLoading(true);
    setTestError(null);
    try {
      setCurrentTest(await api.getInstructorTest(testId));
    } catch (e) {
      setTestError(message(e));
    } finally {
      setIsTestLoading(false);
    }
  }, []);

  const act = useCallback(async (fn: () => Promise<unknown>, after: () => Promise<void>) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await fn();
      await after();
      return true;
    } catch (e) {
      setActionError(message(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reloadCurrent = useCallback(async () => {
    if (currentTest) setCurrentTest(await api.getInstructorTest(currentTest.id));
  }, [currentTest]);

  const value = useMemo<Value>(
    () => ({
      tests, isTestsLoading, testsError, loadTests, currentTest, isTestLoading, testError, loadTest, isSaving, actionError,
      publishTest: (id) => act(() => api.publishTest(id), reloadTests),
      unpublishTest: (id) => act(() => api.unpublishTest(id), reloadTests),
      saveQuestion: (testId, p, qid) => act(() => (qid ? api.replaceQuestion(qid, p) : api.createQuestion(testId, p)), reloadCurrent),
      deleteQuestion: (qid) => act(() => api.deleteQuestion(qid), reloadCurrent),
      saveProblem: (testId, p, pid) => act(() => (pid ? api.replaceProblem(pid, p) : api.createProblem(testId, p)), reloadCurrent),
      deleteProblem: (pid) => act(() => api.deleteProblem(pid), reloadCurrent),
      clearActionError: () => setActionError(null),
    }),
    [tests, isTestsLoading, testsError, loadTests, currentTest, isTestLoading, testError, loadTest, isSaving, actionError, act, reloadCurrent, reloadTests],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstructorTests() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInstructorTests must be used inside InstructorTestsProvider');
  return ctx;
}
