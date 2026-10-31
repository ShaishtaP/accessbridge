import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { httpError } from '../utils/httpError.js';

// Protects a route: expects "Authorization: Bearer <token>" and loads the user into req.user.
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw httpError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    // Expired, tampered or malformed tokens all get the same answer.
    throw httpError(401, 'Invalid or expired token');
  }

  // The account may have been deleted after the token was issued.
  const user = await User.findById(payload.sub);
  if (!user) throw httpError(401, 'Invalid or expired token');

  req.user = user;
  next();
}
