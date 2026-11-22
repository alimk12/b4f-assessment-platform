import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import * as api from '../services/admin.api';
import {
  CohortsQuery, CreateCohortPayload, CreateInstructorPayload, InstructorAccount, InstructorsQuery, UpdateInstructorPayload,
} from '../types/admin.types';
import { City, Cohort } from '../types/cohort.types';
import { PageMeta } from '../types/common.types';

interface Value {
  cities: City[];
  cohorts: Cohort[];
  cohortsMeta: PageMeta | null;
  instructors: InstructorAccount[];
  instructorsMeta: PageMeta | null;
  isAdminLoading: boolean;
  adminError: string | null;
  actionError: string | null;
  isSaving: boolean;
  loadCities(): Promise<void>;
  loadCohorts(q: CohortsQuery): Promise<void>;
  loadInstructors(q: InstructorsQuery): Promise<void>;
  createCity(name: string): Promise<boolean>;
  createCohort(p: CreateCohortPayload): Promise<boolean>;
  archiveCohort(id: number): Promise<boolean>;
  newJoinCode(id: number): Promise<boolean>;
  createInstructor(p: CreateInstructorPayload): Promise<boolean>;
  updateInstructor(id: number, p: UpdateInstructorPayload): Promise<boolean>;
  linkInstructor(cohortId: number, userId: number): Promise<boolean>;
  unlinkInstructor(cohortId: number, userId: number): Promise<boolean>;
  clearActionError(): void;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Cities, cohorts and instructor accounts for the admin screens (A-10). */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortsMeta, setCohortsMeta] = useState<PageMeta | null>(null);
  const [cohortsQuery, setCohortsQuery] = useState<CohortsQuery>({});
  const [instructors, setInstructors] = useState<InstructorAccount[]>([]);
  const [instructorsMeta, setInstructorsMeta] = useState<PageMeta | null>(null);
  const [instructorsQuery, setInstructorsQuery] = useState<InstructorsQuery>({});
  const [isAdminLoading, setIsLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setAdminError(null);
    try { await fn(); } catch (e) { setAdminError(message(e)); } finally { setIsLoading(false); }
  }, []);

  const loadCities = useCallback(() => load(async () => setCities(await api.getCities())), [load]);
  const loadCohorts = useCallback((q: CohortsQuery) => load(async () => {
    setCohortsQuery(q);
    const page = await api.getCohorts(q);
    setCohorts(page.data);
    setCohortsMeta(page.meta);
  }), [load]);
  const loadInstructors = useCallback((q: InstructorsQuery) => load(async () => {
    setInstructorsQuery(q);
    const page = await api.getInstructors(q);
    setInstructors(page.data);
    setInstructorsMeta(page.meta);
  }), [load]);

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

  const value = useMemo<Value>(() => {
    const reloadCohorts = async () => {
      const page = await api.getCohorts(cohortsQuery);
      setCohorts(page.data);
      setCohortsMeta(page.meta);
    };
    const reloadInstructors = async () => {
      const page = await api.getInstructors(instructorsQuery);
      setInstructors(page.data);
      setInstructorsMeta(page.meta);
    };
    const reloadCities = async () => setCities(await api.getCities());
    return {
      cities, cohorts, cohortsMeta, instructors, instructorsMeta, isAdminLoading, adminError, actionError, isSaving,
      loadCities, loadCohorts, loadInstructors,
      createCity: (name) => act(() => api.createCity(name), reloadCities),
      createCohort: (p) => act(() => api.createCohort(p), async () => { await reloadCohorts(); await reloadCities(); }),
      archiveCohort: (id) => act(() => api.archiveCohort(id), reloadCohorts),
      newJoinCode: (id) => act(() => api.newJoinCode(id), reloadCohorts),
      createInstructor: (p) => act(() => api.createInstructor(p), reloadInstructors),
      updateInstructor: (id, p) => act(() => api.updateInstructor(id, p), reloadInstructors),
      linkInstructor: (cohortId, userId) => act(() => api.linkInstructor(cohortId, userId), reloadInstructors),
      unlinkInstructor: (cohortId, userId) => act(() => api.unlinkInstructor(cohortId, userId), reloadInstructors),
      clearActionError: () => setActionError(null),
    };
  }, [cities, cohorts, cohortsMeta, instructors, instructorsMeta, isAdminLoading, adminError, actionError, isSaving,
    loadCities, loadCohorts, loadInstructors, act, cohortsQuery, instructorsQuery]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
