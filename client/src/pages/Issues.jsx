import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import StatusBadge, { labelFor } from '../components/StatusBadge.jsx';
import TextField from '../components/TextField.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// Same values the server accepts in its issue filter schema.
const STATUSES = ['open', 'in_progress', 'fixed', 'verified', 'reopened', 'wont_fix'];
const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];
const FILTER_KEYS = ['status', 'severity', 'pageId', 'wcag'];

function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">{label}</label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-slate-400 bg-white px-3 py-2">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

const toOptions = (values) => values.map((v) => ({ value: v, label: labelFor(v) }));

export default function Issues() {
  const { id } = useParams();
  // Filters live in the URL, so a filtered list can be bookmarked or shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ''])),
  );
  const [workspace, setWorkspace] = useState(null);
  const [pages, setPages] = useState([]);
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState('');
  usePageTitle(workspace ? `Issues · ${workspace.name}` : 'Issues');

  useEffect(() => {
    Promise.all([api(`/workspaces/${id}`), api(`/workspaces/${id}/pages`)])
      .then(([ws, pg]) => {
        setWorkspace(ws.workspace);
        setPages(pg.pages);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const query = searchParams.toString();
  useEffect(() => {
    setIssues(null);
    setError('');
    api(`/workspaces/${id}/issues${query ? `?${query}` : ''}`)
      .then((data) => setIssues(data.issues))
      .catch((err) => setError(err.message));
  }, [id, query]);

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  function applyFilters(e) {
    e.preventDefault();
    const next = {};
    for (const key of FILTER_KEYS) if (filters[key].trim()) next[key] = filters[key].trim();
    setSearchParams(next);
  }

  function clearFilters() {
    setFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));
    setSearchParams({});
  }

  const pageName = (pageId) => {
    const page = pages.find((p) => p.id === pageId);
    return page ? page.label || page.path : 'Unknown page';
  };

  return (
    <div className="py-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/" className="text-blue-800 underline">Workspaces</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/workspaces/${id}`} className="text-blue-800 underline">{workspace?.name || 'Workspace'}</Link>{' '}
        <span aria-hidden="true">/</span> Issues
      </nav>
      <h1 className="mt-2 text-2xl font-bold">Issues</h1>

      <form onSubmit={applyFilters} aria-labelledby="filters-heading" className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="filters-heading" className="text-lg font-semibold">Filters</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField id="filter-status" label="Status" value={filters.status} onChange={setFilter('status')} options={toOptions(STATUSES)} />
          <SelectField id="filter-severity" label="Severity" value={filters.severity} onChange={setFilter('severity')} options={toOptions(SEVERITIES)} />
          <SelectField id="filter-page" label="Page" value={filters.pageId} onChange={setFilter('pageId')}
            options={pages.map((p) => ({ value: p.id, label: p.label || p.path }))} />
          <TextField id="filter-wcag" label="WCAG criterion" value={filters.wcag} onChange={setFilter('wcag')} hint="For example 1.4.3" required={false} />
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">Apply filters</button>
          <button type="button" onClick={clearFilters} className="rounded border border-slate-400 px-4 py-2 hover:bg-slate-100">Clear</button>
        </div>
      </form>

      <Alert>{error}</Alert>

      <section aria-labelledby="results-heading" className="mt-6">
        <h2 id="results-heading" className="text-xl font-semibold">Results</h2>
        <p role="status" className="mt-1 text-sm text-slate-700">
          {issues === null ? (error ? '' : 'Loading…') : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} found`}
        </p>
        {issues?.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse bg-white text-left">
              <caption className="sr-only">Issues matching the current filters</caption>
              <thead>
                <tr className="border-b border-slate-300">
                  <th scope="col" className="p-2">Issue</th>
                  <th scope="col" className="p-2">Severity</th>
                  <th scope="col" className="p-2">Status</th>
                  <th scope="col" className="p-2">WCAG</th>
                  <th scope="col" className="p-2">Page</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-slate-200 align-top">
                    <th scope="row" className="p-2 font-normal">
                      <Link to={`/workspaces/${id}/issues/${issue.id}`} className="text-blue-800 underline">{issue.title}</Link>
                    </th>
                    <td className="p-2"><StatusBadge value={issue.severity} /></td>
                    <td className="p-2"><StatusBadge value={issue.status} /></td>
                    <td className="p-2">{issue.wcag}</td>
                    <td className="p-2">{pageName(issue.pageId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
