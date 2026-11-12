import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import AuthCard from '../components/AuthCard.jsx';
import TextField from '../components/TextField.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    // Same rules as the server's zod schema, checked early for a faster message.
    if (!name.trim() || !email.trim()) return setError('Enter your name and email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create an account"
      error={error}
      submitting={submitting}
      submitLabel="Register"
      onSubmit={handleSubmit}
      footer={<>Already registered? <Link to="/login" className="text-blue-800 underline">Log in</Link></>}
    >
      <TextField id="name" label="Name" value={name} onChange={setName} autoComplete="name" />
      <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <TextField
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint="At least 8 characters."
      />
    </AuthCard>
  );
}
