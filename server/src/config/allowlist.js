// Origins the audit worker is allowed to visit. Keeping audits on an explicit
// allowlist stops the API from being used to scan arbitrary or internal sites (SSRF).
const DEFAULT_ORIGINS = 'http://localhost:4000,http://127.0.0.1:4000';

export function allowedOrigins() {
  return (process.env.AUDIT_ALLOWLIST || DEFAULT_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
}

// extraOrigins are a workspace's verified sites; local dev origins are always allowed.
export function isAllowedOrigin(origin, extraOrigins = []) {
  return allowedOrigins().includes(origin) || extraOrigins.includes(origin);
}

// Checks the URL's shape only (scheme, credentials) and normalises it; the origin is checked separately.
export function parseAuditUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Enter a full URL, e.g. http://localhost:4000/menu.html' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'Only http and https URLs can be audited' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed' };
  }
  // The fragment never reaches the server, so two URLs differing only by #hash are the same page.
  url.hash = '';
  return { ok: true, url: url.toString(), origin: url.origin };
}

// Returns { ok: true, url } with a normalised URL, or { ok: false, reason }.
export function checkAuditUrl(raw, extraOrigins = []) {
  const parsed = parseAuditUrl(raw);
  if (!parsed.ok) return parsed;
  if (!isAllowedOrigin(parsed.origin, extraOrigins)) {
    return { ok: false, reason: `${parsed.origin} is not on the audit allowlist or a verified site of this workspace` };
  }
  return parsed;
}
