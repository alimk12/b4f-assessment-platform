/** The StudentAccount shape of API.md §20.4 (instructor's Students page). */
export interface StudentAccount {
  id: number; fullName: string; email: string; isActive: boolean; cohortId: number;
  attemptCount: number; lastSignInAt: string | null; createdAt: string;
}
export interface StudentsQuery { search?: string; status?: 'ACTIVE' | 'DISABLED' | ''; page?: number; limit?: number }
export interface CreateStudentInput { fullName: string; email: string; password: string }
export interface UpdateStudentInput { fullName?: string; email?: string; isActive?: boolean }
