// Labelled input; the label is tied to the field with htmlFor/id so screen readers announce it.
export default function TextField({ id, label, type = 'text', value, onChange, autoComplete, hint }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-describedby={hintId}
        required
        className="rounded border border-slate-400 px-3 py-2"
      />
      {hint && <p id={hintId} className="text-sm text-slate-600">{hint}</p>}
    </div>
  );
}
