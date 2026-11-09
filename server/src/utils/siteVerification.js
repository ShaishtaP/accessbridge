// Ownership checks for public sites. A site counts as verified when its home page
// has <meta name="accessbridge-verification" content="TOKEN"> or when
// /.well-known/accessbridge.txt contains the token.

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024; // enough for any home page <head>, small enough to stay cheap

// Pure check, kept separate from the network code so it can be tested on its own.
export function findProof(token, { html = '', file = '' } = {}) {
  if (file.split(/\r?\n/).some((line) => line.trim() === token)) return 'file';

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const hasMeta = metaTags.some(
    (tag) =>
      /name\s*=\s*["']?accessbridge-verification["']?/i.test(tag) &&
      new RegExp(`content\s*=\s*["']?${token}["']?`).test(tag)
  );
  return hasMeta ? 'meta' : null;
}

// Fetches a URL as text without following redirects (a redirect could point
// somewhere other than the site being verified) and with a size and time limit.
async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'AccessBridge-Verifier/1.0' },
  });
  if (!res.ok) return { text: '', status: res.status };

  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return { text: Buffer.concat(chunks).toString('utf8'), status: res.status };
}

// Returns { method: 'meta' | 'file' } on success, or { method: null, reason }.
export async function checkOwnership(origin, token) {
  const results = await Promise.allSettled([
    fetchText(`${origin}/.well-known/accessbridge.txt`),
    fetchText(`${origin}/`),
  ]);
  const [file, home] = results.map((r) => (r.status === 'fulfilled' ? r.value.text : ''));

  const method = findProof(token, { html: home, file });
  if (method) return { method };

  const unreachable = results.every((r) => r.status === 'rejected');
  return {
    method: null,
    reason: unreachable
      ? 'The site could not be reached'
      : 'Verification token not found in the meta tag or /.well-known/accessbridge.txt',
  };
}
