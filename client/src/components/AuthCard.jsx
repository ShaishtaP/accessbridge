import { useEffect, useRef } from 'react';

// Shared frame for the login and register forms. The error summary is a live
// alert and receives focus, so the message is announced and seen right away.
export default function AuthCard({ title, error, submitting, submitLabel, onSubmit, footer, children }) {
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <section className="mt-10 max-w-md">
      <h1 className="mb-6 text-4xl font-bold">{title}</h1>
      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="ab-error">
          <h2 className="mb-1 text-xl">There is a problem</h2>
          <p className="font-normal text-ab-red">{error}</p>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {children}
        <button type="submit" disabled={submitting} className="ab-btn self-start">
          {submitting ? 'Please wait…' : submitLabel}
        </button>
      </form>
      <p className="mt-6">{footer}</p>
    </section>
  );
}
