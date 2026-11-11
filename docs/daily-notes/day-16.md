# Day 16 — SSRF guard for public sites

## Done
- `server/src/utils/netGuard.js`: resolves hostnames and refuses loopback, private, link-local (including the cloud metadata address 169.254.169.254), CGNAT, multicast and reserved ranges for IPv4 and IPv6, including IPv4-mapped IPv6.
- The worker now audits a workspace's verified public sites as well as the local demo.
- Every browser request during a scan (page, redirect hops, scripts, images) is checked against the allowlist and the DNS guard; the full redirect chain and the final URL are re-checked after navigation.
- Service workers are blocked, and navigation (30 s), page actions (15 s) and the whole scan (90 s) have time limits.
- Site ownership checks go through the same guard before connecting.
- `npm run smoke:netguard`: 24 checks, no database or internet needed.

## How
`checkFetchTarget(url)` lets the dev allowlist origins (the local demo on port 4000) through directly. Any other origin is resolved with `dns.lookup(host, { all: true })`, and the URL is refused if even one address is non-public, since the browser may connect to any of them. In the worker, a `page.route('**/*')` handler runs each request through the allowlist plus the guard, with results cached per host for the scan. After `page.goto`, `request.redirectedFrom()` walks back through the redirect chain so every hop is checked again.

## Result
- Local demo menu page: audited, 5 violations.
- `http://localhost:5000/` and `http://169.254.169.254/`: refused before the browser opens.
- `https://example.com/` as a verified origin: audited end to end through the guarded scanner (3 violations); without being a verified site it is refused.
