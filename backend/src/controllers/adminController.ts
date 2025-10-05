import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const makeUserAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId!;
    const { userId } = req.params;

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      res.status(403).json({ error: 'Only admins can perform this action' });
      return;
    }

    // Update target user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: true },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Make user admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId!;

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      res.status(403).json({ error: 'Only admins can view all users' });
      return;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId!;

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      res.status(403).json({ error: 'Only admins can view stats' });
      return;
    }

    const [totalUsers, totalPosts, totalLiveSessions, activeLiveSessions] =
      await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.liveSession.count(),
        prisma.liveSession.count({ where: { status: 'LIVE' } }),
      ]);

    res.json({
      totalUsers,
      totalPosts,
      totalLiveSessions,
      activeLiveSessions,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
