import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAlerts } from '../../context/AlertsContext';
import { useAuth } from '../../context/AuthContext';
import { useCohort } from '../../context/CohortContext';
import { cohortLabel } from '../../types/cohort.types';
import { Role } from '../../types/common.types';

interface NavItem { to: string; label: string; badge?: boolean }

const INSTRUCTOR_LINKS: NavItem[] = [
  { to: '/instructor/tests', label: 'Tests' },
  { to: '/instructor/attempts', label: 'Attempts' },
  { to: '/instructor/students', label: 'Students' },
  { to: '/instructor/alerts', label: 'Alerts', badge: true },
  { to: '/instructor/bank', label: 'Question bank' },
];

const LINKS: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/admin/cohorts', label: 'Cohorts' },
    { to: '/admin/cities', label: 'Cities' },
    { to: '/admin/instructors', label: 'Instructors' },
    ...INSTRUCTOR_LINKS,
  ],
  INSTRUCTOR: INSTRUCTOR_LINKS,
  STUDENT: [
    { to: '/student/tests', label: 'My Tests' },
    { to: '/student/results', label: 'My Results' },
  ],
};

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', INSTRUCTOR: 'Instructor', STUDENT: 'Student' };

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { cohorts, selectedCohortId, selectCohort } = useCohort();
  const { unreadCount, dangerCount } = useAlerts();
  const navigate = useNavigate();
  const isStaff = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <header className="layout__nav">
      <nav className="layout__nav-inner">
        <Link to="/" className="layout__brand">
          <span className="layout__brand-mark">B4F</span> Assessment
        </Link>
        <div className="layout__links">
          {user && LINKS[user.role].map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `layout__link${isActive ? ' layout__link--active' : ''}`}>
              {l.label}
              {l.badge && unreadCount > 0 && (
                <span className={`alerts-badge${dangerCount > 0 ? ' alerts-badge--danger' : ''}`}
                  title={`${unreadCount} unread alerts${dangerCount ? `, ${dangerCount} danger` : ''}`}>
                  {dangerCount > 0 ? '!' : ''}{unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
        {isStaff && cohorts.length > 0 && (
          <label className="cohort-select">
            <span className="cohort-select__label">Cohort</span>
            <select value={selectedCohortId ?? ''} onChange={(e) => selectCohort(Number(e.target.value))} aria-label="Cohort">
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{cohortLabel(c)}{c.status === 'ARCHIVED' ? ' (archived)' : ''}</option>
              ))}
            </select>
          </label>
        )}
        {user && (
          <div className="layout__user">
            <span>{user.fullName} <span className="layout__role">· {ROLE_LABEL[user.role]}</span></span>
            <button type="button" className="layout__signout" onClick={async () => { await signOut(); navigate('/sign-in'); }}>Sign out</button>
          </div>
        )}
      </nav>
    </header>
  );
}
