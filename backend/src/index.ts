import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import liveRoutes from './routes/live';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import prisma from './config/database';
import { verifyAccessToken } from './utils/jwt';

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

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts per 15 minutes
  message: 'Too many attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

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

// WebSocket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return next(new Error('Authentication error: Invalid token'));
  }

  socket.data.userId = decoded.userId;
  next();
});

io.on('connection', async (socket) => {
  console.log('User connected:', socket.id, 'UserID:', socket.data.userId);

  // Load user info once at connection
  const user = await prisma.user.findUnique({
    where: { id: socket.data.userId },
    select: { id: true, username: true, isAdmin: true }
  });

  if (!user) {
    socket.disconnect();
    return;
  }

  socket.data.username = user.username;
  socket.data.isAdmin = user.isAdmin;

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

  // Live chat message - SECURED with rate limiting
  const chatRateLimits = new Map<string, { count: number; resetAt: number }>();

  socket.on('live-chat-message', async (data: { sessionId: string; message: string }) => {
    try {
      const { sessionId, message } = data;

      // Use authenticated userId and username from socket.data
      const userId = socket.data.userId;
      const username = socket.data.username;

      console.log('Live chat message received:', { sessionId, message, userId, username });

      // Rate limiting: max 10 messages per minute
      const now = Date.now();
      const limit = chatRateLimits.get(userId) || { count: 0, resetAt: now + 60000 };

      if (now > limit.resetAt) {
        limit.count = 0;
        limit.resetAt = now + 60000;
      }

      if (limit.count >= 10) {
        socket.emit('error', { message: 'Too many messages. Please slow down!' });
        return;
      }

      limit.count++;
      chatRateLimits.set(userId, limit);

      // Validate message length
      if (!message || message.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      if (message.length > 500) {
        socket.emit('error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      // Save message to database
      await prisma.liveChatMessage.create({
        data: {
          sessionId,
          userId,
          message: message.trim(),
        },
      });

      // Broadcast message to all viewers
      io.to(`live-${sessionId}`).emit('live-chat-message', {
        username,
        message: message.trim(),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling live chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // WebRTC Signaling
  socket.on('broadcaster-ready', (data: { sessionId: string }) => {
    console.log('Broadcaster ready for session:', data.sessionId);
    // Mark this socket as the broadcaster for this session
    socket.data.broadcasterSession = data.sessionId;

    // Notify all viewers in this session that broadcaster is ready
    socket.to(`live-${data.sessionId}`).emit('broadcaster-ready');
    console.log('Notified viewers that broadcaster is ready');

    // Get all sockets in the room (viewers who are already waiting)
    const socketsInRoom = io.sockets.adapter.rooms.get(`live-${data.sessionId}`);
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        // Skip the broadcaster itself
        if (socketId !== socket.id) {
          console.log('Notifying broadcaster of existing viewer:', socketId);
          socket.emit('viewer-joined', { viewerId: socketId });
        }
      });
    }
  });

  socket.on('broadcaster-stopped', (data: { sessionId: string }) => {
    console.log('Broadcaster stopped for session:', data.sessionId);
    // Unmark this socket as the broadcaster
    socket.data.broadcasterSession = undefined;

    // Notify all viewers in this session that broadcaster stopped
    socket.to(`live-${data.sessionId}`).emit('broadcaster-stopped');
    console.log('Notified viewers that broadcaster stopped');
  });

  socket.on('request-stream', (data: { sessionId: string }) => {
    console.log('Viewer requesting stream for session:', data.sessionId);
    // Find the broadcaster for this session
    const sockets = Array.from(io.sockets.sockets.values());
    const broadcaster = sockets.find(s => s.data.broadcasterSession === data.sessionId);

    if (broadcaster) {
      console.log('Found broadcaster, notifying them of new viewer:', socket.id);
      broadcaster.emit('viewer-joined', {
        viewerId: socket.id,
      });
    } else {
      console.warn('No broadcaster found for session:', data.sessionId);
    }
  });

  socket.on('webrtc-offer', (data: { sessionId: string; offer: any; targetId: string }) => {
    console.log('Sending WebRTC offer to viewer:', data.targetId);
    io.to(data.targetId).emit('webrtc-offer', {
      offer: data.offer,
      senderId: socket.id,
    });
  });

  socket.on('webrtc-answer', (data: { sessionId: string; answer: any; targetId: string }) => {
    console.log('Sending WebRTC answer to broadcaster:', data.targetId);
    io.to(data.targetId).emit('webrtc-answer', {
      answer: data.answer,
      senderId: socket.id,
    });
  });

  socket.on('webrtc-ice-candidate', (data: { sessionId: string; candidate: any; targetId?: string }) => {
    if (data.targetId) {
      io.to(data.targetId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id,
      });
    } else {
      socket.to(`live-${data.sessionId}`).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id,
      });
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
