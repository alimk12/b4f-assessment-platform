import Button from './Button';

export default function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ui-error" role="alert">
      <span>{message}</span>
      {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
