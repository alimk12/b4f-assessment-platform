export type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type TestType = 'MCQ' | 'CODING';
export type TestStatus = 'DRAFT' | 'PUBLISHED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'TERMINATED';
export type StudentTestState = 'LOCKED' | 'AVAILABLE' | AttemptStatus;
export type ClientViolationType = 'FULLSCREEN_EXIT' | 'TAB_HIDDEN' | 'COPY' | 'CUT' | 'PASTE_EXTERNAL' | 'DROP_EXTERNAL';
export type ViolationType = ClientViolationType | 'NEW_SESSION' | 'DEVICE_SWITCH';
export type ViolationGroup = 'FOCUS' | 'CLIPBOARD' | 'DEVICE' | 'SESSION';
export type CohortStatus = 'ACTIVE' | 'ARCHIVED';

/** `{ data, meta }` of every paginated list (API.md §20.3). */
export interface PageMeta { page: number; limit: number; total: number; totalPages: number }
export interface Paginated<T> { data: T[]; meta: PageMeta }
