import Button from '../../../components/common/Button';

export interface CaseDraft { visibility: 'SAMPLE' | 'HIDDEN'; args: string; expected: string }

interface Props { index: number; value: CaseDraft; canRemove: boolean; onChange(v: CaseDraft): void; onRemove(): void }

export default function TestCaseFields({ index, value, canRemove, onChange, onRemove }: Props) {
  return (
    <div className="test-editor__case">
      <div className="test-editor__case-head">
        <strong>Test case {index + 1}</strong>
        <span style={{ display: 'flex', gap: '0.4rem' }}>
          <select aria-label="Visibility" value={value.visibility} onChange={(e) => onChange({ ...value, visibility: e.target.value as CaseDraft['visibility'] })}>
            <option value="SAMPLE">Sample (shown)</option>
            <option value="HIDDEN">Hidden</option>
          </select>
          <Button size="small" variant="secondary" onClick={onRemove} disabled={!canRemove} aria-label="Remove test case">✕</Button>
        </span>
      </div>
      <div className="ui-field">
        <label>Arguments (JSON array)</label>
        <input className="test-editor__mono" value={value.args} placeholder='[[2, 7, 11, 15], 9]' onChange={(e) => onChange({ ...value, args: e.target.value })} />
      </div>
      <div className="ui-field" style={{ marginBottom: 0 }}>
        <label>Expected output (JSON)</label>
        <input className="test-editor__mono" value={value.expected} placeholder="[0, 1]" onChange={(e) => onChange({ ...value, expected: e.target.value })} />
      </div>
    </div>
  );
}
