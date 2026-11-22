export const GRACE_SECONDS = 10;
export const MAX_RUNS_PER_PROBLEM = 20;
export const MAX_CODE_LENGTH = 10_000;
export const MIN_MCQ_QUESTIONS_TO_PUBLISH = 5;
export const MIN_CODING_PROBLEMS_TO_PUBLISH = 1;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MIN_SAMPLE_CASES = 1;
export const MIN_HIDDEN_CASES = 3;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_POINTS = 100;
export const FOCUS_VIOLATION_LIMIT = 2;
export const CLIPBOARD_VIOLATION_LIMIT = 3;
export const VIOLATION_DEDUPE_SECONDS = 2;
export const ATTEMPT_SESSION_HEADER = 'x-attempt-session';

// Alpha (docs/API.md §20)
export const DEVICE_SWITCH_ALLOWED = 2; // the 3rd switch terminates the attempt
export const JOIN_CODE_LENGTH = 8;
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const MSG_NO_COHORT_ACCESS = 'You do not have access to this cohort.';
export const MSG_SIGNED_OUT_OTHER_DEVICE = 'You were signed out because your account was used on another device.';
export const MSG_SIGNED_OUT = 'You were signed out. Please sign in again.';

export type RevokeReason = 'OTHER_DEVICE' | 'INSTRUCTOR' | 'PASSWORD_RESET' | 'DISABLED' | 'LOGOUT';
