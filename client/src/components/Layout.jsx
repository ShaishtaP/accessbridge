import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:p-2">
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-xl font-bold text-blue-800">AccessBridge</Link>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-700">{user.name}</span>
              <button type="button" onClick={logout} className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100">
                Log out
              </button>
            </div>
          ) : (
            <div className="flex gap-4 text-sm">
              <Link to="/login" className="text-blue-800 underline">Log in</Link>
              <Link to="/register" className="text-blue-800 underline">Register</Link>
            </div>
          )}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </>
  );
}
