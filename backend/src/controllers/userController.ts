import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { updateProfileSchema } from '../validators/userValidator';
import { validateBase64Image } from '../utils/imageValidator';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestedUserId = req.params.id;
    const currentUserId = req.userId;

    // Check if viewing own profile
    const isOwnProfile = requestedUserId === currentUserId;

    const user = await prisma.user.findUnique({
      where: { id: requestedUserId },
      select: {
        id: true,
        username: true,
        // Email only visible to profile owner
        email: isOwnProfile,
        bio: true,
        avatar: true,
        coverImage: true,
        tradingStyle: true,
        winRate: true,
        totalTrades: true,
        profitLoss: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: targetUserId } = req.params;
    const userId = req.userId!;

    if (userId === targetUserId) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      res.status(400).json({ error: 'Already following this user' });
      return;
    }

    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'NEW_FOLLOWER',
        content: `Someone started following you`,
        relatedId: userId,
      },
    });

    res.status(201).json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: targetUserId } = req.params;
    const userId = req.userId!;

    await prisma.follow.deleteMany({
      where: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Validate input with Zod (prevents mass assignment)
    const validated = updateProfileSchema.parse(req.body);

    // Validate images if present
    if (validated.avatar) {
      validateBase64Image(validated.avatar);
    }
    if (validated.coverImage) {
      validateBase64Image(validated.coverImage);
    }

    const updateData: any = {};
    if (validated.username !== undefined) updateData.username = validated.username;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.avatar !== undefined) updateData.avatar = validated.avatar;
    if (validated.coverImage !== undefined) updateData.coverImage = validated.coverImage;
    if (validated.tradingStyle !== undefined) updateData.tradingStyle = validated.tradingStyle;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        coverImage: true,
        tradingStyle: true,
        winRate: true,
        totalTrades: true,
        profitLoss: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
