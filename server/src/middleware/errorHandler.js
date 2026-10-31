// Runs when no route matched the request.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Turns known library errors into clear 4xx responses.
function normalize(err) {
  // Body that is not valid JSON (thrown by express.json()).
  if (err.type === 'entity.parse.failed') return { status: 400, message: 'Request body must be valid JSON' };
  // Malformed MongoDB ObjectId in a URL, e.g. /api/things/123.
  if (err.name === 'CastError') return { status: 400, message: `Invalid ${err.path}` };
  // Unique index violation, e.g. two requests registering the same email at once.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return { status: 409, message: `That ${field} is already in use` };
  }
  return { status: err.status || err.statusCode || 500, message: err.message };
}

// Central error handler: every thrown or forwarded error ends up here.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message } = normalize(err);
  if (status >= 500) console.error(err);

  const body = { error: status >= 500 ? 'Internal server error' : message };
  if (err.details && status < 500) body.details = err.details;
  res.status(status).json(body);
}
