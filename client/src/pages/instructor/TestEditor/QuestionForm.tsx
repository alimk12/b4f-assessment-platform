import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { InstructorQuestion, QuestionPayload } from '../../../types/instructor.types';

interface Props { editing: InstructorQuestion | null; isLocked: boolean; isSaving: boolean; serverError: string | null; onSave(p: QuestionPayload): Promise<boolean>; onCancel(): void }

const blank = () => ({ text: '', options: [{ text: '' }, { text: '' }], correct: 0 });

export default function QuestionForm({ editing, isLocked, isSaving, serverError, onSave, onCancel }: Props) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<{ text: string }[]>(blank().options);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setText(editing.text);
      setOptions(editing.options.map((o) => ({ text: o.text })));
      setCorrect(Math.max(0, editing.options.findIndex((o) => o.isCorrect)));
    } else {
      const b = blank();
      setText(b.text); setOptions(b.options); setCorrect(b.correct);
    }
    setError(null);
  }, [editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError('Please enter the question text.');
    if (options.some((o) => !o.text.trim())) return setError('Please fill in every option.');
    setError(null);
    const ok = await onSave({ text: text.trim(), options: options.map((o, i) => ({ text: o.text.trim(), isCorrect: i === correct })) });
    if (ok && !editing) {
      const b = blank();
      setText(b.text); setOptions(b.options); setCorrect(b.correct);
    }
  };

  const remove = (i: number) => {
    setOptions((s) => s.filter((_, j) => j !== i));
    setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };

  return (
    <form className="ui-card test-editor__form" onSubmit={submit}>
      <div className="test-editor__form-title">
        <h2 style={{ margin: 0 }}>{editing ? 'Edit question' : 'New question'}</h2>
      </div>
      <fieldset disabled={isLocked} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="ui-field">
          <label htmlFor="q-text">Question</label>
          <textarea id="q-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <label>Options (choose the correct one)</label>
        {options.map((o, i) => (
          <div key={i} className="test-editor__opt-row">
            <input type="radio" name="correct" aria-label={`Option ${i + 1} is correct`} checked={correct === i} onChange={() => setCorrect(i)} />
            <input value={o.text} placeholder={`Option ${i + 1}`} onChange={(e) => setOptions((s) => s.map((x, j) => (j === i ? { text: e.target.value } : x)))} />
            <Button size="small" variant="secondary" onClick={() => remove(i)} disabled={options.length <= 2} aria-label="Remove option">✕</Button>
          </div>
        ))}
        <Button size="small" variant="secondary" onClick={() => setOptions((s) => [...s, { text: '' }])} disabled={options.length >= 6}>+ Add option</Button>
        {(error || serverError) && <div className="test-editor__error" role="alert">{error ?? serverError}</div>}
        <div className="test-editor__form-actions">
          {editing && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" isLoading={isSaving}>{editing ? 'Save changes' : 'Add question'}</Button>
        </div>
      </fieldset>
    </form>
  );
}
