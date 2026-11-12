// Coloured pill for job and issue states. The text carries the meaning; colour only reinforces it.
const COLOURS = {
  queued: 'bg-slate-100 text-slate-800',
  running: 'bg-blue-100 text-blue-900',
  done: 'bg-green-100 text-green-900',
  failed: 'bg-red-100 text-red-900',
  open: 'bg-amber-100 text-amber-900',
  in_progress: 'bg-blue-100 text-blue-900',
  fixed: 'bg-teal-100 text-teal-900',
  verified: 'bg-green-100 text-green-900',
  reopened: 'bg-red-100 text-red-900',
  wont_fix: 'bg-slate-100 text-slate-800',
  critical: 'bg-red-100 text-red-900',
  serious: 'bg-orange-100 text-orange-900',
  moderate: 'bg-amber-100 text-amber-900',
  minor: 'bg-slate-100 text-slate-800',
};

export const labelFor = (value) => value.replace('_', ' ');

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-sm font-medium capitalize ${COLOURS[value] || ''}`}>
      {labelFor(value)}
    </span>
  );
}
