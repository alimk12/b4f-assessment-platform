import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'normal' | 'small';
  isLoading?: boolean;
}

export default function Button({ variant = 'primary', size = 'normal', isLoading = false, disabled, children, className = '', type = 'button', ...rest }: Props) {
  const classes = ['ui-btn', `ui-btn--${variant}`, size === 'small' ? 'ui-btn--small' : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...rest}>
      {isLoading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
