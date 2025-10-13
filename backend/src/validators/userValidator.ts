import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  bio: z.string()
    .max(500, 'Bio too long (max 500 characters)')
    .optional(),
  avatar: z.string()
    .max(10000000, 'Avatar image too large') // ~10MB base64
    .optional(),
  coverImage: z.string()
    .max(10000000, 'Cover image too large')
    .optional(),
  tradingStyle: z.string()
    .max(100, 'Trading style too long')
    .optional(),
}).strict(); // Prevent mass assignment (isAdmin, winRate, etc.)
