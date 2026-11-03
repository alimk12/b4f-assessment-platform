export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '—';
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
export function formatScore(score: number | null | undefined) {
  return score === null || score === undefined ? 'Expired — not submitted' : `${score}%`;
}
export const showValue = (v: unknown) => (v === undefined ? 'undefined' : JSON.stringify(v));
