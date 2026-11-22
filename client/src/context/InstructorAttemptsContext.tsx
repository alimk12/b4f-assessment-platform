import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/instructor.api';
import { AttemptFilters, InstructorAttemptDetail, InstructorAttemptRow } from '../types/instructor.types';

interface Value {
  attempts: InstructorAttemptRow[];
  isAttemptsLoading: boolean;
  attemptsError: string | null;
  /** Attempts of one cohort (A-4). */
  loadAttempts(cohortId: number, filters: AttemptFilters): Promise<void>;
  selectedAttempt: InstructorAttemptDetail | null;
  isDetailLoading: boolean;
  detailError: string | null;
  loadAttemptDetail(attemptId: number): Promise<void>;
  closeDetail(): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export function InstructorAttemptsProvider({ children }: { children: ReactNode }) {
  const [attempts, setAttempts] = useState<InstructorAttemptRow[]>([]);
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<InstructorAttemptDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadAttempts = useCallback(async (cohortId: number, f: AttemptFilters) => {
    setIsAttemptsLoading(true);
    setAttemptsError(null);
    try {
      setAttempts(await api.getInstructorAttempts(cohortId, f));
    } catch (e) {
      setAttemptsError(message(e));
    } finally {
      setIsAttemptsLoading(false);
    }
  }, []);

  const loadAttemptDetail = useCallback(async (id: number) => {
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedAttempt(await api.getInstructorAttempt(id));
    } catch (e) {
      setDetailError(message(e));
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      attempts, isAttemptsLoading, attemptsError, loadAttempts, selectedAttempt, isDetailLoading, detailError, loadAttemptDetail,
      closeDetail: () => { setSelectedAttempt(null); setDetailError(null); },
    }),
    [attempts, isAttemptsLoading, attemptsError, loadAttempts, selectedAttempt, isDetailLoading, detailError, loadAttemptDetail],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstructorAttempts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInstructorAttempts must be used inside InstructorAttemptsProvider');
  return ctx;
}
