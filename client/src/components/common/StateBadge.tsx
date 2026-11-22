const MAP: Record<string, { label: string; tone: string }> = {
  LOCKED: { label: 'Locked', tone: 'muted' },
  AVAILABLE: { label: 'Available', tone: 'primary' },
  IN_PROGRESS: { label: 'In progress', tone: 'warning' },
  SUBMITTED: { label: 'Submitted', tone: 'success' },
  EXPIRED: { label: 'Expired', tone: 'error' },
  TERMINATED: { label: 'Terminated', tone: 'terminated' },
  DRAFT: { label: 'Draft', tone: 'muted' },
  PUBLISHED: { label: 'Published', tone: 'primary' },
  MCQ: { label: 'Multiple choice', tone: 'muted' },
  CODING: { label: 'Coding', tone: 'muted' },
};

export default function StateBadge({ state }: { state: string }) {
  const item = MAP[state] ?? { label: state, tone: 'muted' };
  return <span className={`ui-badge ui-badge--${item.tone}`}>{item.label}</span>;
}
