import { Router } from 'express';
import { register, login } from '../controllers/authController.js';

const router = Router();

// Express 5 forwards rejected promises to the error handler, so no try/catch here.
router.post('/register', register);
router.post('/login', login);

export default router;
