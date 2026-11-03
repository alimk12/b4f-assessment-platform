import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/student.api';
import { StudentResult, StudentTestCard } from '../types/student.types';

interface Value {
  tests: StudentTestCard[];
  isTestsLoading: boolean;
  testsError: string | null;
  loadTests(): Promise<void>;
  currentTest: StudentTestCard | null;
  isTestLoading: boolean;
  testError: string | null;
  loadTest(testId: number): Promise<void>;
  results: StudentResult[];
  isResultsLoading: boolean;
  resultsError: string | null;
  loadResults(): Promise<void>;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export function StudentTestsProvider({ children }: { children: ReactNode }) {
  const [tests, setTests] = useState<StudentTestCard[]>([]);
  const [isTestsLoading, setIsTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState<string | null>(null);
  const [currentTest, setCurrentTest] = useState<StudentTestCard | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const loadTests = useCallback(async () => {
    setIsTestsLoading(true);
    setTestsError(null);
    try {
      setTests(await api.getStudentTests());
    } catch (e) {
      setTestsError(message(e));
    } finally {
      setIsTestsLoading(false);
    }
  }, []);

  const loadTest = useCallback(async (id: number) => {
    setIsTestLoading(true);
    setTestError(null);
    setCurrentTest(null);
    try {
      setCurrentTest(await api.getStudentTest(id));
    } catch (e) {
      setTestError(message(e));
    } finally {
      setIsTestLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setIsResultsLoading(true);
    setResultsError(null);
    try {
      setResults(await api.getResults());
    } catch (e) {
      setResultsError(message(e));
    } finally {
      setIsResultsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ tests, isTestsLoading, testsError, loadTests, currentTest, isTestLoading, testError, loadTest, results, isResultsLoading, resultsError, loadResults }),
    [tests, isTestsLoading, testsError, loadTests, currentTest, isTestLoading, testError, loadTest, results, isResultsLoading, resultsError, loadResults],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudentTests() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudentTests must be used inside StudentTestsProvider');
  return ctx;
}
