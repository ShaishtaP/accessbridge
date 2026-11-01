import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
});

// "owner" is not assignable: there is exactly one owner, set at creation.
const assignableRole = z.enum(['admin', 'member'], { message: 'Role must be admin or member' });

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: assignableRole.default('member'),
});

export const updateMemberSchema = z.object({
  role: assignableRole,
});
