import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/instructor.api';
import { Cohort } from '../types/cohort.types';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'b4f.cohortId';
const readSaved = () => { try { return Number(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } };
const save = (id: number) => { try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* ignore */ } };

interface Value {
  cohorts: Cohort[];
  selectedCohortId: number | null;
  selectedCohort: Cohort | null;
  isCohortsLoading: boolean;
  cohortsError: string | null;
  loadCohorts(): Promise<void>;
  selectCohort(cohortId: number): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** The instructor's cohorts and the one selected in the navbar (A-4). Every /instructor page uses it. */
export function CohortProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelected] = useState<number | null>(readSaved);
  const [isCohortsLoading, setIsLoading] = useState(false);
  const [cohortsError, setError] = useState<string | null>(null);

  const loadCohorts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getMyCohorts();
      setCohorts(list);
      // Keep the saved choice when it is still one of my cohorts, otherwise take the first (active first).
      setSelected((current) => {
        const keep = list.find((c) => c.id === current);
        const next = keep?.id ?? list[0]?.id ?? null;
        if (next) save(next);
        return next;
      });
    } catch (e) {
      setError(message(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isStaff = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  useEffect(() => {
    if (isStaff) loadCohorts();
    else setCohorts([]);
  }, [isStaff, user?.id, loadCohorts]);

  const value = useMemo<Value>(
    () => ({
      cohorts,
      selectedCohortId,
      selectedCohort: cohorts.find((c) => c.id === selectedCohortId) ?? null,
      isCohortsLoading,
      cohortsError,
      loadCohorts,
      selectCohort: (id: number) => { setSelected(id); save(id); },
    }),
    [cohorts, selectedCohortId, isCohortsLoading, cohortsError, loadCohorts],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCohort() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCohort must be used inside CohortProvider');
  return ctx;
}
