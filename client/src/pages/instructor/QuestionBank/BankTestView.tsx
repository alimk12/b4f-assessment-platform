import { useState } from 'react';
import Button from '../../../components/common/Button';
import StateBadge from '../../../components/common/StateBadge';
import { BankTestDetail } from '../../../types/bank.types';
import CopyDialog, { CopyTarget } from './CopyDialog';

const json = (v: unknown) => JSON.stringify(v);

/** One bank test, read-only, with its correct options and every test case (instructors only). */
export default function BankTestView({ test, onBack }: { test: BankTestDetail; onBack(): void }) {
  const [copy, setCopy] = useState<CopyTarget | null>(null);

  return (
    <>
      <Button variant="secondary" size="small" onClick={onBack}>← Back to the bank</Button>
      <div className="ui-card bank-view__header">
        <div>
          <h2 className="bank-view__title">{test.title}</h2>
          <div className="bank-card__badges">
            <StateBadge state={test.type} /> <StateBadge state={test.status} />
            {test.cohort.status === 'ARCHIVED' && <StateBadge state="ARCHIVED" />}
            {test.isMine && <span className="bank-card__mine">Mine</span>}
          </div>
          <div className="bank-card__meta">{test.cohort.name} — {test.city.name} · {test.durationMinutes} min</div>
        </div>
        <Button onClick={() => setCopy({ kind: 'test', sourceId: test.id, label: `the whole “${test.title}”`, type: test.type })}>
          Copy whole test
        </Button>
      </div>

      {test.questions?.map((q, i) => (
        <div key={q.id} className="ui-card bank-view__item">
          <div className="bank-view__item-head">
            <strong>{i + 1}. {q.text}</strong>
            <Button size="small" variant="secondary" onClick={() => setCopy({ kind: 'question', sourceId: q.id, label: 'this question', type: 'MCQ' })}>
              Copy question
            </Button>
          </div>
          <ul className="bank-view__options">
            {q.options.map((o) => (
              <li key={o.id} className={o.isCorrect ? 'bank-view__option--correct' : undefined}>
                {o.text} {o.isCorrect && <span className="bank-view__correct">✓ correct</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {test.problems?.map((p, i) => (
        <div key={p.id} className="ui-card bank-view__item">
          <div className="bank-view__item-head">
            <strong>{i + 1}. {p.title} <span className="ui-muted">({p.points} points · <code>{p.functionName}</code>)</span></strong>
            <Button size="small" variant="secondary" onClick={() => setCopy({ kind: 'problem', sourceId: p.id, label: 'this problem', type: 'CODING' })}>
              Copy problem
            </Button>
          </div>
          <p className="bank-view__description">{p.description}</p>
          <table className="bank-view__cases">
            <thead><tr><th>Case</th><th>Arguments</th><th>Expected</th></tr></thead>
            <tbody>
              {p.testCases.map((c) => (
                <tr key={c.id}><td><StateBadge state={c.visibility === 'SAMPLE' ? 'AVAILABLE' : 'LOCKED'} /> {c.visibility.toLowerCase()}</td>
                  <td><code>{json(c.args)}</code></td><td><code>{json(c.expected)}</code></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {!test.questions?.length && !test.problems?.length && <p className="ui-muted">This test has no content yet.</p>}
      {copy && <CopyDialog target={copy} onClose={() => setCopy(null)} />}
    </>
  );
}
