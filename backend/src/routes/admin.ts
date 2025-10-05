import express from 'express';
import { makeUserAdmin, getAllUsers, getStats } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.put('/users/:userId/make-admin', authenticateToken, makeUserAdmin);
router.get('/users', authenticateToken, getAllUsers);
router.get('/stats', authenticateToken, getStats);

export default router;
