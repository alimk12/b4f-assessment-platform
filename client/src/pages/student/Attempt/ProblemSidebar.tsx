import { StudentProblem } from '../../../types/student.types';

interface Props { problems: StudentProblem[]; activeId: number; onSelect(id: number): void }

export default function ProblemSidebar({ problems, activeId, onSelect }: Props) {
  return (
    <nav className="attempt__sidebar" aria-label="Problems">
      {problems.map((p, i) => (
        <button key={p.id} type="button" className={`attempt__problem-btn${p.id === activeId ? ' attempt__problem-btn--active' : ''}`} onClick={() => onSelect(p.id)}>
          <span className="attempt__problem-btn-title">{i + 1}. {p.title}</span>
          <span className={`attempt__problem-btn-state${p.submission ? ' attempt__problem-btn-state--done' : ''}`}>
            {p.submission ? `✓ Submitted · ${p.submission.points}/${p.points}` : `Not submitted · ${p.points} points`}
          </span>
        </button>
      ))}
    </nav>
  );
}
