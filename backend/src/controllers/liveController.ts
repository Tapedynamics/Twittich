import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';

export const startLiveSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { title, description } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      res.status(403).json({ error: 'Only admin can start live sessions' });
      return;
    }

    // Check if there's already an active session
    const activeSession = await prisma.liveSession.findFirst({
      where: {
        status: 'LIVE',
      },
    });

    if (activeSession) {
      res.status(400).json({ error: 'A live session is already active' });
      return;
    }

    // Create live session
    const session = await prisma.liveSession.create({
      data: {
        broadcasterId: userId,
        title,
        description,
        status: 'LIVE',
        startTime: new Date(),
      },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Notify all followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    // Create notifications
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        type: 'LIVE_STARTED',
        content: `${user} has started a live trading session!`,
        relatedId: session.id,
      })),
    });

    // Broadcast to all connected users
    io.emit('live-started', session);

    res.status(201).json(session);
  } catch (error) {
    console.error('Start live session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const stopLiveSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.broadcasterId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endTime: new Date(),
      },
    });

    // Broadcast session ended to the room
    io.to(`live-${sessionId}`).emit('live-ended', { sessionId });

    // Also broadcast globally for users not in the room yet
    io.emit('live-ended', { sessionId });

    res.json({ message: 'Live session stopped' });
  } catch (error) {
    console.error('Stop live session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentLiveSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const session = await prisma.liveSession.findFirst({
      where: { status: 'LIVE' },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.json(session);
  } catch (error) {
    console.error('Get current live session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLiveSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const sessions = await prisma.liveSession.findMany({
      take: Number(limit),
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        broadcaster: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get live sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
