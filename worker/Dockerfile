# Audit worker (build context: repository root)
# The Playwright image ships Chromium and its system libraries; its tag matches the playwright package.
FROM mcr.microsoft.com/playwright:v1.65.0-noble
WORKDIR /app/worker
ENV NODE_ENV=production

COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# The scanner reuses the API's audit allowlist and SSRF guard (plain ES modules, no extra deps)
COPY server/package.json /app/server/package.json
COPY server/src/config/allowlist.js /app/server/src/config/allowlist.js
COPY server/src/utils/netGuard.js /app/server/src/utils/netGuard.js
COPY worker/src ./src

# pwuser is the non-root user provided by the Playwright image
USER pwuser
CMD ["node", "src/index.js"]
