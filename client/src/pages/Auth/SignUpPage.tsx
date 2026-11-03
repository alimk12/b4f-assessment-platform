import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function SignUpPage() {
  const { user, signUp, authError, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return setFieldError('Please fill in all fields.');
    setFieldError(null);
    if (await signUp({ fullName: fullName.trim(), email: email.trim(), password })) navigate('/');
  };

  return (
    <div className="auth-page">
      <form className="ui-card auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-card__title">Create account</h1>
        <p className="auth-card__subtitle">Student sign up</p>
        {authError && <ErrorMessage message={authError} />}
        <div className="ui-field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="ui-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ui-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fieldError && <div className="auth-card__field-error">{fieldError}</div>}
        </div>
        <Button type="submit" className="auth-card__submit" isLoading={isAuthLoading}>Create account</Button>
        <div className="auth-card__footer">Already have an account? <Link to="/sign-in">Sign in</Link></div>
      </form>
    </div>
  );
}
