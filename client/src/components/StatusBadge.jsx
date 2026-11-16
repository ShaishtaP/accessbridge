// Tag for job, issue, site and severity states. The word carries the meaning; colour only supports it.
const COLOURS = {
  queued: 'bg-[#e5e6e7] text-[#3d4245]',
  running: 'bg-[#d2e2f1] text-[#0c2d4a]',
  done: 'bg-[#cce2d8] text-[#005a30]',
  failed: 'bg-[#f4cdc6] text-[#2a0b06]',
  open: 'bg-[#fff7bf] text-[#594d00]',
  in_progress: 'bg-[#d2e2f1] text-[#0c2d4a]',
  fixed: 'bg-[#bfe3e0] text-[#10403c]',
  verified: 'bg-[#cce2d8] text-[#005a30]',
  pending: 'bg-[#fcd6c3] text-[#6e3619]',
  reopened: 'bg-[#f4cdc6] text-[#2a0b06]',
  wont_fix: 'bg-[#e5e6e7] text-[#3d4245]',
  critical: 'bg-[#f4cdc6] text-[#2a0b06]',
  serious: 'bg-[#fcd6c3] text-[#6e3619]',
  moderate: 'bg-[#fff7bf] text-[#594d00]',
  minor: 'bg-[#e5e6e7] text-[#3d4245]',
};

const LABELS = { in_progress: 'In progress', wont_fix: "Won't fix" };

export const labelFor = (value) => LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);

export default function StatusBadge({ value }) {
  return <strong className={`ab-tag ${COLOURS[value] || ''}`}>{labelFor(value)}</strong>;
}
