// Labelled input; the label is tied to the field with htmlFor/id so screen readers announce it.
export default function TextField({ id, label, type = 'text', value, onChange, autoComplete, hint, required = true }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-bold">{label}</label>
      {hint && <p id={hintId} className="text-ab-secondary">{hint}</p>}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-describedby={hintId}
        required={required}
        className="ab-input w-full"
      />
    </div>
  );
}
