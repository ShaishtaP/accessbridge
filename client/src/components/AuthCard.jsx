import { useEffect, useRef } from 'react';

// Shared frame for the login and register forms. The error box is a live
// alert and receives focus, so the message is announced and seen right away.
export default function AuthCard({ title, error, submitting, submitLabel, onSubmit, footer, children }) {
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <section className="mx-auto mt-10 max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {children}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-sm">{footer}</p>
    </section>
  );
}
