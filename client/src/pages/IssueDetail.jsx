import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EvidenceSection from '../components/EvidenceSection.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// One issue with its details, evidence and timeline.
export default function IssueDetail() {
  const { id, issueId } = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
  // Bumped after any change so the timeline reloads and shows the new event.
  const [timelineKey, setTimelineKey] = useState(0);
  const basePath = `/workspaces/${id}/issues/${issueId}`;
  usePageTitle(issue?.title || 'Issue');

  useEffect(() => {
    api(`/workspaces/${id}/issues/${issueId}`)
      .then((data) => setIssue(data.issue))
      .catch((err) => setError(err.message));
  }, [id, issueId]);

  return (
    <div className="py-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to={`/workspaces/${id}/issues`} className="text-blue-800 underline">Back to issues</Link>
      </nav>
      <Alert>{error}</Alert>
      {!issue && !error && <p role="status" className="mt-4">Loading…</p>}
      {issue && (
        <>
          <h1 className="mt-2 text-2xl font-bold">{issue.title}</h1>
          <dl className="mt-4 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="font-medium">Severity</dt>
            <dd><StatusBadge value={issue.severity} /></dd>
            <dt className="font-medium">Status</dt>
            <dd><StatusBadge value={issue.status} /></dd>
            <dt className="font-medium">WCAG</dt>
            <dd>{issue.wcag}</dd>
          </dl>
          {issue.description && <p className="mt-4 whitespace-pre-line text-slate-800">{issue.description}</p>}
          <EvidenceSection basePath={basePath} onAdded={() => setTimelineKey((k) => k + 1)} />
          <ActivityTimeline basePath={basePath} refreshKey={timelineKey} />
        </>
      )}
    </div>
  );
}
