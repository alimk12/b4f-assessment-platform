import { StudentQuestion } from '../../../types/student.types';

interface Props {
  index: number; question: StudentQuestion; selected: number | null; isDisabled: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'failed'; onSelect(optionId: number): void;
}

const SAVE_TEXT = { idle: '', saving: 'Saving…', saved: 'Saved', failed: 'Not saved, retrying' };

export default function QuestionCard({ index, question, selected, isDisabled, saveState, onSelect }: Props) {
  return (
    <div className="ui-card">
      <div className="attempt__question-head">
        <div className="attempt__question-text">{index + 1}. {question.text}</div>
        <span className={`attempt__save attempt__save--${saveState}`}>{SAVE_TEXT[saveState]}</span>
      </div>
      {question.options.map((o) => (
        <label key={o.id} className={`attempt__option${selected === o.id ? ' attempt__option--selected' : ''}`}>
          <input type="radio" name={`q-${question.id}`} checked={selected === o.id} disabled={isDisabled} onChange={() => onSelect(o.id)} />
          {o.text}
        </label>
      ))}
    </div>
  );
}
