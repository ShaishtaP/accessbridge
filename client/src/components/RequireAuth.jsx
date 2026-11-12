import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// Sends logged-out visitors to /login and remembers where they were going.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p role="status" className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
