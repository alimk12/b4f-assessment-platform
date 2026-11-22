import { BankQuery, BankTestDetail, BankTestSummary } from '../types/bank.types';
import { Paginated } from '../types/common.types';
import { InstructorProblem, InstructorQuestion, InstructorTestDetail } from '../types/instructor.types';
import { qs, request } from './http';

export const getBankTests = (q: BankQuery) => request<Paginated<BankTestSummary>>(`/instructor/bank/tests${qs({ ...q })}`);
export const getBankTest = (testId: number) => request<BankTestDetail>(`/instructor/bank/tests/${testId}`);
export const copyTest = (targetTestId: number, sourceTestId: number) =>
  request<InstructorTestDetail>(`/instructor/tests/${targetTestId}/copy-from`, { method: 'POST', body: { sourceTestId } });
export const copyQuestion = (targetTestId: number, sourceQuestionId: number) =>
  request<InstructorQuestion>(`/instructor/tests/${targetTestId}/questions/copy`, { method: 'POST', body: { sourceQuestionId } });
export const copyProblem = (targetTestId: number, sourceProblemId: number) =>
  request<InstructorProblem>(`/instructor/tests/${targetTestId}/problems/copy`, { method: 'POST', body: { sourceProblemId } });
