import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Alert from './Alert.jsx';
import { labelFor } from './StatusBadge.jsx';

const ACTION_TEXT = {
  'issue.created': 'Issue created',
  'issue.updated': 'Issue updated',
  'evidence.added': 'Evidence added',
  'issue.retest_requested': 'Retest requested',
  'issue.retested': 'Retest finished',
};

const show = (value) => (value === '' || value === null || value === undefined ? '(empty)' : labelFor(String(value)));

// Read-only history of the issue. `refreshKey` changes whenever the page knows a new event exists.
export default function ActivityTimeline({ basePath, refreshKey }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`${basePath}/activity`).then((d) => setEvents(d.activity)).catch((err) => setError(err.message));
  }, [basePath, refreshKey]);

  return (
    <section aria-labelledby="timeline-heading" className="mt-8">
      <h2 id="timeline-heading" className="text-xl font-semibold">Timeline</h2>
      <Alert>{error}</Alert>
      {!events && !error && <p role="status">Loading timeline…</p>}
      {events?.length === 0 && <p className="mt-2 text-slate-700">No activity yet.</p>}
      <ol className="mt-2 space-y-3 border-l-2 border-slate-300 pl-4">
        {events?.map((ev) => (
          <li key={ev.id}>
            <p className="font-medium">{ACTION_TEXT[ev.action] || ev.action}</p>
            <time dateTime={ev.createdAt} className="text-sm text-slate-700">
              {new Date(ev.createdAt).toLocaleString()}
            </time>
            {ev.changes.length > 0 && (
              <ul className="mt-1 text-sm">
                {ev.changes.map((c) => (
                  <li key={c.field}>
                    <span className="font-medium">{c.field}</span>: {show(c.from)} → {show(c.to)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
