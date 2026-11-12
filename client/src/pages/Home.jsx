import { useAuth } from '../context/AuthContext.jsx';

// Placeholder until the dashboard lands.
export default function Home() {
  const { user } = useAuth();
  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-2 text-slate-700">Workspaces, pages and issues will appear here.</p>
    </section>
  );
}
