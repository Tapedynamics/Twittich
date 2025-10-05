import express from 'express';
import {
  startLiveSession,
  stopLiveSession,
  getCurrentLiveSession,
  getLiveSessions,
} from '../controllers/liveController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/start', authenticateToken, startLiveSession);
router.post('/:sessionId/stop', authenticateToken, stopLiveSession);
router.get('/current', getCurrentLiveSession);
router.get('/sessions', getLiveSessions);

export default router;
