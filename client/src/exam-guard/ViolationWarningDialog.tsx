import Button from '../components/common/Button';
import './ExamGuard.css';

export default function ViolationWarningDialog({ warning, onReturn }: { warning: string | null; onReturn: () => void }) {
  if (!warning) return null;
  return (
    <div className="ui-dialog__backdrop" role="alertdialog" aria-modal="true" aria-label="Warning">
      <div className="ui-dialog exam-guard-dialog">
        <h2 className="exam-guard-dialog__title">Warning</h2>
        <p>{warning}</p>
        <div className="ui-dialog__actions">
          <Button onClick={onReturn}>Return to full screen</Button>
        </div>
      </div>
    </div>
  );
}
