import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

let io: SocketIOServer | null = null;

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  agentId?: string;
  partnerId?: string;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Authentication middleware for WebSocket
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'djfhfudfhcnuyedufcy5482dfdf'
      ) as JWTPayload;

      socket.data.user = decoded;
      socket.data.token = token;
      
      // If agent, store agentId
      if (decoded.agentId) {
        socket.data.agentId = decoded.agentId;
      }
      
      // If partner, store partnerId
      if (decoded.partnerId) {
        socket.data.partnerId = decoded.partnerId;
      }

      next();
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new Error('Invalid token'));
      }
      if (error instanceof jwt.TokenExpiredError) {
        return next(new Error('Token expired'));
      }
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as JWTPayload;
    console.log(`[WebSocket] Client connected: ${socket.id} (User: ${user.email}, Role: ${user.role})`);

    // Join role-specific rooms
    if (socket.data.agentId) {
      socket.join(`agent:${socket.data.agentId}`);
      console.log(`[WebSocket] Agent ${socket.data.agentId} joined agent room`);
    }
    
    if (socket.data.partnerId) {
      socket.join(`partner:${socket.data.partnerId}`);
      console.log(`[WebSocket] Partner ${socket.data.partnerId} joined partner room`);
    }

    // Handle agent online status
    socket.on('agent:online', async () => {
      const agentId = socket.data.agentId;
      if (agentId) {
        socket.join(`agent:${agentId}`);
        console.log(`[WebSocket] Agent ${agentId} marked as online`);
      }
    });

    // Handle agent offline status
    socket.on('agent:offline', async () => {
      const agentId = socket.data.agentId;
      if (agentId) {
        socket.leave(`agent:${agentId}`);
        console.log(`[WebSocket] Agent ${agentId} marked as offline`);
      }
    });

    // Handle order acceptance
    socket.on('order:accept', async (data: { orderId: string }) => {
      const agentId = socket.data.agentId;
      if (!agentId) {
        socket.emit('error', { message: 'Agent not authenticated' });
        return;
      }

      // The actual acceptance logic is handled by the API endpoint
      // This is just for real-time updates
      console.log(`[WebSocket] Agent ${agentId} accepting order ${data.orderId}`);
    });

    // Handle order rejection
    socket.on('order:reject', async (data: { orderId: string }) => {
      const agentId = socket.data.agentId;
      if (!agentId) {
        socket.emit('error', { message: 'Agent not authenticated' });
        return;
      }

      console.log(`[WebSocket] Agent ${agentId} rejecting order ${data.orderId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const agentId = socket.data.agentId;
      console.log(`[WebSocket] Client disconnected: ${socket.id}${agentId ? ` (Agent: ${agentId})` : ''}`);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Send order offer to agent via WebSocket
 */
export async function sendOrderOfferToAgent(agentId: string, orderData: any): Promise<void> {
  if (!io) {
    console.warn('[WebSocket] Server not initialized, cannot send order offer');
    return;
  }

  io.to(`agent:${agentId}`).emit('order:offer', {
    order: orderData,
    timestamp: new Date().toISOString(),
  });

  console.log(`[WebSocket] Order offer sent to agent ${agentId}`);
}

/**
 * Broadcast order assignment to partner
 */
export async function notifyPartnerOrderAssigned(partnerId: string, orderData: any): Promise<void> {
  if (!io) {
    return;
  }

  io.to(`partner:${partnerId}`).emit('order:assigned', {
    order: orderData,
    timestamp: new Date().toISOString(),
  });
}


