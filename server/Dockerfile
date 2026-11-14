# AccessBridge API (build context: repository root)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Dependencies first so this layer stays cached until package files change
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server/src ./src

# Screenshot evidence lives in a volume mounted here; the app user must own it
RUN mkdir -p uploads && chown node:node uploads
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
