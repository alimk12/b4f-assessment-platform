import { Paginated } from '../types/common.types';
import { CreateStudentInput, StudentAccount, StudentsQuery, UpdateStudentInput } from '../types/students.types';
import { qs, request } from './http';

export const getStudents = (cohortId: number, q: StudentsQuery) =>
  request<Paginated<StudentAccount>>(`/instructor/cohorts/${cohortId}/students${qs({ ...q })}`);
export const createStudent = (cohortId: number, p: CreateStudentInput) =>
  request<StudentAccount>(`/instructor/cohorts/${cohortId}/students`, { method: 'POST', body: p });
export const updateStudent = (userId: number, p: UpdateStudentInput) =>
  request<StudentAccount>(`/instructor/students/${userId}`, { method: 'PATCH', body: p });
export const resetStudentPassword = (userId: number, newPassword: string) =>
  request<null>(`/instructor/students/${userId}/reset-password`, { method: 'POST', body: { newPassword } });
export const signOutStudent = (userId: number) => request<null>(`/instructor/students/${userId}/sign-out`, { method: 'POST' });
