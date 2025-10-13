import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content too long (max 5000 characters)'),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'TRADE_IDEA']).optional(),
}).strict(); // Reject extra fields like isAdmin, winRate, etc.

export const addCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(1000, 'Comment too long (max 1000 characters)'),
}).strict();
