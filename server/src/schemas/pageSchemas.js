import { z } from 'zod';
import { checkAuditUrl } from '../config/allowlist.js';

// The URL is validated and normalised against the audit allowlist before it reaches the controller.
const auditUrl = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .transform((value, ctx) => {
    const result = checkAuditUrl(value);
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
