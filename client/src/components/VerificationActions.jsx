import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Alert from './Alert.jsx';
import { labelFor } from './StatusBadge.jsx';

// Statuses a person can set by hand; "verified" and "reopened" only come from a retest.
const MANUAL_STATUSES = ['open', 'in_progress', 'fixed', 'wont_fix'];
const POLL_MS = 3000;

// Status changes and the fix-verification flow: mark fixed → request retest → verified or reopened.
export default function VerificationActions({ basePath, issue, onChange }) {
  const [status, setStatus] = useState(issue.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [job, setJob] = useState(null);

  useEffect(() => { setStatus(issue.status); }, [issue.status]);

  // While a retest job runs, poll it; once it finishes, reload the issue to show the result.
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'failed') return undefined;
    const timer = setTimeout(async () => {
      try {
        const { job: latest } = await api(`/workspaces/${issue.workspaceId}/audits/${job.id}`);
        setJob(latest);
        if (latest.status === 'done' || latest.status === 'failed') {
          setMessage(latest.status === 'done' ? 'Retest finished.' : 'Retest could not be completed.');
          onChange();
        }
      } catch (err) {
        setError(err.message);
        setJob(null);
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [job, issue.workspaceId, onChange]);

  async function run(request, doneText) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request();
      setMessage(doneText);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const saveStatus = (e) => {
    e.preventDefault();
    run(() => api(basePath, { method: 'PATCH', body: { status } }), 'Status saved.');
  };

  const requestRetest = () =>
    run(async () => {
      const data = await api(`${basePath}/retest`, { method: 'POST' });
      setJob(data.job);
    }, 'Retest queued.');

  const canRetest = issue.status === 'fixed' && issue.ruleId && issue.selector;
  const retestRunning = job && (job.status === 'queued' || job.status === 'running');

  return (
    <section aria-labelledby="actions-heading" className="mt-8">
      <h2 id="actions-heading" className="text-xl font-semibold">Verification</h2>
      <Alert>{error}</Alert>
      <p role="status" className="mt-2 text-green-900">{message}</p>

      <form onSubmit={saveStatus} className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor="issue-status" className="font-medium">Status</label>
        <select id="issue-status" value={MANUAL_STATUSES.includes(status) ? status : ''}
          onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-400 px-2 py-1">
          {!MANUAL_STATUSES.includes(status) && <option value="" disabled>{labelFor(status)}</option>}
          {MANUAL_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{labelFor(s)}</option>)}
        </select>
        <button type="submit" disabled={busy || status === issue.status || !MANUAL_STATUSES.includes(status)}
          className="rounded bg-blue-800 px-3 py-1 text-white disabled:opacity-60">
          Save status
        </button>
      </form>

      <div className="mt-4">
        <button type="button" onClick={requestRetest} disabled={busy || !canRetest || retestRunning}
          className="rounded bg-teal-800 px-3 py-1 text-white disabled:opacity-60">
          Request retest
        </button>
        {retestRunning && <span className="ml-2 text-sm">Retest {labelFor(job.status)}…</span>}
        {!canRetest && (
          <p className="mt-1 text-sm text-slate-700">
            {issue.status !== 'fixed'
              ? 'A retest is available once the issue is marked fixed.'
              : 'A retest needs an automated rule id and selector on the issue.'}
          </p>
        )}
      </div>
    </section>
  );
}
