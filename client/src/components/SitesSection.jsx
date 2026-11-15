import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Alert from './Alert.jsx';
import StatusBadge from './StatusBadge.jsx';
import TextField from './TextField.jsx';

// The workspace's own deployed sites. A site must prove ownership (meta tag or
// /.well-known file) before its pages can be added and audited.
export default function SitesSection({ workspaceId, canManage, onSitesChange, announce }) {
  const [sites, setSites] = useState([]);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [checking, setChecking] = useState('');
  const base = `/workspaces/${workspaceId}/sites`;

  useEffect(() => {
    api(base).then((data) => setSites(data.sites)).catch((err) => announce(err.message));
  }, [base, announce]);

  function replaceSite(site) {
    setSites((list) => list.map((s) => (s.id === site.id ? site : s)));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!url.trim()) return setFormError('Enter the site address.');
    setFormError('');
    try {
      const body = { url };
      if (label.trim()) body.label = label;
      const { site } = await api(base, { method: 'POST', body });
      setSites((list) => [...list, site]);
      setUrl('');
      setLabel('');
      announce(`${site.origin} added. Publish the verification token, then check it.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleVerify(site) {
    setChecking(site.id);
    try {
      const data = await api(`${base}/${site.id}/verify`, { method: 'POST' });
      replaceSite(data.site);
      announce(`${site.origin} verified. Its pages can now be audited.`);
      onSitesChange();
    } catch (err) {
      replaceSite({ ...site, lastCheckError: err.message });
      announce(`${site.origin} is not verified yet: ${err.message}`);
    } finally {
      setChecking('');
    }
  }

  async function handleRemove(site) {
    if (!window.confirm(`Remove ${site.origin}? Its pages can no longer be added.`)) return;
    try {
      await api(`${base}/${site.id}`, { method: 'DELETE' });
      setSites((list) => list.filter((s) => s.id !== site.id));
      announce(`${site.origin} removed.`);
      onSitesChange();
    } catch (err) {
      announce(err.message);
    }
  }

  return (
    <section aria-labelledby="sites-heading" className="mt-8">
      <h2 id="sites-heading" className="text-xl font-semibold">Your sites</h2>
      <p className="mt-1 text-slate-700">Deployed sites this workspace may audit, once ownership is verified.</p>

      {sites.length === 0 ? (
        <p className="mt-2 text-slate-700">No sites yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sites.map((site) => (
            <li key={site.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold break-all">
                  {site.label ? `${site.label} — ` : ''}{site.origin}
                </h3>
                <StatusBadge value={site.status} />
              </div>

              {site.status === 'verified' ? (
                <p className="mt-2 text-sm text-slate-700">
                  Verified by {site.verifiedBy === 'meta' ? 'meta tag' : 'well-known file'}
                  {site.verifiedAt && ` on ${new Date(site.verifiedAt).toLocaleDateString()}`}.
                </p>
              ) : (
                <div className="mt-2 text-sm">
                  <p>Publish one of these on the site, then check verification:</p>
                  <p className="mt-2 font-medium">Option 1: meta tag in the home page &lt;head&gt;</p>
                  <code className="mt-1 block rounded bg-slate-100 p-2 break-all">{site.verification.metaTag}</code>
                  <p className="mt-2 font-medium">Option 2: a text file containing the token</p>
                  <p className="mt-1 break-all">
                    File: <code>{site.verification.fileUrl}</code>
                    <br />
                    Token: <code>{site.verification.token}</code>
                  </p>
                  {site.lastCheckError && (
                    <p className="mt-2 text-red-800">Last check: {site.lastCheckError}</p>
                  )}
                </div>
              )}

              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {site.status !== 'verified' && (
                    <button type="button" onClick={() => handleVerify(site)} disabled={checking === site.id}
                      aria-label={`Check verification for ${site.origin}`}
                      className="rounded bg-blue-700 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                      {checking === site.id ? 'Checking…' : 'Check verification'}
                    </button>
                  )}
                  <button type="button" onClick={() => handleRemove(site)} aria-label={`Remove ${site.origin}`}
                    className="rounded border border-red-400 px-3 py-1 text-sm text-red-800 hover:bg-red-50">
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleAdd} noValidate className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Add a site</h3>
          <Alert>{formError}</Alert>
          <div className="mt-3 flex flex-col gap-4">
            <TextField id="site-url" label="Site address" type="url" value={url} onChange={setUrl}
              hint="An https domain, for example https://myapp.vercel.app" />
            <TextField id="site-label" label="Label (optional)" value={label} onChange={setLabel} required={false} />
            <button type="submit" className="self-start rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">
              Add site
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
