import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

class SocketService {
  io = null;

  init(httpServer) {
    const configuredOrigins = [
      ...(config.security?.corsOrigin || 'http://localhost:5173').split(','),
      config.clientUrl || '',
      'http://localhost:5173',
    ]
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    const corsOrigins = [...new Set(configuredOrigins)];

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const normalized = origin.replace(/\/+$/, '');
          if (
            config.isDev ||
            corsOrigins.includes(normalized) ||
            corsOrigins.includes('*') ||
            /^https:\/\/.*\.vercel\.app$/.test(normalized) ||
            /^https:\/\/.*\.railway\.app$/.test(normalized) ||
            /^https:\/\/.*\.up\.railway\.app$/.test(normalized) ||
            /^https:\/\/.*\.onrender\.com$/.test(normalized)
          ) {
            return callback(null, true);
          }
          return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    // Authentication middleware for Socket.io
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

        if (token) {
          const decoded = verifyToken(token);
          if (decoded && decoded.id) {
            socket.user = decoded;
            return next();
          }
        }
        // Allow anonymous connection as guest for public announcements
        socket.user = null;
        next();
      } catch (err) {
        socket.user = null;
        next();
      }
    });

    this.io.on('connection', (socket) => {
      socket.join('public');

      if (socket.user) {
        const userId = socket.user.id;
        const role = socket.user.role;
        socket.join(`user:${userId}`);
        if (role) {
          socket.join(`role:${role}`);
        }
        logger.debug({ userId, role, socketId: socket.id }, '🔌 Socket connected (authenticated)');
      } else {
        logger.debug({ socketId: socket.id }, '🔌 Socket connected (guest)');
      }

      // Explicit authentication / re-registration from frontend
      socket.on('authenticate', (token) => {
        try {
          if (!token) return;
          const decoded = verifyToken(token);
          if (decoded && decoded.id) {
            socket.user = decoded;
            socket.join(`user:${decoded.id}`);
            if (decoded.role) socket.join(`role:${decoded.role}`);
            logger.debug({ userId: decoded.id }, '🔌 Socket re-authenticated');
          }
        } catch {}
      });

      socket.on('disconnect', () => {
        logger.debug({ socketId: socket.id }, '🔌 Socket disconnected');
      });
    });

    logger.info('🚀 Socket.IO Notification Engine initialized');
    return this.io;
  }

  /**
   * Broadcast a notification to all connected clients
   */
  emitToAll(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Emit notification to a specific user
   */
  emitToUser(userId, event, data) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit notification to multiple users
   */
  emitToUsers(userIds = [], event, data) {
    if (!this.io) return;
    userIds.forEach((userId) => {
      this.io.to(`user:${userId}`).emit(event, data);
    });
  }

  /**
   * Emit notification to users with a specific role
   */
  emitToRole(role, event, data) {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit(event, data);
  }
}

export const socketService = new SocketService();
export default socketService;
