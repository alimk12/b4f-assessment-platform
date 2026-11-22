import { CohortStatus } from './common.types';

export interface City { id: number; name: string; cohortCount: number }

/** The Cohort shape of API.md §20.4 (join code only for admins and the cohort's instructors). */
export interface Cohort {
  id: number;
  name: string;
  city: { id: number; name: string };
  joinCode: string;
  status: CohortStatus;
  studentCount: number;
  instructors: { id: number; fullName: string }[];
  createdAt: string;
  archivedAt: string | null;
}

export const cohortLabel = (c: Pick<Cohort, 'name' | 'city'>) => `${c.name} — ${c.city.name}`;
