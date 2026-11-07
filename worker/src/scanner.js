import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { checkAuditUrl, allowedOrigins } from '../../server/src/config/allowlist.js';

const NAV_TIMEOUT_MS = 30000;

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

// Opens the page in Chromium and runs axe-core on it.
export async function scanPage(rawUrl) {
  // Defence in depth: the API validated the URL already, but the worker checks again before visiting.
  const check = checkAuditUrl(rawUrl);
  if (!check.ok) throw new Error(`Refusing to audit: ${check.reason}`);

  const origins = allowedOrigins();
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // Block every request (redirects, scripts, images) that leaves the allowlisted origins.
    await page.route('**/*', (route) => {
      const { origin } = new URL(route.request().url());
      return origins.includes(origin) ? route.continue() : route.abort('blockedbyclient');
    });

    const started = Date.now();
    const response = await page.goto(check.url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
    if (!response || !response.ok()) {
      throw new Error(`Page responded with HTTP ${response ? response.status() : 'no response'}`);
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
  } finally {
    await context.close();
  }
}
