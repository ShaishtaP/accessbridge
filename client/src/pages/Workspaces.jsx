import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import TextField from '../components/TextField.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// Dashboard home: the workspaces the user belongs to, plus a form to create one.
export default function Workspaces() {
  usePageTitle('Workspaces');
  const [workspaces, setWorkspaces] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api('/workspaces')
      .then((data) => setWorkspaces(data.workspaces))
      .catch((err) => setError(err.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return setFormError('Enter a workspace name.');
    setFormError('');
    setSaving(true);
    try {
      const body = { name };
      if (description.trim()) body.description = description;
      const { workspace } = await api('/workspaces', { method: 'POST', body });
      // The creator is always the owner.
      setWorkspaces((list) => [{ ...workspace, myRole: 'owner' }, ...(list || [])]);
      setName('');
      setDescription('');
      setStatus(`Workspace "${workspace.name}" created.`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold">Workspaces</h1>
      <Alert>{error}</Alert>

      <section aria-labelledby="ws-list" className="mt-6">
        <h2 id="ws-list" className="text-xl font-semibold">Your workspaces</h2>
        {workspaces === null && !error && <p role="status" className="mt-2">Loading…</p>}
        {workspaces?.length === 0 && <p className="mt-2 text-slate-700">No workspaces yet. Create one below.</p>}
        {workspaces?.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <li key={ws.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <Link to={`/workspaces/${ws.id}`} className="text-lg font-semibold text-blue-800 underline">
                  {ws.name}
                </Link>
                {ws.description && <p className="mt-1 text-slate-700">{ws.description}</p>}
                <p className="mt-2 text-sm text-slate-600">
                  Your role: <span className="font-medium capitalize">{ws.myRole}</span> · {ws.members.length}{' '}
                  {ws.members.length === 1 ? 'member' : 'members'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ws-create" className="mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="ws-create" className="text-xl font-semibold">Create a workspace</h2>
        <Alert>{formError}</Alert>
        <form onSubmit={handleCreate} noValidate className="mt-3 flex flex-col gap-4">
          <TextField id="ws-name" label="Name" value={name} onChange={setName} />
          <TextField id="ws-description" label="Description (optional)" value={description} onChange={setDescription} required={false} />
          <button type="submit" disabled={saving} className="self-start rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
        <p role="status" className="mt-2 text-sm text-green-800">{status}</p>
      </section>
    </div>
  );
}
