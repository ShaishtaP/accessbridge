import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { checkAuditUrl } from '../../server/src/config/allowlist.js';
import { checkFetchTarget } from '../../server/src/utils/netGuard.js';

const NAV_TIMEOUT_MS = 30000;
const ACTION_TIMEOUT_MS = 15000;
// Hard cap for a whole scan, so a page that never settles cannot hold the worker.
const SCAN_TIMEOUT_MS = 90000;

// One browser is shared by all jobs; each job gets its own isolated context (no shared cookies or storage).
let browserPromise;
function getBrowser() {
  browserPromise ??= chromium.launch();
  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = undefined;
  await browser.close();
}

// axe tags WCAG success criteria as e.g. "wcag143" → "1.4.3".
// Best-practice rules have no criterion tag and get "best-practice".
export function wcagFromTags(tags) {
  for (const tag of tags) {
    const match = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
    if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return 'best-practice';
}

// Keeps only what the app needs from axe's large result object.
function summarise(violation) {
  return {
    ruleId: violation.id,
    impact: violation.impact || 'moderate',
    wcag: wcagFromTags(violation.tags),
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      selector: node.target.join(' '),
      html: node.html.slice(0, 500),
      failureSummary: (node.failureSummary || '').slice(0, 1000),
    })),
  };
}

// Rejects after ms milliseconds; used to cap the whole scan.
function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Scan timed out after ${ms} ms`)), ms).unref());
}

// Every URL in a redirect chain, from the first request to the final one.
function redirectChain(request) {
  const chain = [];
  for (let r = request; r; r = r.redirectedFrom()) chain.unshift(r.url());
  return chain;
}

// Opens the page in Chromium and runs axe-core on it.
// extraOrigins are the workspace's verified public sites.
export async function scanPage(rawUrl, extraOrigins = []) {
  // Defence in depth: the API validated the URL already, but the worker checks again before visiting.
  const check = checkAuditUrl(rawUrl, extraOrigins);
  if (!check.ok) throw new Error(`Refusing to audit: ${check.reason}`);
  const target = await checkFetchTarget(check.url);
  if (!target.ok) throw new Error(`Refusing to audit: ${target.reason}`);

  const browser = await getBrowser();
  // Service workers could fetch outside page.route, so they are blocked.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  context.setDefaultTimeout(ACTION_TIMEOUT_MS);
  context.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

  // Same-origin requests on a public site still go through the DNS check, cached per host for this scan.
  const hostChecks = new Map();
  const isSafe = async (url) => {
    const allowed = checkAuditUrl(url, extraOrigins);
    if (!allowed.ok) return false;
    const host = new URL(url).host;
    if (!hostChecks.has(host)) hostChecks.set(host, checkFetchTarget(url).then((r) => r.ok));
    return hostChecks.get(host);
  };

  const scan = async () => {
    const page = await context.newPage();
    // Every request (redirect hops, scripts, images) must stay on an allowed origin
    // that resolves to a public address.
    await page.route('**/*', async (route) => {
      const safe = await isSafe(route.request().url()).catch(() => false);
      return safe ? route.continue() : route.abort('blockedbyclient');
    });

    const started = Date.now();
    const response = await page.goto(check.url, { waitUntil: 'load' });
    if (!response || !response.ok()) {
      throw new Error(`Page responded with HTTP ${response ? response.status() : 'no response'}`);
    }
    // Re-check the whole redirect chain and the final URL, not just the first request.
    for (const hop of [...redirectChain(response.request()), page.url()]) {
      if (!(await isSafe(hop))) throw new Error(`Refusing to audit: redirected to ${new URL(hop).origin}`);
    }

    const results = await new AxeBuilder({ page }).analyze();
    return {
      url: check.url,
      durationMs: Date.now() - started,
      engine: { name: 'axe-core', version: results.testEngine.version },
      violations: results.violations.map(summarise),
      // Rules axe could not decide on its own; useful hints for manual review.
      incompleteRuleIds: results.incomplete.map((r) => r.id),
    };
  };

  try {
    return await Promise.race([scan(), timeout(SCAN_TIMEOUT_MS)]);
  } finally {
    await context.close();
  }
}
