import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const posts = await prisma.post.findMany({
      take: Number(limit),
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Convert mediaUrls from string to array for frontend compatibility
    const formattedPosts = posts.map(post => ({
      ...post,
      mediaUrls: post.mediaUrls ? [post.mediaUrls] : []
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, mediaUrls, type } = req.body;
    const userId = req.userId!;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        mediaUrls: mediaUrls?.[0] || null,
        type: type || 'TEXT',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.userId!;

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      res.status(400).json({ error: 'Post already liked' });
      return;
    }

    await prisma.$transaction([
      prisma.like.create({
        data: { postId, userId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ message: 'Post liked' });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unlikePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const userId = req.userId!;

    await prisma.$transaction([
      prisma.like.deleteMany({
        where: { postId, userId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Post unliked' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
