# Demo site with seeded accessibility defects (build context: repository root)
FROM node:22-alpine
WORKDIR /app
COPY demo-site/ ./
# Listen on all interfaces inside the container so the port can be published
ENV DEMO_HOST=0.0.0.0 DEMO_PORT=4000
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/ > /dev/null || exit 1
CMD ["node", "server.js"]
