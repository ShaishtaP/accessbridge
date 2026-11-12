// Error message announced by screen readers as soon as it appears.
export default function Alert({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="my-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
      {children}
    </div>
  );
}
