import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { InstructorProblem, ProblemPayload } from '../../../types/instructor.types';
import TestCaseFields, { CaseDraft } from './TestCaseFields';

interface Props { editing: InstructorProblem | null; isLocked: boolean; isSaving: boolean; serverError: string | null; onSave(p: ProblemPayload): Promise<boolean>; onCancel(): void }

const newCase = (visibility: CaseDraft['visibility']): CaseDraft => ({ visibility, args: '', expected: '' });
const parse = (s: string): { ok: true; value: unknown } | { ok: false } => {
  try { return { ok: true, value: JSON.parse(s) }; } catch { return { ok: false }; }
};

export default function ProblemForm({ editing, isLocked, isSaving, serverError, onSave, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [points, setPoints] = useState('50');
  const [cases, setCases] = useState<CaseDraft[]>([newCase('SAMPLE'), newCase('HIDDEN')]);
  const [error, setError] = useState<string | null>(null);

  const reset = (p: InstructorProblem | null) => {
    setTitle(p?.title ?? '');
    setDescription(p?.description ?? '');
    setFunctionName(p?.functionName ?? '');
    setPoints(String(p?.points ?? 50));
    setCases(p ? p.testCases.map((c) => ({ visibility: c.visibility, args: JSON.stringify(c.args), expected: JSON.stringify(c.expected) })) : [newCase('SAMPLE'), newCase('HIDDEN')]);
    setError(null);
  };
  useEffect(() => reset(editing), [editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !functionName.trim()) return setError('Please fill in title, description and function name.');
    const pts = Number(points);
    if (!Number.isInteger(pts) || pts < 1) return setError('Points must be a whole number of at least 1.');
    const testCases: ProblemPayload['testCases'] = [];
    for (const [i, c] of cases.entries()) {
      const a = parse(c.args);
      const x = parse(c.expected);
      if (!a.ok || !x.ok) return setError(`Test case ${i + 1}: Please enter valid JSON.`);
      if (!Array.isArray(a.value)) return setError(`Test case ${i + 1}: Arguments must be a JSON array.`);
      testCases.push({ visibility: c.visibility, args: a.value, expected: x.value });
    }
    setError(null);
    const ok = await onSave({ title: title.trim(), description: description.trim(), functionName: functionName.trim(), points: pts, testCases });
    if (ok && !editing) reset(null);
  };

  return (
    <form className="ui-card test-editor__form" onSubmit={submit}>
      <div className="test-editor__form-title"><h2 style={{ margin: 0 }}>{editing ? 'Edit problem' : 'New problem'}</h2></div>
      <fieldset disabled={isLocked} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="ui-field"><label htmlFor="p-title">Title</label><input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="ui-field"><label htmlFor="p-desc">Description</label><textarea id="p-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="test-editor__row2">
          <div className="ui-field"><label htmlFor="p-fn">Function name</label><input id="p-fn" className="test-editor__mono" value={functionName} placeholder="twoSum" onChange={(e) => setFunctionName(e.target.value)} /></div>
          <div className="ui-field"><label htmlFor="p-pts">Points</label><input id="p-pts" type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} /></div>
        </div>
        <label>Test cases</label>
        {cases.map((c, i) => (
          <TestCaseFields key={i} index={i} value={c} canRemove={cases.length > 1}
            onChange={(v) => setCases((s) => s.map((x, j) => (j === i ? v : x)))}
            onRemove={() => setCases((s) => s.filter((_, j) => j !== i))} />
        ))}
        <Button size="small" variant="secondary" onClick={() => setCases((s) => [...s, newCase('HIDDEN')])}>+ Add test case</Button>
        {(error || serverError) && <div className="test-editor__error" role="alert">{error ?? serverError}</div>}
        <div className="test-editor__form-actions">
          {editing && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" isLoading={isSaving}>{editing ? 'Save changes' : 'Add problem'}</Button>
        </div>
      </fieldset>
    </form>
  );
}
