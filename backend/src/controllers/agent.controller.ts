import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getAgentId, getUserId, isAdmin } from '../utils/role.util';
import { redisGeo } from '../lib/redis';
import { notifyPartner } from '../lib/webhook';
import { EventType, ActorType, OrderStatus } from '@prisma/client';
import { eventService } from '../services/event.service';
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

      // Log location update event (throttled - only log every 30 seconds to avoid spam)
      const userId = getUserId(req);
      eventService.logAgentEvent(
        EventType.AGENT_LOCATION_UPDATE,
        agentId,
        userId ?? undefined,
        {
          latitude,
          longitude,
        }
      );

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
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      // Log agent status change event
      const userId = agent.user.id;
      const eventType = status === 'ONLINE' ? EventType.AGENT_ONLINE : EventType.AGENT_OFFLINE;
      eventService.logAgentEvent(
        eventType,
        agentId,
        userId,
        {
          previousStatus: agent.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE',
          newStatus: status,
        }
      );

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

      // Log order acceptance event
      const userId = getUserId(req);
      eventService.logOrderEvent(
        EventType.ORDER_ACCEPTED,
        orderId,
        ActorType.AGENT,
        userId ?? undefined,
        {
          agentId,
          partnerId: updatedOrder.partnerId,
          payoutAmount: updatedOrder.payoutAmount,
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

      const orderId = req.params.id;
      const userId = getUserId(req);

      // Log order rejection event
      if (orderId) {
        eventService.logOrderEvent(
          EventType.ORDER_REJECTED,
          orderId,
          ActorType.AGENT,
          userId ?? undefined,
          {
            agentId,
          }
        );
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
      if (status && status !== 'ALL') {
        where.status = status;
      }
      // If status is 'ALL' or not provided, return all orders (including past/completed ones)

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

      // Calculate timing information for each order
      const { delayCheckerService } = await import('../services/delay-checker.service');
      
      // Format orders for response
      const formattedOrders = orders.map(order => {
        const timing = delayCheckerService.getOrderTiming({
          pickedUpAt: order.pickedUpAt,
          estimatedDuration: order.estimatedDuration,
        });
        
        return {
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
          timing: {
            elapsedMinutes: timing.elapsedMinutes,
            remainingMinutes: timing.remainingMinutes,
            isDelayed: timing.isDelayed,
            elapsedTime: timing.elapsedTime,
            remainingTime: timing.remainingTime,
          },
          partner: {
            id: order.partner.id,
            name: order.partner.user.name,
            companyName: order.partner.companyName,
            phone: order.partner.user.phone,
            email: order.partner.user.email,
          },
        };
      });

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

      // Check and update delayed status
      const { delayCheckerService } = await import('../services/delay-checker.service');
      await delayCheckerService.checkOrderDelay(orderId);
      
      // Refresh order to get updated status
      const refreshedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });
      
      // Calculate timing information
      const timing = delayCheckerService.getOrderTiming({
        pickedUpAt: refreshedOrder?.pickedUpAt || order.pickedUpAt,
        estimatedDuration: refreshedOrder?.estimatedDuration || order.estimatedDuration,
      });

      // Format order for response
      const formattedOrder = {
        id: order.id,
        trackingNumber: order.id.substring(0, 8).toUpperCase(),
        status: refreshedOrder?.status || order.status,
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
        timing: {
          elapsedMinutes: timing.elapsedMinutes,
          remainingMinutes: timing.remainingMinutes,
          isDelayed: timing.isDelayed,
          elapsedTime: timing.elapsedTime,
          remainingTime: timing.remainingTime,
        },
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
      });

      // Check for delay after status update (if order was picked up or is out for delivery)
      if ((status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') && updatedOrder.pickedUpAt) {
        const { delayCheckerService } = await import('../services/delay-checker.service');
        // Run delay check asynchronously (don't wait)
        delayCheckerService.checkOrderDelay(orderId).catch(err => 
          console.error('[Agent Controller] Error checking delay status:', err)
        );
      }

      // Fetch updated order with includes for response
      const orderWithIncludes = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          partner: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!orderWithIncludes) {
        return res.status(404).json({ error: 'Order not found after update' });
      }

      // Notify partner via webhook
      await notifyPartner(
        orderWithIncludes.partner.id,
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

      // Log order status update event
      const userId = getUserId(req);
      let eventType: EventType;
      switch (status) {
        case 'PICKED_UP':
          eventType = EventType.ORDER_PICKED_UP;
          break;
        case 'OUT_FOR_DELIVERY':
          eventType = EventType.ORDER_OUT_FOR_DELIVERY;
          break;
        case 'DELIVERED':
          eventType = EventType.ORDER_DELIVERED;
          break;
        case 'CANCELLED':
          eventType = EventType.ORDER_CANCELLED;
          break;
        default:
          eventType = EventType.ORDER_ASSIGNED;
      }
      
      eventService.logOrderEvent(
        eventType,
        orderId,
        ActorType.AGENT,
        userId ?? undefined,
        {
          agentId,
          previousStatus: order.status,
          newStatus: status,
          actualDuration: updatedOrder.actualDuration,
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
        console.error('[Agent Metrics] No agent ID found in request');
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      console.log('[Agent Metrics] Fetching metrics for agent:', agentId);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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
      // Query WITHOUT DELAYED to avoid enum errors - DELAYED doesn't exist in database enum yet
      let activeOrders = 0;
      try {
        // Only query statuses that definitely exist in the database enum
        activeOrders = await prisma.order.count({
          where: {
            agentId,
            status: {
              in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY],
            },
          },
        });
      } catch (activeOrdersError: any) {
        console.error('[Agent Metrics] Error counting active orders:', activeOrdersError?.message);
        activeOrders = 0;
      }

      // Get active order details if exists
      // Check both currentOrderId and any active order assigned to this agent
      let activeOrder = null;
      
      // First try currentOrderId
      let orderToCheck = agent.currentOrderId;
      
      // If no currentOrderId, check for any active order assigned to this agent
      if (!orderToCheck) {
        // Query WITHOUT DELAYED to avoid enum errors
        const activeOrderRecord = await prisma.order.findFirst({
          where: {
            agentId,
            status: {
              in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
          },
        });
        
        orderToCheck = activeOrderRecord?.id || null;
      }
      
      if (orderToCheck) {
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderToCheck },
            include: {
              partner: {
                include: {
                  user: {
                    select: {
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          });

          if (!order) {
            console.warn('[Agent Metrics] Order not found:', orderToCheck);
            activeOrder = null;
          } else {
            // Check if order status is active (excluding DELAYED to avoid enum errors)
            const activeStatuses: OrderStatus[] = [
              OrderStatus.ASSIGNED, 
              OrderStatus.PICKED_UP, 
              OrderStatus.OUT_FOR_DELIVERY
            ];
            
            const isActiveStatus = activeStatuses.includes(order.status as OrderStatus);
            
            if (isActiveStatus) {
              // Check and update delayed status
              let refreshedOrder = order;
              let timing = null;
              
              try {
                // Dynamically import delay checker service
                let delayCheckerService;
                try {
                  const delayModule = await import('../services/delay-checker.service');
                  delayCheckerService = delayModule.delayCheckerService;
                } catch (importError: any) {
                  console.warn('[Agent Metrics] Could not import delay-checker service:', importError?.message);
                  delayCheckerService = null;
                }

                if (delayCheckerService) {
                  try {
                    await delayCheckerService.checkOrderDelay(order.id);
                  } catch (checkError: any) {
                    console.warn('[Agent Metrics] Error checking order delay:', checkError?.message);
                    // Continue even if delay check fails
                  }
                }
                
                // Refresh order to get updated status (without relations to avoid type issues)
                try {
                  const refreshedOrderData = await prisma.order.findUnique({
                    where: { id: order.id },
                  });
                  
                  if (refreshedOrderData) {
                    // Merge refreshed data with original order to keep partner relation
                    refreshedOrder = {
                      ...order,
                      status: refreshedOrderData.status,
                      pickedUpAt: refreshedOrderData.pickedUpAt,
                      estimatedDuration: refreshedOrderData.estimatedDuration,
                    };
                  }
                } catch (refreshError: any) {
                  console.warn('[Agent Metrics] Error refreshing order:', refreshError?.message);
                  // Use original order if refresh fails
                }

                // Calculate timing information
                if (delayCheckerService) {
                  try {
                    timing = delayCheckerService.getOrderTiming({
                      pickedUpAt: refreshedOrder.pickedUpAt || null,
                      estimatedDuration: refreshedOrder.estimatedDuration || null,
                    });
                  } catch (timingError: any) {
                    console.warn('[Agent Metrics] Error calculating timing:', timingError?.message);
                    timing = null;
                  }
                }
              } catch (delayError: any) {
                console.error('[Agent Metrics] Unexpected error in delay checker block:', delayError);
                // Continue without timing if delay checker fails
              }
              
              // Set default timing if not calculated
              if (!timing) {
                timing = {
                  elapsedMinutes: null,
                  remainingMinutes: null,
                  isDelayed: false,
                  elapsedTime: null,
                  remainingTime: null,
                };
              }

              // Safely access partner data with null checks
              const partnerName = order.partner?.user?.name || 'Unknown Partner';
              const partnerCompanyName = order.partner?.companyName || '';
              const partnerPhone = order.partner?.user?.phone || '';

              activeOrder = {
                id: order.id,
                trackingNumber: order.id.substring(0, 8).toUpperCase(),
                status: refreshedOrder?.status || order.status,
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
                estimatedDuration: refreshedOrder?.estimatedDuration || order.estimatedDuration,
                pickedUpAt: order.pickedUpAt?.toISOString(),
                assignedAt: order.assignedAt?.toISOString(),
                timing,
                partner: {
                  name: partnerName,
                  companyName: partnerCompanyName,
                  phone: partnerPhone,
                },
              };
            } else {
              // Order exists but is not in an active status
              activeOrder = null;
            }
          }
        } catch (error: any) {
          console.error('[Agent Metrics] Error fetching active order:', error);
          console.error('[Agent Metrics] Error details:', {
            message: error?.message,
            stack: error?.stack,
            orderId: orderToCheck,
          });
          // Continue without active order if there's an error
          activeOrder = null;
        }
      }

      // Ensure all values are valid numbers
      const response = {
        todayOrders: Number(todayOrders) || 0,
        yesterdayOrders: Number(yesterdayOrders) || 0,
        ordersChange: Math.round(Number(ordersChange)) || 0,
        monthlyEarnings: Number(monthlyEarnings) || 0,
        lastMonthEarnings: Number(lastMonthEarnings) || 0,
        earningsChange: Math.round(Number(earningsChange)) || 0,
        activeOrders: Number(activeOrders) || 0,
        completedOrders: Number(agent.completedOrders) || 0,
        totalOrders: Number(agent.totalOrders) || 0,
        cancelledOrders: Number(agent.cancelledOrders) || 0,
        acceptanceRate: Number(agent.acceptanceRate) || 0,
        rating: Number(agent.rating) || 0,
        thisMonthOrders: Number(thisMonthOrders.length) || 0,
        activeOrder: activeOrder || null,
      };

      console.log('[Agent Metrics] Successfully returning metrics:', {
        todayOrders: response.todayOrders,
        activeOrders: response.activeOrders,
        hasActiveOrder: !!response.activeOrder,
        agentId,
      });

      res.json(response);
    } catch (error: any) {
      console.error('[Agent Metrics] Error in getMetrics:', error);
      console.error('[Agent Metrics] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        agentId: getAgentId(req as any),
      });
      
      // Return a more detailed error response for common issues
      if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
        return res.status(400).json({ error: 'Database constraint violation' });
      }
      
      if (error?.code === 'P2025' || error?.message?.includes('Record not found')) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Log full error for debugging in production
      if (process.env.NODE_ENV === 'production') {
        console.error('[Agent Metrics] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
      
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

  // GET /api/agent/support/tickets - Get agent's support tickets
  async getSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const agentId = getAgentId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        userId,
        ...(agentId ? { agentId } : {}),
      };

      if (status && status !== 'ALL') {
        where.status = status;
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.supportTicket.count({ where }),
      ]);

      res.json({
        tickets: tickets.map((ticket: any) => ({
          id: ticket.id,
          issueType: ticket.issueType,
          description: ticket.description,
          status: ticket.status,
          resolvedAt: ticket.resolvedAt,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          order: ticket.order || null,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/support/tickets - Create support ticket
  async createSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const agentId = getAgentId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { orderId, issueType, description } = req.body;

      if (!issueType || !description) {
        return res.status(400).json({ error: 'Issue type and description are required' });
      }

      if (!['DELAY', 'MISSING', 'DAMAGE', 'OTHER'].includes(issueType)) {
        return res.status(400).json({ error: 'Invalid issue type' });
      }

      // Verify order exists and belongs to agent if orderId is provided
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }

        if (order.agentId !== agentId) {
          return res.status(403).json({ error: 'You can only create tickets for your own orders' });
        }
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          agentId: agentId || null,
          orderId: orderId || null,
          issueType,
          description,
          status: 'OPEN',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      res.status(201).json({
        id: ticket.id,
        issueType: ticket.issueType,
        description: ticket.description,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        message: 'Support ticket created successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

