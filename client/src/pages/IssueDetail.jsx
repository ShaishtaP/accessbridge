import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EvidenceSection from '../components/EvidenceSection.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import VerificationActions from '../components/VerificationActions.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// One issue with its details, verification actions, evidence and timeline.
export default function IssueDetail() {
  const { id, issueId } = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
  // Bumped after any change so the timeline reloads and shows the new event.
  const [timelineKey, setTimelineKey] = useState(0);
  const basePath = `/workspaces/${id}/issues/${issueId}`;
  usePageTitle(issue?.title || 'Issue');

  const loadIssue = useCallback(() => {
    api(basePath)
      .then((data) => setIssue(data.issue))
      .catch((err) => setError(err.message));
  }, [basePath]);

  useEffect(() => { loadIssue(); }, [loadIssue]);

  // After a status change or retest, refresh both the issue and its timeline.
  const handleChange = useCallback(() => {
    loadIssue();
    setTimelineKey((k) => k + 1);
  }, [loadIssue]);

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
            {issue.ruleId && (<><dt className="font-medium">Rule</dt><dd><code>{issue.ruleId}</code></dd></>)}
            {issue.selector && (<><dt className="font-medium">Element</dt><dd><code className="break-all">{issue.selector}</code></dd></>)}
          </dl>
          {issue.description && <p className="mt-4 whitespace-pre-line text-slate-800">{issue.description}</p>}
          <VerificationActions basePath={basePath} issue={issue} onChange={handleChange} />
          <EvidenceSection basePath={basePath} onAdded={() => setTimelineKey((k) => k + 1)} />
          <ActivityTimeline basePath={basePath} refreshKey={timelineKey} />
        </>
      )}
    </div>
  );
}
