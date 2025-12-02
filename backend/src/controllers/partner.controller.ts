import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getPartnerId } from '../utils/role.util';
import { notifyPartner } from '../lib/webhook';
import { OrderStatus } from '@prisma/client';

export const partnerController = {
  // GET /api/partner/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json({
        id: partner.id,
        companyName: partner.companyName,
        apiKey: partner.apiKey,
        webhookUrl: partner.webhookUrl,
        isActive: partner.isActive,
        user: partner.user,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/partner/webhook
  async updateWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const { webhookUrl } = req.body;

      const partner = await prisma.partner.update({
        where: { id: partnerId },
        data: { webhookUrl },
      });

      res.json({
        id: partner.id,
        webhookUrl: partner.webhookUrl,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/partner/orders - Create order
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      // Verify partner is active
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      if (!partner.isActive) {
        return res.status(403).json({ error: 'Partner account is not active' });
      }

      const {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        payoutAmount,
        priority = 'NORMAL',
        estimatedDuration,
      } = req.body;

      // Create order
      const order = await prisma.order.create({
        data: {
          partnerId,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          payoutAmount,
          priority,
          estimatedDuration,
          status: 'SEARCHING_AGENT',
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
      });

      // Trigger order assignment engine (Phase 5)
      // This will find nearby agents and offer the order to them
      // Assignment happens when an agent accepts the order
      const { assignOrder } = await import('../services/assignment.service');
      console.log(`[Partner] Triggering assignment for order ${order.id} at (${order.pickupLat}, ${order.pickupLng})`);
      assignOrder({
        orderId: order.id,
        pickupLat: order.pickupLat,
        pickupLng: order.pickupLng,
        payoutAmount: order.payoutAmount,
        priority: (order.priority as 'HIGH' | 'NORMAL' | 'LOW') || 'NORMAL',
        maxRadius: 5000, // 5km
        maxAgentsToOffer: 5,
        offerTimeout: 30, // 30 seconds
      })
        .then((result) => {
          console.log(`[Partner] Assignment result for order ${order.id}:`, {
            success: result.success,
            agentsOffered: result.agentsOffered,
            assigned: result.assigned,
            error: result.error,
          });
        })
        .catch((error) => {
          // Log error but don't fail order creation
          console.error('[Partner] Failed to trigger assignment engine:', error);
        });

      // Notify partner via webhook (optional - for confirmation)
      await notifyPartner(
        partnerId,
        'ORDER_CREATED',
        order.id,
        order.status,
        {
          trackingNumber: order.id.substring(0, 8).toUpperCase(),
          payout: order.payoutAmount,
        }
      );

      res.status(201).json({
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
        priority: order.priority,
        estimatedDuration: order.estimatedDuration,
        createdAt: order.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner/orders - List all partner orders
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const { status, limit = 50, offset = 0 } = req.query;

      const where: any = { partnerId };
      if (status) {
        // Handle both single status and array of statuses
        if (Array.isArray(status)) {
          where.status = {
            in: status
              .filter((s): s is string => typeof s === 'string')
              .map((s) => s as OrderStatus),
          };
        } else if (typeof status === 'string') {
          where.status = status as OrderStatus;
        }
      }

      // Optimize query by using select instead of include
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          select: {
            id: true,
            status: true,
            pickupLat: true,
            pickupLng: true,
            dropLat: true,
            dropLng: true,
            payoutAmount: true,
            priority: true,
            estimatedDuration: true,
            assignedAt: true,
            pickedUpAt: true,
            deliveredAt: true,
            cancelledAt: true,
            cancellationReason: true,
            createdAt: true,
            agent: {
              select: {
                id: true,
                vehicleType: true,
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.order.count({ where }),
      ]);

      res.json({
        orders: orders.map(order => ({
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
          priority: order.priority,
          estimatedDuration: order.estimatedDuration,
          assignedAt: order.assignedAt?.toISOString(),
          pickedUpAt: order.pickedUpAt?.toISOString(),
          deliveredAt: order.deliveredAt?.toISOString(),
          cancelledAt: order.cancelledAt?.toISOString(),
          cancellationReason: order.cancellationReason,
          createdAt: order.createdAt.toISOString(),
          agent: order.agent ? {
            id: order.agent.id,
            name: order.agent.user.name,
            phone: order.agent.user.phone,
            vehicleType: order.agent.vehicleType,
          } : null,
        })),
        total,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner/orders/:id - Get order details
  async getOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const orderId = req.params.id;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          partnerId, // Ensure partner owns this order
        },
        include: {
          agent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
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
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({
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
        priority: order.priority,
        estimatedDuration: order.estimatedDuration,
        actualDuration: order.actualDuration,
        assignedAt: order.assignedAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        cancellationReason: order.cancellationReason,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        agent: order.agent ? {
          id: order.agent.id,
          name: order.agent.user.name,
          email: order.agent.user.email,
          phone: order.agent.user.phone,
          vehicleType: order.agent.vehicleType,
          rating: order.agent.rating,
        } : null,
        partner: {
          id: order.partner.id,
          companyName: order.partner.companyName,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/partner-api/orders - Create order (external API with API key)
  async createOrderExternal(req: Request, res: Response, next: NextFunction) {
    try {
      // Partner info is attached by authenticateApiKey middleware
      const partner = req.partner;
      if (!partner) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        payoutAmount,
        priority = 'NORMAL',
        estimatedDuration,
      } = req.body;

      // Create order
      const order = await prisma.order.create({
        data: {
          partnerId: partner.partnerId,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          payoutAmount,
          priority,
          estimatedDuration,
          status: 'SEARCHING_AGENT',
        },
      });

      // Notify partner via webhook
      await notifyPartner(
        partner.partnerId,
        'ORDER_CREATED',
        order.id,
        order.status,
        {
          trackingNumber: order.id.substring(0, 8).toUpperCase(),
          payout: order.payoutAmount,
        }
      );

      res.status(201).json({
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
        priority: order.priority,
        estimatedDuration: order.estimatedDuration,
        createdAt: order.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner-api/orders/:id - Get order details (external API with API key)
  async getOrderDetailsExternal(req: Request, res: Response, next: NextFunction) {
    try {
      const partner = req.partner;
      if (!partner) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orderId = req.params.id;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          partnerId: partner.partnerId, // Ensure partner owns this order
        },
        include: {
          agent: {
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
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({
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
        priority: order.priority,
        estimatedDuration: order.estimatedDuration,
        actualDuration: order.actualDuration,
        assignedAt: order.assignedAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        cancellationReason: order.cancellationReason,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        agent: order.agent ? {
          name: order.agent.user.name,
          phone: order.agent.user.phone,
          vehicleType: order.agent.vehicleType,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/partner/orders/:id - Update order details
  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const orderId = req.params.id;
      const {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        payoutAmount,
        priority,
        estimatedDuration,
      } = req.body;

      // Find the order and verify ownership
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          partnerId, // Ensure partner owns this order
        },
      });

      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Only allow editing if order is still searching for an agent (not assigned yet)
      if (existingOrder.status !== 'SEARCHING_AGENT') {
        return res.status(403).json({ 
          error: 'Cannot edit order. Order has already been assigned to an agent.' 
        });
      }

      // Build update data with only provided fields
      const updateData: any = {};
      if (pickupLat !== undefined) updateData.pickupLat = pickupLat;
      if (pickupLng !== undefined) updateData.pickupLng = pickupLng;
      if (dropLat !== undefined) updateData.dropLat = dropLat;
      if (dropLng !== undefined) updateData.dropLng = dropLng;
      if (payoutAmount !== undefined) updateData.payoutAmount = payoutAmount;
      if (priority !== undefined) updateData.priority = priority;
      if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;

      // Update the order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
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
      });

      // Notify partner via webhook
      await notifyPartner(
        partnerId,
        'ORDER_UPDATED',
        updatedOrder.id,
        updatedOrder.status,
        {
          trackingNumber: updatedOrder.id.substring(0, 8).toUpperCase(),
          changes: Object.keys(updateData),
        }
      );

      res.json({
        id: updatedOrder.id,
        trackingNumber: updatedOrder.id.substring(0, 8).toUpperCase(),
        status: updatedOrder.status,
        pickup: {
          latitude: updatedOrder.pickupLat,
          longitude: updatedOrder.pickupLng,
        },
        dropoff: {
          latitude: updatedOrder.dropLat,
          longitude: updatedOrder.dropLng,
        },
        payout: updatedOrder.payoutAmount,
        priority: updatedOrder.priority,
        estimatedDuration: updatedOrder.estimatedDuration,
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner/dashboard - Get partner dashboard KPIs
  async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        todayOrders,
        thisMonthOrders,
        lastMonthOrders,
        activeOrders,
        cancelledOrders,
        totalCompletedOrders,
      ] = await Promise.all([
        // Today's orders
        prisma.order.count({
          where: {
            partnerId,
            createdAt: { gte: todayStart },
          },
        }),
        // This month's orders
        prisma.order.count({
          where: {
            partnerId,
            createdAt: { gte: thisMonthStart },
          },
        }),
        // Last month's orders (for comparison)
        prisma.order.count({
          where: {
            partnerId,
            createdAt: {
              gte: lastMonthStart,
              lte: lastMonthEnd,
            },
          },
        }),
        // Active orders (searching, assigned, picked up, out for delivery)
        prisma.order.count({
          where: {
            partnerId,
            status: {
              in: [
                OrderStatus.SEARCHING_AGENT,
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
        }),
        // Cancelled orders (delivery issues)
        prisma.order.count({
          where: {
            partnerId,
            status: OrderStatus.CANCELLED,
            cancelledAt: { gte: todayStart },
          },
        }),
        // Total completed orders
        prisma.order.count({
          where: {
            partnerId,
            status: OrderStatus.DELIVERED,
          },
        }),
      ]);

      // Calculate trends
      const monthlyTrend = lastMonthOrders > 0
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : 0;

      res.json({
        todayOrders,
        monthlyOrders: thisMonthOrders,
        monthlyTrend: Math.round(monthlyTrend),
        activeOrders,
        deliveryIssues: cancelledOrders,
        totalDeliveries: totalCompletedOrders,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner/analytics - Get partner analytics
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const { startDate, endDate } = req.query;
      
      // Default to last 30 days if not specified
      const start = startDate 
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate 
        ? new Date(endDate as string)
        : new Date();

      // Get order statistics
      const [
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeOrders,
        totalPayout,
        ordersByStatus,
        ordersByDay,
        avgDeliveryTime,
      ] = await Promise.all([
        // Total orders
        prisma.order.count({
          where: {
            partnerId,
            createdAt: { gte: start, lte: end },
          },
        }),
        // Completed orders
        prisma.order.count({
          where: {
            partnerId,
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
          },
        }),
        // Cancelled orders
        prisma.order.count({
          where: {
            partnerId,
            status: 'CANCELLED',
            cancelledAt: { gte: start, lte: end },
          },
        }),
        // Active orders
        prisma.order.count({
          where: {
            partnerId,
            status: {
              in: [
                OrderStatus.SEARCHING_AGENT,
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
        }),
        // Total payout
        prisma.order.aggregate({
          where: {
            partnerId,
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
          },
          _sum: {
            payoutAmount: true,
          },
        }),
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          where: {
            partnerId,
            createdAt: { gte: start, lte: end },
          },
          _count: {
            id: true,
          },
        }),
        // Orders by day - fetch all orders and group in JavaScript
        prisma.order.findMany({
          where: {
            partnerId,
            createdAt: { gte: start, lte: end },
          },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        // Average delivery time
        prisma.order.aggregate({
          where: {
            partnerId,
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
            actualDuration: { not: null },
          },
          _avg: {
            actualDuration: true,
          },
        }),
      ]);

      // Format orders by day - group by date
      const ordersByDate = new Map<string, number>();
      ordersByDay.forEach((order: any) => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        ordersByDate.set(dateKey, (ordersByDate.get(dateKey) || 0) + 1);
      });
      
      const dailyOrders = Array.from(ordersByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30); // Limit to 30 days

      // Format orders by status
      const statusBreakdown = ordersByStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {});

      res.json({
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalOrders,
          completedOrders,
          cancelledOrders,
          activeOrders,
          totalPayout: totalPayout._sum.payoutAmount || 0,
          avgDeliveryTime: avgDeliveryTime._avg.actualDuration || 0,
          completionRate: totalOrders > 0 
            ? ((completedOrders / totalOrders) * 100).toFixed(1)
            : '0',
          cancellationRate: totalOrders > 0
            ? ((cancelledOrders / totalOrders) * 100).toFixed(1)
            : '0',
        },
        breakdown: {
          byStatus: statusBreakdown,
          byDay: dailyOrders,
        },
      });
    } catch (error: any) {
      console.error('[Partner Analytics] Error:', error);
      console.error('[Partner Analytics] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
};

