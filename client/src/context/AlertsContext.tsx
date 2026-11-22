import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ALERTS_POLL_SECONDS } from '../constants';
import * as api from '../services/alerts.api';
import { Alert, AlertsQuery } from '../types/alert.types';
import { PageMeta } from '../types/common.types';
import { useAuth } from './AuthContext';
import { useCohort } from './CohortContext';

interface Value {
  unreadCount: number;
  dangerCount: number;
  alerts: Alert[];
  alertsMeta: PageMeta | null;
  isAlertsLoading: boolean;
  alertsError: string | null;
  loadAlerts(query: AlertsQuery): Promise<void>;
  markRead(alertId: number): Promise<void>;
  markAllRead(): Promise<void>;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/** Alerts of the selected cohort, and the unread badge polled every ALERTS_POLL_SECONDS (A-7). */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedCohortId } = useCohort();
  const [unread, setUnread] = useState({ count: 0, dangerCount: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsMeta, setMeta] = useState<PageMeta | null>(null);
  const [isAlertsLoading, setIsLoading] = useState(false);
  const [alertsError, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<AlertsQuery>({});

  const isStaff = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  /** The navbar badge counts every cohort of the caller, so a danger alert in another cohort is never missed. */
  const refreshCount = useCallback(async () => {
    try { setUnread(await api.getUnreadCount()); } catch { /* the badge is best effort */ }
  }, []);

  useEffect(() => {
    if (!isStaff) { setUnread({ count: 0, dangerCount: 0 }); return; }
    refreshCount();
    const timer = setInterval(refreshCount, ALERTS_POLL_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [isStaff, user?.id, refreshCount]);

  const loadAlerts = useCallback(async (q: AlertsQuery) => {
    if (!selectedCohortId) return;
    setLastQuery(q);
    setIsLoading(true);
    setError(null);
    try {
      const page = await api.getAlerts(selectedCohortId, q);
      setAlerts(page.data);
      setMeta(page.meta);
    } catch (e) {
      setError(message(e));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCohortId]);

  const markRead = useCallback(async (alertId: number) => {
    try {
      const updated = await api.markAlertRead(alertId);
      setAlerts((list) => list.map((a) => (a.id === alertId ? updated : a)));
      await refreshCount();
    } catch (e) {
      setError(message(e));
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    if (!selectedCohortId) return;
    try {
      await api.markAllAlertsRead(selectedCohortId);
      await Promise.all([loadAlerts(lastQuery), refreshCount()]);
    } catch (e) {
      setError(message(e));
    }
  }, [selectedCohortId, loadAlerts, lastQuery, refreshCount]);

  const value = useMemo<Value>(
    () => ({
      unreadCount: unread.count, dangerCount: unread.dangerCount, alerts, alertsMeta, isAlertsLoading, alertsError,
      loadAlerts, markRead, markAllRead,
    }),
    [unread, alerts, alertsMeta, isAlertsLoading, alertsError, loadAlerts, markRead, markAllRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlerts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAlerts must be used inside AlertsProvider');
  return ctx;
}
