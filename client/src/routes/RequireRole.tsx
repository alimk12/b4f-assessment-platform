import { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Loading from '../components/common/Loading';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/common.types';

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isAuthReady, signedOutReason } = useAuth();
  if (!isAuthReady) return <Loading />;
  // The server ended the session (another device, instructor, disabled): show the reason on /sign-in.
  if (!user && signedOutReason) return <Navigate to="/sign-in" replace />;
  if (!user) {
    return (
      <div className="layout__guard ui-card">
        <h2>Please sign in to continue.</h2>
        <Link to="/sign-in">Go to sign in</Link>
      </div>
    );
  }
  if (!roles.includes(user.role)) {
    return (
      <div className="layout__guard ui-card">
        <h2>You do not have permission to do this.</h2>
        <Link to="/">Back to home</Link>
      </div>
    );
  }
  return <>{children}</>;
}
