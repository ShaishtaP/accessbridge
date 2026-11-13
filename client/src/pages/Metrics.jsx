import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import { labelFor } from '../components/StatusBadge.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

const ms = (value) => {
  if (value === null || value === undefined) return '–';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
};

// One headline number with its label and a short line of context.
function StatTile({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-sm font-medium text-slate-700">{label}</dt>
      <dd className="mt-1 text-3xl font-bold text-slate-900">{value}</dd>
      {detail && <dd className="mt-1 text-sm text-slate-600">{detail}</dd>}
    </div>
  );
}

// Two-column table for a { key: count } object.
function CountTable({ caption, label, counts }) {
  return (
    <table className="w-full border-collapse bg-white text-left">
      <caption className="mb-2 text-left font-semibold">{caption}</caption>
      <thead>
        <tr className="border-b border-slate-300">
          <th scope="col" className="p-2">{label}</th>
          <th scope="col" className="p-2 text-right">Issues</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(counts).map(([key, count]) => (
          <tr key={key} className="border-b border-slate-200">
            <th scope="row" className="p-2 font-normal capitalize">{labelFor(key)}</th>
            <td className="p-2 text-right tabular-nums">{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TIMING_COLUMNS = ['count', 'avg', 'p50', 'p95', 'max'];

export default function Metrics() {
  const { id } = useParams();
  const [metrics, setMetrics] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  usePageTitle(workspaceName ? `Metrics · ${workspaceName}` : 'Metrics');

  const load = useCallback(() => {
    setError('');
    api(`/workspaces/${id}/metrics`)
      .then((data) => {
        setMetrics(data.metrics);
        setUpdatedAt(new Date());
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
    api(`/workspaces/${id}`).then((data) => setWorkspaceName(data.workspace.name)).catch(() => {});
  }, [id, load]);

  const { recall, fixes, audits, api: latency, issues } = metrics || {};

  return (
    <div className="py-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/" className="text-blue-800 underline">Workspaces</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/workspaces/${id}`} className="text-blue-800 underline">{workspaceName || 'Workspace'}</Link>{' '}
        <span aria-hidden="true">/</span> Metrics
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <button type="button" onClick={load} className="rounded border border-slate-400 px-3 py-1 hover:bg-slate-100">
          Refresh
        </button>
      </div>
      <p role="status" className="mt-1 text-sm text-slate-600">
        {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : error ? '' : 'Loading…'}
      </p>
      <Alert>{error}</Alert>

      {metrics && (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Recall on seeded defects"
              value={recall ? `${recall.rate}%` : '–'}
              detail={recall ? `${recall.found} of ${recall.automatable} automatable defects found` : 'No demo pages in this workspace'}
            />
            <StatTile label="Verified fixes" value={fixes.verified}
              detail={`${fixes.awaitingRetest} awaiting retest · ${fixes.reopened} reopened`} />
            <StatTile label="Audit scan time (p95)" value={ms(audits.scanMs.p95)}
              detail={`${audits.done} audits done · ${audits.failed} failed`} />
            <StatTile label="API latency (p95)" value={ms(latency.p95)}
              detail={`Last ${latency.count} requests since the server started`} />
          </dl>

          <section aria-labelledby="issues-heading" className="mt-8">
            <h2 id="issues-heading" className="text-xl font-semibold">Issues ({issues.total})</h2>
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
              <CountTable caption="Issues by status" label="Status" counts={issues.byStatus} />
              <CountTable caption="Issues by severity" label="Severity" counts={issues.bySeverity} />
            </div>
          </section>

          <section aria-labelledby="timing-heading" className="mt-8">
            <h2 id="timing-heading" className="text-xl font-semibold">Timings</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse bg-white text-left">
                <caption className="sr-only">Audit and API timings in milliseconds or seconds</caption>
                <thead>
                  <tr className="border-b border-slate-300">
                    <th scope="col" className="p-2">Measure</th>
                    {TIMING_COLUMNS.map((c) => (
                      <th key={c} scope="col" className="p-2 text-right">{c === 'avg' ? 'Average' : c === 'count' ? 'Samples' : c.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Audit scan (browser + axe-core)', audits.scanMs],
                    ['Audit total (queue + scan)', audits.totalMs],
                    ['API request', latency],
                  ].map(([name, stats]) => (
                    <tr key={name} className="border-b border-slate-200">
                      <th scope="row" className="p-2 font-normal">{name}</th>
                      {TIMING_COLUMNS.map((c) => (
                        <td key={c} className="p-2 text-right tabular-nums">{c === 'count' ? stats.count : ms(stats[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {recall && (
            <section aria-labelledby="recall-heading" className="mt-8">
              <h2 id="recall-heading" className="text-xl font-semibold">Recall details</h2>
              <p className="mt-1 text-slate-700">
                {recall.seededTotal} seeded defects sit on this workspace's demo pages; {recall.automatable} of them are detectable by an
                automated rule. The rest need manual testing.
              </p>
              {recall.missed.length === 0 ? (
                <p className="mt-2">Every automatable seeded defect has a matching issue.</p>
              ) : (
                <>
                  <h3 className="mt-4 font-semibold">Not found yet ({recall.missed.length})</h3>
                  <ul className="mt-2 list-disc pl-6">
                    {recall.missed.map((d) => (
                      <li key={d.id}>
                        <span className="font-medium">{d.id}</span> on {d.page}: <code>{d.axeRule}</code>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
