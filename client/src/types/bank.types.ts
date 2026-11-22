import { CohortStatus, TestStatus, TestType } from './common.types';
import { InstructorTestDetail } from './instructor.types';

export interface BankTestSummary {
  id: number; title: string; type: TestType; order: number; status: TestStatus;
  cohort: { id: number; name: string; status: CohortStatus };
  city: { id: number; name: string };
  questionCount: number; problemCount: number;
  /** True when the test belongs to one of my cohorts. */
  isMine: boolean;
}
export interface BankTestDetail extends InstructorTestDetail {
  cohort: BankTestSummary['cohort']; city: BankTestSummary['city']; isMine: boolean;
}
export interface BankQuery { cityId?: number; cohortId?: number; type?: TestType | ''; search?: string; page?: number; limit?: number }
