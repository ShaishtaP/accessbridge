import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});
