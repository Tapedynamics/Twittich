import express from 'express';
import { getProfile, followUser, unfollowUser, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/:id', getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/:id/follow', authenticateToken, followUser);
router.delete('/:id/unfollow', authenticateToken, unfollowUser);

export default router;
