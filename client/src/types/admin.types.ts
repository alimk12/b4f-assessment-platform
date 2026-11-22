export interface InstructorAccount {
  id: number; fullName: string; email: string; isActive: boolean;
  cohorts: { id: number; name: string; city: string }[];
  createdAt: string;
}
export interface CreateCohortPayload { name: string; cityId: number; copyFromCohortId?: number }
export interface CreateInstructorPayload { fullName: string; email: string; password: string; cohortIds?: number[] }
export interface UpdateInstructorPayload { fullName?: string; isActive?: boolean }
export interface CohortsQuery { cityId?: number; status?: 'ACTIVE' | 'ARCHIVED'; page?: number; limit?: number }
export interface InstructorsQuery { search?: string; page?: number; limit?: number }
