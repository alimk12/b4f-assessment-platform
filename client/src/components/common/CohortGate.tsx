import { ReactNode } from 'react';
import { useCohort } from '../../context/CohortContext';
import { Cohort } from '../../types/cohort.types';
import EmptyState from './EmptyState';
import ErrorMessage from './ErrorMessage';
import Loading from './Loading';

/**
 * Every /instructor page works inside the cohort selected in the navbar (A-4).
 * Renders its children only when a cohort is selected.
 */
export default function CohortGate({ children }: { children: (cohort: Cohort) => ReactNode }) {
  const { selectedCohort, isCohortsLoading, cohortsError, loadCohorts, cohorts } = useCohort();
  if (cohortsError) return <ErrorMessage message={cohortsError} onRetry={loadCohorts} />;
  if (!selectedCohort) {
    if (isCohortsLoading || cohorts.length > 0) return <Loading />;
    return <EmptyState title="You are not linked to a cohort yet" text="Ask the platform admin to link your account to a cohort." />;
  }
  return <>{children(selectedCohort)}</>;
}
