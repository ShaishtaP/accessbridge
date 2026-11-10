import { z } from 'zod';
import { parseAuditUrl } from '../config/allowlist.js';

// The URL's shape is validated and normalised here; the controller checks its origin against
// the dev allowlist and the workspace's verified sites.
const auditUrl = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .transform((value, ctx) => {
    const result = parseAuditUrl(value);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.reason });
      return z.NEVER;
    }
    return result.url;
  });

export const createPageSchema = z.object({
  url: auditUrl,
  label: z.string().trim().max(80, 'Label is too long').optional(),
});
