import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/bank.api';
import { BankQuery, BankTestDetail, BankTestSummary } from '../types/bank.types';
import { PageMeta } from '../types/common.types';

export interface BankFilterOptions {
  cities: { id: number; name: string }[];
  cohorts: { id: number; name: string; cityId: number }[];
}

interface Value {
  filterOptions: BankFilterOptions;
  loadFilterOptions(): Promise<void>;
  tests: BankTestSummary[];
  testsMeta: PageMeta | null;
  selectedTest: BankTestDetail | null;
  isBankLoading: boolean;
  isDetailLoading: boolean;
  bankError: string | null;
  copyError: string | null;
  copyMessage: string | null;
  isCopying: boolean;
  loadTests(query: BankQuery): Promise<void>;
  loadTest(testId: number): Promise<void>;
  closeTest(): void;
  copyTest(targetTestId: number, sourceTestId: number): Promise<boolean>;
  copyQuestion(targetTestId: number, sourceQuestionId: number): Promise<boolean>;
  copyProblem(targetTestId: number, sourceProblemId: number): Promise<boolean>;
  clearCopyState(): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** The shared question bank: read every cohort's tests, copy into mine (A-12). */
export function QuestionBankProvider({ children }: { children: ReactNode }) {
  const [tests, setTests] = useState<BankTestSummary[]>([]);
  const [testsMeta, setMeta] = useState<PageMeta | null>(null);
  const [selectedTest, setSelected] = useState<BankTestDetail | null>(null);
  const [isBankLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [bankError, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [filterOptions, setFilterOptions] = useState<BankFilterOptions>({ cities: [], cohorts: [] });

  /** City and cohort choices for the filters, taken from the bank itself (instructors have no city list endpoint). */
  const loadFilterOptions = useCallback(async () => {
    try {
      const page = await api.getBankTests({ limit: 100 });
      const cities = new Map<number, { id: number; name: string }>();
      const cohorts = new Map<number, { id: number; name: string; cityId: number }>();
      page.data.forEach((t) => {
        cities.set(t.city.id, t.city);
        cohorts.set(t.cohort.id, { id: t.cohort.id, name: t.cohort.name, cityId: t.city.id });
      });
      setFilterOptions({
        cities: [...cities.values()].sort((a, b) => a.name.localeCompare(b.name)),
        cohorts: [...cohorts.values()].sort((a, b) => a.name.localeCompare(b.name)),
      });
    } catch { /* filters are optional */ }
  }, []);

  const loadTests = useCallback(async (q: BankQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.getBankTests(q);
      setTests(page.data);
      setMeta(page.meta);
    } catch (e) {
      setError(message(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTest = useCallback(async (testId: number) => {
    setIsDetailLoading(true);
    setError(null);
    try {
      setSelected(await api.getBankTest(testId));
    } catch (e) {
      setError(message(e));
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const copy = useCallback(async (fn: () => Promise<unknown>, done: string) => {
    setIsCopying(true);
    setCopyError(null);
    setCopyMessage(null);
    try {
      await fn();
      setCopyMessage(done);
      return true;
    } catch (e) {
      setCopyError(message(e));
      return false;
    } finally {
      setIsCopying(false);
    }
  }, []);

  const value = useMemo<Value>(() => ({
    filterOptions, loadFilterOptions,
    tests, testsMeta, selectedTest, isBankLoading, isDetailLoading, bankError, copyError, copyMessage, isCopying,
    loadTests, loadTest,
    closeTest: () => { setSelected(null); setCopyError(null); setCopyMessage(null); },
    copyTest: (target, source) => copy(() => api.copyTest(target, source), 'The whole test was copied into your test.'),
    copyQuestion: (target, source) => copy(() => api.copyQuestion(target, source), 'The question was copied into your test.'),
    copyProblem: (target, source) => copy(() => api.copyProblem(target, source), 'The problem was copied into your test.'),
    clearCopyState: () => { setCopyError(null); setCopyMessage(null); },
  }), [filterOptions, loadFilterOptions, tests, testsMeta, selectedTest, isBankLoading, isDetailLoading, bankError, copyError, copyMessage, isCopying, loadTests, loadTest, copy]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuestionBank() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQuestionBank must be used inside QuestionBankProvider');
  return ctx;
}
