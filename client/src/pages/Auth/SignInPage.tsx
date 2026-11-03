import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function SignInPage() {
  const { user, signIn, authError, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setFieldError('Please enter your email and password.');
    setFieldError(null);
    if (await signIn({ email: email.trim(), password })) navigate('/');
  };

  return (
    <div className="auth-page">
      <form className="ui-card auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-card__title">Sign in</h1>
        <p className="auth-card__subtitle">B4F Assessment Platform</p>
        {authError && <ErrorMessage message={authError} />}
        <div className="ui-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ui-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fieldError && <div className="auth-card__field-error">{fieldError}</div>}
        </div>
        <Button type="submit" className="auth-card__submit" isLoading={isAuthLoading}>Sign in</Button>
        <div className="auth-card__footer">No account yet? <Link to="/sign-up">Create a student account</Link></div>
        {import.meta.env.DEV && (
          <div className="auth-card__demo">
            Demo accounts (seed): instructor@b4f.local / Instructor123 · lina@b4f.local / Student123
          </div>
        )}
      </form>
    </div>
  );
}
