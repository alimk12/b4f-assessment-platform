import { ReactNode } from 'react';

interface Props { title?: string; subtitle?: ReactNode; actions?: ReactNode; wide?: boolean; children: ReactNode }

export default function PageContainer({ title, subtitle, actions, wide, children }: Props) {
  return (
    <main className={`ui-page${wide ? ' ui-page--wide' : ''}`}>
      {(title || actions) && (
        <div className="ui-page__header">
          <div>
            {title && <h1>{title}</h1>}
            {subtitle && <p className="ui-page__subtitle">{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </main>
  );
}
