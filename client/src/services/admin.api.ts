import {
  CohortsQuery, CreateCohortPayload, CreateInstructorPayload, InstructorAccount, InstructorsQuery, UpdateInstructorPayload,
} from '../types/admin.types';
import { City, Cohort } from '../types/cohort.types';
import { Paginated } from '../types/common.types';
import { qs, request } from './http';

export const getCities = () => request<City[]>('/admin/cities');
export const createCity = (name: string) => request<City>('/admin/cities', { method: 'POST', body: { name } });

export const getCohorts = (q: CohortsQuery) => request<Paginated<Cohort>>(`/admin/cohorts${qs({ ...q })}`);
export const createCohort = (p: CreateCohortPayload) => request<Cohort>('/admin/cohorts', { method: 'POST', body: p });
export const archiveCohort = (id: number) => request<Cohort>(`/admin/cohorts/${id}/archive`, { method: 'PATCH' });
export const newJoinCode = (id: number) => request<Cohort>(`/admin/cohorts/${id}/join-code`, { method: 'POST' });
export const linkInstructor = (cohortId: number, userId: number) =>
  request<Cohort>(`/admin/cohorts/${cohortId}/instructors/${userId}`, { method: 'POST' });
export const unlinkInstructor = (cohortId: number, userId: number) =>
  request<Cohort>(`/admin/cohorts/${cohortId}/instructors/${userId}`, { method: 'DELETE' });

export const getInstructors = (q: InstructorsQuery) => request<Paginated<InstructorAccount>>(`/admin/instructors${qs({ ...q })}`);
export const createInstructor = (p: CreateInstructorPayload) => request<InstructorAccount>('/admin/instructors', { method: 'POST', body: p });
export const updateInstructor = (id: number, p: UpdateInstructorPayload) =>
  request<InstructorAccount>(`/admin/instructors/${id}`, { method: 'PATCH', body: p });
