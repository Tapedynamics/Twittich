import express from 'express';
import { getFeed, createPost, likePost, unlikePost, addComment, getComments } from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', getFeed);
router.post('/', authenticateToken, createPost);
router.post('/:id/like', authenticateToken, likePost);
router.delete('/:id/unlike', authenticateToken, unlikePost);
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticateToken, addComment);

export default router;
