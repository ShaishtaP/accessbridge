import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:p-2"
      >
        Skip to main content
      </a>
      <header className="bg-ab-text text-white">
        <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-2xl font-bold text-white no-underline hover:text-white hover:underline">
            AccessBridge
          </Link>
          {user ? (
            <div className="flex items-center gap-5 text-base">
              <span>{user.name}</span>
              <button
                type="button"
                onClick={logout}
                className="cursor-pointer text-white underline underline-offset-2 hover:decoration-[3px] focus-visible:bg-ab-yellow focus-visible:text-ab-text focus-visible:no-underline"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex gap-5 text-base">
              <Link to="/login" className="text-white hover:text-white">Log in</Link>
              <Link to="/register" className="text-white hover:text-white">Register</Link>
            </div>
          )}
        </nav>
      </header>
      {/* Blue rule under the header, as in public-service sites. */}
      <div className="mx-auto h-2 max-w-5xl bg-ab-blue" aria-hidden="true" />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-16">
        <Outlet />
      </main>
    </>
  );
}
