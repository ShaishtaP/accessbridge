import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import AuthCard from '../components/AuthCard.jsx';
import TextField from '../components/TextField.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goTo = location.state?.from || '/';
  if (user) return <Navigate to={goTo} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password.');
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(goTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Log in"
      error={error}
      submitting={submitting}
      submitLabel="Log in"
      onSubmit={handleSubmit}
      footer={<>No account yet? <Link to="/register" className="text-blue-800 underline">Register</Link></>}
    >
      <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <TextField id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
    </AuthCard>
  );
}
