// Error message announced by screen readers as soon as it appears.
export default function Alert({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="ab-error">
      <h2 className="mb-1 text-xl">There is a problem</h2>
      <p className="font-normal text-ab-red">{children}</p>
    </div>
  );
}
