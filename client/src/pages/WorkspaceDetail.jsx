import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TextField from '../components/TextField.jsx';
import SitesSection from '../components/SitesSection.jsx';
import MembersSection from '../components/MembersSection.jsx';
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

  // A newly verified (or removed) site changes which page URLs the server accepts.
  const refreshOrigins = useCallback(
    () => api(`/workspaces/${id}/pages`).then((pg) => setAllowedOrigins(pg.allowedOrigins)).catch(() => {}),
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

  // Critical issues that still need work; refreshed whenever audits finish.
  const [criticalCount, setCriticalCount] = useState(0);
  useEffect(() => {
    if (hasPending) return;
    api(`/workspaces/${id}/issues?severity=critical`)
      .then((data) => setCriticalCount(data.issues.filter((i) => !['verified', 'wont_fix'].includes(i.status)).length))
      .catch(() => {});
  }, [id, hasPending]);

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
      <nav aria-label="Breadcrumb" className="text-base">
        <Link to="/">Workspaces</Link> <span aria-hidden="true">/</span> {workspace.name}
      </nav>
      <h1 className="mt-2 text-4xl font-bold">{workspace.name}</h1>
      {workspace.description && <p className="mt-1 text-ab-secondary">{workspace.description}</p>}
      <p className="mt-3">
        <Link to={`/workspaces/${id}/issues`} className="font-bold">View issues</Link>{' '}
        <span aria-hidden="true">·</span>{' '}
        <Link to={`/workspaces/${id}/metrics`} className="font-bold">View metrics</Link>
      </p>
      {criticalCount > 0 && (
        <div className="mt-4 border-l-[5px] border-ab-red py-2 pl-4">
          <strong>
            {criticalCount} critical {criticalCount === 1 ? 'issue needs' : 'issues need'} fixing.
          </strong>{' '}
          <Link to={`/workspaces/${id}/issues?severity=critical`}>View critical issues</Link>
        </div>
      )}

      {/* One polite live region announces adds, removals and queued audits. */}
      <p role="status" className="mt-3 text-base">{status}</p>

      <section aria-labelledby="pages-heading" className="mt-6">
        <h2 id="pages-heading" className="text-2xl font-bold">Pages to audit</h2>
        {pages.length === 0 ? (
          <p className="mt-2 text-ab-secondary">No pages yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse bg-white text-left">
              <caption className="sr-only">Pages in this workspace and their latest audit</caption>
              <thead>
                <tr className="border-b border-ab-border">
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
                    <tr key={page.id} className="border-b border-ab-border align-top">
                      <th scope="row" className="p-2 font-normal">
                        <span className="font-bold">{name}</span>
                        <span className="block text-base break-all text-ab-secondary">{page.url}</span>
                      </th>
                      <td className="p-2">
                        {job ? <StatusBadge value={job.status} /> : <span className="text-ab-secondary">Never audited</span>}
                        {job && <span className="block text-base text-ab-secondary">{jobSummary(job)}</span>}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleAudit(page)} disabled={busy} aria-label={`Run audit on ${name}`}
                            className="ab-btn ab-btn-small">
                            {busy ? 'Audit in progress' : 'Run audit'}
                          </button>
                          {canManage && (
                            <button type="button" onClick={() => handleRemove(page)} aria-label={`Remove ${name}`}
                              className="ab-btn ab-btn-warning ab-btn-small">
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
          <form onSubmit={handleAddPage} noValidate className="ab-panel mt-4 max-w-md">
            <h3 className="text-xl font-bold">Add a page</h3>
            <Alert>{formError}</Alert>
            <div className="mt-3 flex flex-col gap-4">
              <TextField id="page-url" label="Page URL" type="url" value={url} onChange={setUrl}
                hint={`Allowed origins: ${allowedOrigins.join(', ') || 'none'}`} />
              <TextField id="page-label" label="Label (optional)" value={label} onChange={setLabel} required={false} />
              <button type="submit" className="ab-btn self-start">
                Add page
              </button>
            </div>
          </form>
        )}
      </section>

      <SitesSection workspaceId={id} canManage={canManage} onSitesChange={refreshOrigins} announce={setStatus} />
      <MembersSection workspace={workspace} canManage={canManage} onWorkspaceChange={setWorkspace} announce={setStatus} />
    </div>
  );
}
