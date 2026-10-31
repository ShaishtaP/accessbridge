import { httpError } from '../utils/httpError.js';

// Validates req.body against a zod schema and replaces it with the cleaned data
// (trimmed, lower-cased, unknown fields removed). Failures become a 400 with per-field details.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(httpError(400, 'Validation failed', details));
    }
    req.body = result.data;
    next();
  };
}
