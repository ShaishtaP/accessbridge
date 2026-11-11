import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { allowedOrigins } from '../config/allowlist.js';

// SSRF guard for public sites. A hostname can point anywhere, so before the app
// fetches a public URL it resolves the name and refuses private, loopback,
// link-local and other non-public addresses. Local dev origins are reached only
// through the explicit dev allowlist, never through a public site entry.

// IPv4 ranges that must never be reached from a public site URL: [first octets, prefix length].
const BLOCKED_V4 = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, includes cloud metadata 169.254.169.254
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

function v4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isBlockedV4(ip) {
  const value = v4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (v4ToInt(base) & mask);
  });
}

function isBlockedV6(ip) {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (addr === '::' || addr === '::1') return true; // unspecified, loopback
  // IPv4-mapped (::ffff:10.0.0.1) is checked as the IPv4 address it wraps.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (mapped) return isBlockedV4(mapped[1]);
  if (/^::ffff:/.test(addr)) return true; // hex-form mapped addresses: refuse rather than decode
  const first = parseInt(addr.split(':')[0] || '0', 16);
  return (
    (first & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (first & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (first & 0xff00) === 0xff00 || // ff00::/8 multicast
    addr.startsWith('64:ff9b:') || // NAT64, can wrap private IPv4
    addr.startsWith('2001:db8:') // documentation
  );
}

// True when an IP literal is not a normal public internet address.
export function isPrivateAddress(ip) {
  const version = isIP(ip.replace(/^\[|\]$/g, ''));
  if (version === 4) return isBlockedV4(ip);
  if (version === 6) return isBlockedV6(ip);
  return true; // not an IP at all: treat as unsafe
}

// Resolves every address of a hostname. Returns { ok: true, addresses } when all
// of them are public, or { ok: false, reason }.
export async function checkPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  let addresses;
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    return { ok: false, reason: `${host} could not be resolved` };
  }
  if (addresses.length === 0) return { ok: false, reason: `${host} has no addresses` };

  // One private address is enough to refuse: the browser may pick any of them.
  const blocked = addresses.find(isPrivateAddress);
  if (blocked) return { ok: false, reason: `${host} resolves to a private or reserved address` };
  return { ok: true, addresses };
}

// Checks a URL before the app connects to it. Dev allowlist origins (the local demo)
// skip the DNS check; every other origin must resolve to public addresses only.
export async function checkFetchTarget(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }
  if (allowedOrigins().includes(url.origin)) return { ok: true, dev: true };
  return checkPublicHost(url.hostname);
}
