export type AlertSeverity = 'DANGER' | 'WARNING';
export type AlertType =
  | 'DEVICE_SWITCH' | 'FULLSCREEN_EXIT' | 'TAB_HIDDEN' | 'COPY' | 'CUT' | 'PASTE_EXTERNAL' | 'DROP_EXTERNAL' | 'ATTEMPT_TERMINATED';

export interface Alert {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  student: { id: number; fullName: string; email: string };
  test: { id: number; title: string };
  attemptId: number;
  cohortId: number;
  createdAt: string;
  readAt: string | null;
  readBy: { id: number; fullName: string } | null;
}
export interface AlertsQuery { severity?: AlertSeverity | ''; unread?: boolean; page?: number; limit?: number }
export interface UnreadCount { count: number; dangerCount: number }
