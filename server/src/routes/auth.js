import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { registerSchema, loginSchema } from '../schemas/authSchemas.js';

const router = Router();

// Express 5 forwards rejected promises to the error handler, so no try/catch here.
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

export default router;
