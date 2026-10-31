import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { httpError } from '../utils/httpError.js';

// req.body is already validated and cleaned by the zod schemas in routes/auth.js.
export async function register(req, res) {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) throw httpError(409, 'Email is already registered');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ user: user.toPublic(), token: signToken(user._id) });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts can't be probed.
  if (!user || !(await user.checkPassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }

  res.json({ user: user.toPublic(), token: signToken(user._id) });
}

// Returns the logged-in user (set by requireAuth).
export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}
