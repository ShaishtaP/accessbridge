import { z } from 'zod';
import { isIP } from 'node:net';

// Public sites are registered by origin only (scheme + host), and must use https.
// Local and private hosts stay on the server-side dev allowlist instead.
const siteOrigin = z
  .string()
  .trim()
  .min(1, 'Site URL is required')
  .transform((value, ctx) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Enter a full URL, e.g. https://myapp.vercel.app' });
      return z.NEVER;
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    let reason = '';
    if (url.protocol !== 'https:') reason = 'Public sites must use https';
    else if (url.username || url.password) reason = 'URLs with embedded credentials are not allowed';
    else if (isIP(host)) reason = 'Register a domain name, not an IP address';
    else if (!host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local')) {
      reason = 'Register a public domain name';
    }
    if (reason) {
      ctx.addIssue({ code: 'custom', message: reason });
      return z.NEVER;
    }
    return url.origin;
  });

export const createSiteSchema = z.object({
  url: siteOrigin,
  label: z.string().trim().max(80, 'Label is too long').optional(),
});
