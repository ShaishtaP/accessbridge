import { createApp } from '../src/app.js';

// Quick self-check: starts the app on a random free port (no database needed),
// calls GET /api/health, prints the result, then shuts down.
// Expect status 503 + db "disconnected" here, because this script never connects to MongoDB.
const server = createApp().listen(0, async () => {
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    console.log(`GET /api/health -> ${res.status}`, await res.json());

    const missing = await fetch(`http://localhost:${port}/api/nope`);
    console.log(`GET /api/nope   -> ${missing.status}`, await missing.json());
  } catch (err) {
    console.error('Smoke test failed:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
