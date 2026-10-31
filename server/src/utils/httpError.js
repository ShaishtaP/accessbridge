// An Error with an HTTP status, so the central error handler can answer with 4xx.
export function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}
