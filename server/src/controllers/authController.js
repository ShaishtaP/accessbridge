import User from '../models/User.js';
import { signToken } from '../utils/token.js';

// Small helper so validation failures reach the central error handler as 4xx.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function readCredentials(body = {}) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  return { email, password };
}

export async function register(req, res) {
  const { email, password } = readCredentials(req.body);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');

  if (await User.exists({ email })) throw httpError(409, 'Email is already registered');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ user: user.toPublic(), token: signToken(user._id) });
}

export async function login(req, res) {
  const { email, password } = readCredentials(req.body);
  if (!email || !password) throw httpError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts can't be probed.
  if (!user || !(await user.checkPassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }

  res.json({ user: user.toPublic(), token: signToken(user._id) });
}
