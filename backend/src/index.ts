import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import liveRoutes from './routes/live';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import prisma from './config/database';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Twittich API - Where Twitter meets Twitch' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection
const activeSessions = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join live session
  socket.on('join-live', async (sessionId: string) => {
    socket.join(`live-${sessionId}`);

    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId)?.add(socket.id);

    // Update viewers count
    const viewersCount = activeSessions.get(sessionId)?.size || 0;
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { viewersCount },
    });

    io.to(`live-${sessionId}`).emit('viewers-count', viewersCount);
    console.log(`User ${socket.id} joined live session ${sessionId}`);
  });

  // Leave live session
  socket.on('leave-live', async (sessionId: string) => {
    socket.leave(`live-${sessionId}`);
    activeSessions.get(sessionId)?.delete(socket.id);

    const viewersCount = activeSessions.get(sessionId)?.size || 0;
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { viewersCount },
    });

    io.to(`live-${sessionId}`).emit('viewers-count', viewersCount);
    console.log(`User ${socket.id} left live session ${sessionId}`);
  });

  // Live chat message
  socket.on('live-chat-message', async (data: { sessionId: string; message: string; userId: string; username: string }) => {
    try {
      const { sessionId, message, userId, username } = data;

      console.log('Live chat message received:', { sessionId, message, userId, username });

      if (!userId) {
        console.error('userId is missing in chat message');
        return;
      }

      // Save message to database
      await prisma.liveChatMessage.create({
        data: {
          sessionId,
          userId,
          message,
        },
      });

      // Broadcast message to all viewers
      io.to(`live-${sessionId}`).emit('live-chat-message', {
        username,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling live chat message:', error);
    }
  });

  socket.on('disconnect', () => {
    // Remove from all active sessions
    activeSessions.forEach((viewers, sessionId) => {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        const viewersCount = viewers.size;
        io.to(`live-${sessionId}`).emit('viewers-count', viewersCount);
      }
    });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

export { io };
