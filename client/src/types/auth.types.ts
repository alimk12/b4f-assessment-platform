import { CohortStatus, Role } from './common.types';

export interface UserCohort { id: number; name: string; city: string; status: CohortStatus }
export interface User {
  id: number; fullName: string; email: string; role: Role; isActive: boolean;
  /** The student's cohort (null for admins and instructors). */
  cohort: UserCohort | null;
  /** The instructor's cohorts, only from /auth/me (null otherwise). */
  cohorts?: UserCohort[] | null;
}
export interface AuthResponse { accessToken: string; user: User }
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { fullName: string; email: string; password: string; joinCode: string }
