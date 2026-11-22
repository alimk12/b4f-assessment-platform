import Button from '../../../components/common/Button';
import StateBadge from '../../../components/common/StateBadge';
import { Alert } from '../../../types/alert.types';
import { formatDateTime } from '../../../utils/format';

interface Props { alert: Alert; onRead(): void; onOpen(): void }

export default function AlertRow({ alert, onRead, onOpen }: Props) {
  const tone = alert.severity === 'DANGER' ? 'danger' : 'warning';
  return (
    <div className={`ui-card alerts-row alerts-row--${tone}${alert.readAt ? ' alerts-row--read' : ''}`}>
      <div className="alerts-row__main">
        <div className="alerts-row__head">
          <StateBadge state={alert.severity} />
          {!alert.readAt && <span className="alerts-row__new">New</span>}
          <span className="alerts-row__time">{formatDateTime(alert.createdAt)}</span>
        </div>
        <div className="alerts-row__message">{alert.message}</div>
        <div className="alerts-row__meta">
          {alert.student.email}
          {alert.readAt && alert.readBy && <> · Read by {alert.readBy.fullName}, {formatDateTime(alert.readAt)}</>}
        </div>
      </div>
      <div className="alerts-row__actions">
        <Button variant="secondary" size="small" onClick={onOpen}>View attempt</Button>
        {!alert.readAt && <Button variant="secondary" size="small" onClick={onRead}>Mark as read</Button>}
      </div>
    </div>
  );
}
