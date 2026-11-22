// Local development accounts only.
// `cohorts` (instructors) and `cohort` (students) refer to SEED_COHORTS keys in seed.ts.
export interface SeedUser {
  fullName: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  cohort?: string;
  cohorts?: string[];
}

export const SEED_USERS: SeedUser[] = [
  { fullName: 'Platform Admin', email: 'admin@b4f.local', password: 'Admin123', role: 'ADMIN' as const },
  {
    fullName: 'Instructor Demo',
    email: 'instructor@b4f.local',
    password: 'Instructor123',
    role: 'INSTRUCTOR' as const,
    cohorts: ['salamiyah-8', 'salamiyah-9'],
  },
  { fullName: 'Rana Haddad', email: 'rana@b4f.local', password: 'Instructor123', role: 'INSTRUCTOR' as const, cohorts: ['homs-3'] },
  { fullName: 'Lina Saleh', email: 'lina@b4f.local', password: 'Student123', role: 'STUDENT' as const, cohort: 'salamiyah-9' },
  { fullName: 'Omar Haddad', email: 'omar@b4f.local', password: 'Student123', role: 'STUDENT' as const, cohort: 'salamiyah-9' },
  { fullName: 'Sami Khoury', email: 'sami@b4f.local', password: 'Student123', role: 'STUDENT' as const, cohort: 'homs-3' },
];
