import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import workspacesRouter from './routes/workspaces.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { trackLatency } from './middleware/latency.js';

// Builds the Express app without starting it, so tests can reuse it.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use('/api', trackLatency);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspacesRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
