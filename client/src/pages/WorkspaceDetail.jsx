import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TextField from '../components/TextField.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

const POLL_MS = 3000;

// Newest job per page; the API already returns jobs newest first.
function latestJobByPage(jobs) {
  const latest = {};
  for (const job of jobs) if (!latest[job.pageId]) latest[job.pageId] = job;
  return latest;
}

function jobSummary(job) {
  if (job.status === 'failed') return job.error || 'Audit failed';
  if (job.status === 'done' && job.result) {
    const { violationCount, issuesCreated } = job.result;
    return `${violationCount} rule violations, ${issuesCreated} new issues`;
  }
  return '';
}

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [pages, setPages] = useState([]);
  const [allowedOrigins, setAllowedOrigins] = useState([]);
  const [jobs, setJobs] = useState({});
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState('');
  usePageTitle(workspace?.name);

  const loadJobs = useCallback(
    () => api(`/workspaces/${id}/audits`).then((data) => setJobs(latestJobByPage(data.jobs))),
    [id],
  );

  useEffect(() => {
    Promise.all([api(`/workspaces/${id}`), api(`/workspaces/${id}/pages`), loadJobs()])
      .then(([ws, pg]) => {
        setWorkspace(ws.workspace);
        setPages(pg.pages);
        setAllowedOrigins(pg.allowedOrigins);
      })
      .catch((err) => setError(err.message));
  }, [id, loadJobs]);

  // While any audit is queued or running, refresh job states every few seconds.
  const hasPending = Object.values(jobs).some((j) => j.status === 'queued' || j.status === 'running');
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => loadJobs().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [hasPending, loadJobs]);

  if (error) return <Alert>{error}</Alert>;
  if (!workspace) return <p role="status" className="py-6">Loading…</p>;

  const myRole = workspace.members.find((m) => m.userId === user.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleAddPage(e) {
    e.preventDefault();
    if (!url.trim()) return setFormError('Enter the page URL.');
    setFormError('');
    try {
      const body = { url };
      if (label.trim()) body.label = label;
      const { page } = await api(`/workspaces/${id}/pages`, { method: 'POST', body });
      setPages((list) => [...list, page]);
      setUrl('');
      setLabel('');
      setStatus(`Page ${page.path} added.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleRemove(page) {
    if (!window.confirm(`Remove ${page.url} from this workspace?`)) return;
    try {
      await api(`/workspaces/${id}/pages/${page.id}`, { method: 'DELETE' });
      setPages((list) => list.filter((p) => p.id !== page.id));
      setStatus(`Page ${page.path} removed.`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function handleAudit(page) {
    try {
      const { job } = await api(`/workspaces/${id}/audits`, { method: 'POST', body: { pageId: page.id } });
      setJobs((all) => ({ ...all, [page.id]: job }));
      setStatus(`Audit queued for ${page.path}.`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="py-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/" className="text-blue-800 underline">Workspaces</Link> <span aria-hidden="true">/</span> {workspace.name}
      </nav>
      <h1 className="mt-2 text-2xl font-bold">{workspace.name}</h1>
      {workspace.description && <p className="mt-1 text-slate-700">{workspace.description}</p>}
      <p className="mt-3">
        <Link to={`/workspaces/${id}/issues`} className="font-semibold text-blue-800 underline">View issues</Link>
      </p>

      {/* One polite live region announces adds, removals and queued audits. */}
      <p role="status" className="mt-3 text-sm text-slate-800">{status}</p>

      <section aria-labelledby="pages-heading" className="mt-6">
        <h2 id="pages-heading" className="text-xl font-semibold">Pages to audit</h2>
        {pages.length === 0 ? (
          <p className="mt-2 text-slate-700">No pages yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse bg-white text-left">
              <caption className="sr-only">Pages in this workspace and their latest audit</caption>
              <thead>
                <tr className="border-b border-slate-300">
                  <th scope="col" className="p-2">Page</th>
                  <th scope="col" className="p-2">Latest audit</th>
                  <th scope="col" className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const job = jobs[page.id];
                  const busy = job && (job.status === 'queued' || job.status === 'running');
                  const name = page.label || page.path;
                  return (
                    <tr key={page.id} className="border-b border-slate-200 align-top">
                      <th scope="row" className="p-2 font-normal">
                        <span className="font-medium">{name}</span>
                        <span className="block text-sm break-all text-slate-600">{page.url}</span>
                      </th>
                      <td className="p-2">
                        {job ? <StatusBadge value={job.status} /> : <span className="text-slate-600">Never audited</span>}
                        {job && <span className="block text-sm text-slate-600">{jobSummary(job)}</span>}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleAudit(page)} disabled={busy} aria-label={`Run audit on ${name}`}
                            className="rounded bg-blue-700 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                            {busy ? 'Audit in progress' : 'Run audit'}
                          </button>
                          {canManage && (
                            <button type="button" onClick={() => handleRemove(page)} aria-label={`Remove ${name}`}
                              className="rounded border border-red-400 px-3 py-1 text-sm text-red-800 hover:bg-red-50">
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canManage && (
          <form onSubmit={handleAddPage} noValidate className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Add a page</h3>
            <Alert>{formError}</Alert>
            <div className="mt-3 flex flex-col gap-4">
              <TextField id="page-url" label="Page URL" type="url" value={url} onChange={setUrl}
                hint={`Allowed origins: ${allowedOrigins.join(', ') || 'none'}`} />
              <TextField id="page-label" label="Label (optional)" value={label} onChange={setLabel} required={false} />
              <button type="submit" className="self-start rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">
                Add page
              </button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="members-heading" className="mt-8">
        <h2 id="members-heading" className="text-xl font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {workspace.members.map((m) => (
            <li key={m.userId} className="flex justify-between p-3">
              <span>
                {m.name} <span className="text-sm text-slate-600">{m.email}</span>
              </span>
              <span className="capitalize text-slate-700">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
