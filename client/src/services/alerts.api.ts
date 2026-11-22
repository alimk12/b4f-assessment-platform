import { Alert, AlertsQuery, UnreadCount } from '../types/alert.types';
import { Paginated } from '../types/common.types';
import { qs, request } from './http';

export const getAlerts = (cohortId: number, q: AlertsQuery) =>
  request<Paginated<Alert>>(`/instructor/alerts${qs({ cohortId, severity: q.severity, unread: q.unread || undefined, page: q.page, limit: q.limit })}`);
export const getUnreadCount = (cohortId?: number) => request<UnreadCount>(`/instructor/alerts/unread-count${qs({ cohortId })}`);
export const markAlertRead = (alertId: number) => request<Alert>(`/instructor/alerts/${alertId}/read`, { method: 'PATCH' });
export const markAllAlertsRead = (cohortId: number) =>
  request<{ updated: number }>(`/instructor/alerts/read-all${qs({ cohortId })}`, { method: 'PATCH' });
