import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getAgentId, isAdmin } from '../utils/role.util';
import { redisGeo } from '../lib/redis';
import { notifyPartner } from '../lib/webhook';
import path from 'path';
import fs from 'fs';

export const agentController = {
  // GET /api/agent/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          documents: {
            orderBy: {
              uploadedAt: 'desc',
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json({
        id: agent.id,
        status: agent.status,
        vehicleType: agent.vehicleType,
        city: agent.city,
        state: agent.state,
        pincode: agent.pincode,
        isApproved: agent.isApproved,
        rating: agent.rating,
        totalOrders: agent.totalOrders,
        completedOrders: agent.completedOrders,
        acceptanceRate: agent.acceptanceRate,
        user: agent.user,
        documents: agent.documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          verified: doc.verified,
          uploadedAt: doc.uploadedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/agent/profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { city, state, pincode, vehicleType } = req.body;

      // Update agent profile
      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(pincode !== undefined && { pincode }),
          ...(vehicleType && { vehicleType }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          documents: {
            orderBy: {
              uploadedAt: 'desc',
            },
          },
        },
      });

      // Return full profile data matching getProfile response
      res.json({
        id: agent.id,
        status: agent.status,
        vehicleType: agent.vehicleType,
        city: agent.city,
        state: agent.state,
        pincode: agent.pincode,
        isApproved: agent.isApproved,
        rating: agent.rating,
        totalOrders: agent.totalOrders,
        completedOrders: agent.completedOrders,
        acceptanceRate: agent.acceptanceRate,
        user: agent.user,
        documents: agent.documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          verified: doc.verified,
          uploadedAt: doc.uploadedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/location
  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { latitude, longitude } = req.body;

      // Store in Redis GEO for real-time location queries
      await redisGeo.addAgentLocation(agentId, longitude, latitude);

      // Store in database for history
      await prisma.agentLocation.create({
        data: {
          agentId,
          latitude,
          longitude,
        },
      });

      // Update lastOnlineAt timestamp
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastOnlineAt: new Date() },
      });

      res.json({ message: 'Location updated successfully' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/status
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, agentId: requestedAgentId } = req.body;
      
      let agentId: string;
      
      // If user is admin and provided agentId, use it; otherwise use their own agentId
      if (isAdmin(req) && requestedAgentId) {
        // Admin can update any agent's status
        agentId = requestedAgentId;
        
        // Verify the agent exists
        const agent = await prisma.agent.findUnique({
          where: { id: agentId },
        });
        
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
      } else {
        // Agent can only update their own status
        const ownAgentId = getAgentId(req);
        if (!ownAgentId) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        agentId = ownAgentId;
      }

      const updateData: any = { status };
      
      // Update lastOnlineAt when going online
      if (status === 'ONLINE') {
        updateData.lastOnlineAt = new Date();
      }
      
      // Remove location from Redis when going offline
      if (status === 'OFFLINE') {
        await redisGeo.removeAgentLocation(agentId);
      }

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: updateData,
      });

      res.json({
        id: agent.id,
        status: agent.status,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/agent/orders - Get available orders
  async getAvailableOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Get agent's current location from Redis
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          status: true,
          isApproved: true,
          currentOrderId: true,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Only show orders if agent is online and approved
      if (agent.status !== 'ONLINE' || !agent.isApproved) {
        return res.json([]);
      }

      // Note: Location-based filtering can be added later using Redis GEO
      // For now, we return all available orders

      // Get agent's coordinates (need to get from location history or Redis GEO)
      // For now, we'll get orders within a reasonable radius
      // In a real implementation, we'd use Redis GEO to find nearby orders
      
      // Get all orders that are searching for an agent
      const orders = await prisma.order.findMany({
        where: {
          status: 'SEARCHING_AGENT',
          agentId: null, // Not yet assigned
        },
        include: {
          partner: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Limit to 50 orders
      });

      // Format orders for response
      const formattedOrders = orders.map(order => ({
        id: order.id,
        trackingNumber: order.id.substring(0, 8).toUpperCase(),
        status: order.status,
        pickup: {
          latitude: order.pickupLat,
          longitude: order.pickupLng,
        },
        dropoff: {
          latitude: order.dropLat,
          longitude: order.dropLng,
        },
        payout: order.payoutAmount,
        priority: order.priority || 'NORMAL',
        estimatedDuration: order.estimatedDuration,
        createdAt: order.createdAt.toISOString(),
        partner: {
          name: order.partner.user.name,
          companyName: order.partner.companyName,
        },
      }));

      res.json(formattedOrders);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/orders/:id/accept - Accept an order
  async acceptOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const orderId = req.params.id;

      // Check if agent is online and approved
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          status: true,
          isApproved: true,
          currentOrderId: true,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (agent.status !== 'ONLINE') {
        return res.status(400).json({ error: 'Agent must be online to accept orders' });
      }

      if (!agent.isApproved) {
        return res.status(400).json({ error: 'Agent must be approved to accept orders' });
      }

      if (agent.currentOrderId) {
        return res.status(400).json({ error: 'Agent already has an active order' });
      }

      // Check if order exists and is available
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status !== 'SEARCHING_AGENT') {
        return res.status(400).json({ error: 'Order is not available for acceptance' });
      }

      if (order.agentId) {
        return res.status(400).json({ error: 'Order has already been assigned' });
      }

      // Assign order to agent (using transaction to prevent race conditions)
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Double-check order is still available
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!currentOrder || currentOrder.agentId || currentOrder.status !== 'SEARCHING_AGENT') {
          throw new Error('Order is no longer available');
        }

        // Update order
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            agentId,
            status: 'ASSIGNED',
            assignedAt: new Date(),
          },
          include: {
            partner: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        });

        // Update agent
        await tx.agent.update({
          where: { id: agentId },
          data: {
            currentOrderId: orderId,
            status: 'ON_TRIP',
          },
        });

        return order;
      });

      // Notify partner via webhook
      await notifyPartner(
        updatedOrder.partnerId,
        'ORDER_ASSIGNED',
        updatedOrder.id,
        updatedOrder.status,
        {
          agentId,
          assignedAt: updatedOrder.assignedAt,
        }
      );

      res.json({
        id: updatedOrder.id,
        status: updatedOrder.status,
        message: 'Order accepted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Order is no longer available') {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  },

  // POST /api/agent/orders/:id/reject - Reject an order (optional - for future use)
  async rejectOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // For now, rejection just means not accepting
      // In future, we might track rejection reasons
      res.json({ message: 'Order rejected' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/agent/my-orders - Get agent's assigned/active orders
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { status } = req.query;

      const where: any = {
        agentId,
      };

      // Filter by status if provided
      if (status) {
        where.status = status;
      } else {
        // Default: get active orders (not completed or cancelled)
        where.status = {
          in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
        };
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          partner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format orders for response
      const formattedOrders = orders.map(order => ({
        id: order.id,
        trackingNumber: order.id.substring(0, 8).toUpperCase(),
        status: order.status,
        pickup: {
          latitude: order.pickupLat,
          longitude: order.pickupLng,
        },
        dropoff: {
          latitude: order.dropLat,
          longitude: order.dropLng,
        },
        payout: order.payoutAmount,
        priority: order.priority || 'NORMAL',
        estimatedDuration: order.estimatedDuration,
        actualDuration: order.actualDuration,
        createdAt: order.createdAt.toISOString(),
        assignedAt: order.assignedAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        cancellationReason: order.cancellationReason,
        partner: {
          id: order.partner.id,
          name: order.partner.user.name,
          companyName: order.partner.companyName,
          phone: order.partner.user.phone,
          email: order.partner.user.email,
        },
      }));

      res.json(formattedOrders);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/agent/orders/:id - Get order details
  async getOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const orderId = req.params.id;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          partner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Verify agent owns this order or it's available
      if (order.agentId && order.agentId !== agentId) {
        return res.status(403).json({ error: 'You do not have permission to view this order' });
      }

      // Format order for response
      const formattedOrder = {
        id: order.id,
        trackingNumber: order.id.substring(0, 8).toUpperCase(),
        status: order.status,
        pickup: {
          latitude: order.pickupLat,
          longitude: order.pickupLng,
        },
        dropoff: {
          latitude: order.dropLat,
          longitude: order.dropLng,
        },
        payout: order.payoutAmount,
        priority: order.priority || 'NORMAL',
        estimatedDuration: order.estimatedDuration,
        actualDuration: order.actualDuration,
        createdAt: order.createdAt.toISOString(),
        assignedAt: order.assignedAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        cancellationReason: order.cancellationReason,
        partner: {
          id: order.partner.id,
          name: order.partner.user.name,
          companyName: order.partner.companyName,
          phone: order.partner.user.phone,
          email: order.partner.user.email,
        },
      };

      res.json(formattedOrder);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/agent/orders/:id/status - Update order status
  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const orderId = req.params.id;
      const { status, cancellationReason } = req.body;

      // Verify agent owns this order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.agentId !== agentId) {
        return res.status(403).json({ error: 'You do not have permission to update this order' });
      }

      // Update order status with appropriate timestamps
      const updateData: any = { status };

      if (status === 'PICKED_UP' && !order.pickedUpAt) {
        updateData.pickedUpAt = new Date();
      }

      if (status === 'DELIVERED' && !order.deliveredAt) {
        updateData.deliveredAt = new Date();
        // Calculate actual duration
        if (order.pickedUpAt) {
          const duration = Math.floor((new Date().getTime() - order.pickedUpAt.getTime()) / 60000);
          updateData.actualDuration = duration;
        }
        // Update agent stats
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            completedOrders: { increment: 1 },
            totalOrders: { increment: 1 },
            currentOrderId: null,
            status: 'ONLINE', // Back to online after delivery
          },
        });
      }

      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = cancellationReason;
        // Update agent stats
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            cancelledOrders: { increment: 1 },
            totalOrders: { increment: 1 },
            currentOrderId: null,
            status: 'ONLINE',
          },
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
            },
          },
        },
      });

      // Notify partner via webhook
      await notifyPartner(
        updatedOrder.partner.id,
        `ORDER_${status}`,
        updatedOrder.id,
        updatedOrder.status,
        {
          pickedUpAt: updatedOrder.pickedUpAt,
          deliveredAt: updatedOrder.deliveredAt,
          cancelledAt: updatedOrder.cancelledAt,
          cancellationReason: updatedOrder.cancellationReason,
        }
      );

      res.json({
        id: updatedOrder.id,
        status: updatedOrder.status,
        message: 'Order status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/agent/metrics - Get agent metrics and statistics
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get agent with current order
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          currentOrderId: true,
          totalOrders: true,
          completedOrders: true,
          cancelledOrders: true,
          acceptanceRate: true,
          rating: true,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get today's orders
      const todayOrders = await prisma.order.count({
        where: {
          agentId,
          createdAt: {
            gte: todayStart,
          },
        },
      });

      // Get this month's orders
      const thisMonthOrders = await prisma.order.findMany({
        where: {
          agentId,
          createdAt: {
            gte: thisMonthStart,
          },
          status: 'DELIVERED',
        },
        select: {
          payoutAmount: true,
        },
      });

      // Get last month's earnings for comparison
      const lastMonthOrders = await prisma.order.findMany({
        where: {
          agentId,
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
          status: 'DELIVERED',
        },
        select: {
          payoutAmount: true,
        },
      });

      // Calculate earnings
      const monthlyEarnings = thisMonthOrders.reduce((sum, order) => sum + order.payoutAmount, 0);
      const lastMonthEarnings = lastMonthOrders.reduce((sum, order) => sum + order.payoutAmount, 0);
      const earningsChange = lastMonthEarnings > 0 
        ? ((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 
        : 0;

      // Get yesterday's orders count for comparison
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayStart);
      
      const yesterdayOrders = await prisma.order.count({
        where: {
          agentId,
          createdAt: {
            gte: yesterdayStart,
            lt: yesterdayEnd,
          },
        },
      });

      const ordersChange = yesterdayOrders > 0 
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 
        : 0;

      // Active orders (orders that are assigned, picked up, or out for delivery)
      const activeOrders = await prisma.order.count({
        where: {
          agentId,
          status: {
            in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
          },
        },
      });

      res.json({
        todayOrders,
        yesterdayOrders,
        ordersChange: Math.round(ordersChange),
        monthlyEarnings,
        lastMonthEarnings,
        earningsChange: Math.round(earningsChange),
        activeOrders,
        completedOrders: agent.completedOrders,
        totalOrders: agent.totalOrders,
        cancelledOrders: agent.cancelledOrders || 0,
        acceptanceRate: agent.acceptanceRate,
        rating: agent.rating,
        thisMonthOrders: thisMonthOrders.length,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/agent/documents - Get all documents for the agent
  async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const documents = await prisma.agentDocument.findMany({
        where: { agentId },
        orderBy: { uploadedAt: 'desc' },
      });

      res.json(documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        verified: doc.verified,
        uploadedAt: doc.uploadedAt.toISOString(),
      })));
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/documents - Upload a document
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { documentType } = req.body;
      if (!documentType) {
        // Delete uploaded file if documentType is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Document type is required' });
      }

      // Generate file URL (relative to /uploads/documents/)
      const fileUrl = `/uploads/documents/${req.file.filename}`;

      // Create document record
      const document = await prisma.agentDocument.create({
        data: {
          agentId,
          documentType,
          fileName: req.file.originalname,
          fileUrl,
          verified: false,
        },
      });

      res.status(201).json({
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        verified: document.verified,
        uploadedAt: document.uploadedAt.toISOString(),
      });
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      next(error);
    }
  },

  // DELETE /api/agent/documents/:id - Delete a document
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { id } = req.params;

      // Find the document and verify it belongs to the agent
      const document = await prisma.agentDocument.findUnique({
        where: { id },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.agentId !== agentId) {
        return res.status(403).json({ error: 'You do not have permission to delete this document' });
      }

      // Delete the file from filesystem
      const filePath = path.join(process.cwd(), document.fileUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete the document record
      await prisma.agentDocument.delete({
        where: { id },
      });

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};

