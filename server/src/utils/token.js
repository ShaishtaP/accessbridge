import jwt from 'jsonwebtoken';

const EXPIRES_IN = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

// The token only carries the user id; everything else is looked up when needed.
export function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, getSecret(), { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}
