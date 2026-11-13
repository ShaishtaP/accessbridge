import { useEffect, useState } from 'react';
import { api, fetchFileUrl } from '../lib/api.js';
import Alert from './Alert.jsx';

// Screenshot downloads need the auth header, so the image is fetched as a blob first.
function Screenshot({ file, alt }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    fetchFileUrl(file.url)
      .then((url) => { objectUrl = url; setSrc(url); })
      .catch(() => setFailed(true));
    // Release the blob when the image leaves the page.
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.url]);

  if (failed) return <p className="text-sm text-red-800">Screenshot could not be loaded.</p>;
  if (!src) return <p className="text-sm">Loading screenshot…</p>;
  return <img src={src} alt={alt} className="mt-2 max-h-80 rounded border border-slate-300" />;
}

const PhaseSelect = ({ id, value, onChange }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
    className="rounded border border-slate-400 px-2 py-1">
    <option value="before">Before fix</option>
    <option value="after">After fix</option>
  </select>
);

// Evidence is append-only: items can be added but never edited, so the original finding is preserved.
export default function EvidenceSection({ basePath, onAdded }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [notePhase, setNotePhase] = useState('before');
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [shotPhase, setShotPhase] = useState('before');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api(`${basePath}/evidence`).then((d) => setItems(d.evidence)).catch((err) => setError(err.message));

  useEffect(() => { load(); }, [basePath]);

  async function submit(e, request, reset) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request();
      reset();
      await load();
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const addNote = (e) =>
    submit(e, () => api(`${basePath}/evidence/notes`, { method: 'POST', body: { note, phase: notePhase } }),
      () => setNote(''));

  const addScreenshot = (e) => {
    const form = new FormData();
    form.append('file', file);
    form.append('caption', caption);
    form.append('phase', shotPhase);
    return submit(e, () => api(`${basePath}/evidence/screenshots`, { method: 'POST', body: form }), () => {
      setFile(null);
      setCaption('');
      e.target.reset();
    });
  };

  return (
    <section aria-labelledby="evidence-heading" className="mt-8">
      <h2 id="evidence-heading" className="text-xl font-semibold">Evidence</h2>
      <Alert>{error}</Alert>
      {!items && !error && <p role="status">Loading evidence…</p>}
      {items?.length === 0 && <p className="mt-2 text-slate-700">No evidence yet.</p>}
      <ul className="mt-2 space-y-4">
        {items?.map((ev) => (
          <li key={ev.id} className="rounded border border-slate-200 p-3">
            <p className="text-sm text-slate-700">
              {ev.kind === 'screenshot' ? 'Screenshot' : 'Keyboard note'} · {ev.phase === 'after' ? 'after fix' : 'before fix'} ·{' '}
              <time dateTime={ev.createdAt}>{new Date(ev.createdAt).toLocaleString()}</time>
            </p>
            {ev.note && <p className="mt-1 whitespace-pre-line">{ev.note}</p>}
            {ev.file && <Screenshot file={ev.file} alt={ev.note || ev.file.originalName || 'Evidence screenshot'} />}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={addNote} className="space-y-2">
          <h3 className="font-semibold">Add keyboard note</h3>
          <label htmlFor="ev-note" className="block text-sm font-medium">Keys pressed and what happened</label>
          <textarea id="ev-note" required rows={4} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-slate-400 p-2" />
          <label htmlFor="ev-note-phase" className="mr-2 text-sm font-medium">Phase</label>
          <PhaseSelect id="ev-note-phase" value={notePhase} onChange={setNotePhase} />
          <button type="submit" disabled={busy} className="ml-2 rounded bg-blue-800 px-3 py-1 text-white disabled:opacity-60">
            Add note
          </button>
        </form>

        <form onSubmit={addScreenshot} className="space-y-2">
          <h3 className="font-semibold">Upload screenshot</h3>
          <label htmlFor="ev-file" className="block text-sm font-medium">Image (PNG, JPEG or WebP, up to 5 MB)</label>
          <input id="ev-file" type="file" required accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files[0] || null)} className="block" />
          <label htmlFor="ev-caption" className="block text-sm font-medium">Caption (used as alt text)</label>
          <input id="ev-caption" value={caption} onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded border border-slate-400 px-2 py-1" />
          <label htmlFor="ev-shot-phase" className="mr-2 text-sm font-medium">Phase</label>
          <PhaseSelect id="ev-shot-phase" value={shotPhase} onChange={setShotPhase} />
          <button type="submit" disabled={busy || !file} className="ml-2 rounded bg-blue-800 px-3 py-1 text-white disabled:opacity-60">
            Upload
          </button>
        </form>
      </div>
    </section>
  );
}
