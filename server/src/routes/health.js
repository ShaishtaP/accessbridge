import { Router } from 'express';
import { dbStatus } from '../config/db.js';

const router = Router();

// GET /api/health — quick check that the API and database are up.
router.get('/', (req, res) => {
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    db,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
