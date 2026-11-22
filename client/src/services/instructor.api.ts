import {
  AttemptFilters, InstructorAttemptDetail, InstructorAttemptRow, InstructorProblem, InstructorQuestion,
  InstructorTestDetail, InstructorTestSummary, ProblemPayload, QuestionPayload,
} from '../types/instructor.types';
import { Cohort } from '../types/cohort.types';
import { qs, request } from './http';

export const getMyCohorts = () => request<Cohort[]>('/instructor/cohorts');
export const getInstructorTests = (cohortId: number) => request<InstructorTestSummary[]>(`/instructor/tests${qs({ cohortId })}`);
export const getInstructorTest = (id: number) => request<InstructorTestDetail>(`/instructor/tests/${id}`);
export const publishTest = (id: number) => request<InstructorTestSummary>(`/instructor/tests/${id}/publish`, { method: 'PATCH' });
export const unpublishTest = (id: number) => request<InstructorTestSummary>(`/instructor/tests/${id}/unpublish`, { method: 'PATCH' });
export const createQuestion = (testId: number, p: QuestionPayload) => request<InstructorQuestion>(`/instructor/tests/${testId}/questions`, { method: 'POST', body: p });
export const replaceQuestion = (id: number, p: QuestionPayload) => request<InstructorQuestion>(`/instructor/questions/${id}`, { method: 'PUT', body: p });
export const deleteQuestion = (id: number) => request<{ message: string }>(`/instructor/questions/${id}`, { method: 'DELETE' });
export const createProblem = (testId: number, p: ProblemPayload) => request<InstructorProblem>(`/instructor/tests/${testId}/problems`, { method: 'POST', body: p });
export const replaceProblem = (id: number, p: ProblemPayload) => request<InstructorProblem>(`/instructor/problems/${id}`, { method: 'PUT', body: p });
export const deleteProblem = (id: number) => request<{ message: string }>(`/instructor/problems/${id}`, { method: 'DELETE' });
export const getInstructorAttempts = (cohortId: number, f: AttemptFilters) =>
  request<InstructorAttemptRow[]>(`/instructor/attempts${qs({ cohortId, testId: f.testId, status: f.status, search: f.search })}`);
export const getInstructorAttempt = (id: number) => request<InstructorAttemptDetail>(`/instructor/attempts/${id}`);
