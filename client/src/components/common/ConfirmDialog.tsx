import { ReactNode } from 'react';
import Button from './Button';

interface Props {
  isOpen: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export default function ConfirmDialog({ isOpen, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', isLoading, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;
  return (
    <div className="ui-dialog__backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-dialog">
        <h2>{title}</h2>
        {children}
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
