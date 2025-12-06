import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getPartnerId, getUserId } from '../utils/role.util';
import { notifyPartner } from '../lib/webhook';
import { OrderStatus, EventType, ActorType } from '@prisma/client';
import { eventService } from '../services/event.service';
import { cacheService, cacheKeys } from '../services/cache.service';

export const partnerController = {
  // GET /api/partner/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      // Try cache first (TTL: 5 minutes)
      const cacheKey = cacheKeys.partner.profile(partnerId);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
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

      const response = {
        id: partner.id,
        companyName: partner.companyName,
        apiKey: partner.apiKey,
        webhookUrl: partner.webhookUrl,
        isActive: partner.isActive,
        user: partner.user,
      };

      // Cache the response
      await cacheService.set(cacheKey, response, 300); // 5 minutes

      res.json(response);
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

      // Invalidate cache
      await cacheService.invalidate(cacheKeys.partner.profile(partnerId));

      res.json({
        id: partner.id,
        webhookUrl: partner.webhookUrl,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/partner/regenerate-api-key
  async regenerateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      // Generate new API key using the same format as registration
      const newApiKey = `pk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const partner = await prisma.partner.update({
        where: { id: partnerId },
        data: { apiKey: newApiKey },
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

      // Log API key regeneration event
      eventService.logPartnerEvent(
        EventType.ORDER_CREATED, // We'll need to add a new event type, but using existing for now
        partnerId,
        partner.user.id,
        { action: 'API_KEY_REGENERATED' }
      );

      // Invalidate cache
      await cacheService.invalidate(cacheKeys.partner.profile(partnerId));

      res.json({
        id: partner.id,
        apiKey: partner.apiKey,
        message: 'API key regenerated successfully. Please update your integrations with the new key.',
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
        orderAmount, // What partner charges customer
        orderType = 'ON_DEMAND', // ON_DEMAND or B2B_BULK
        commissionRate, // Optional custom commission rate
        priority = 'NORMAL',
        estimatedDuration,
      } = req.body;

      // Validate commission rate based on order type
      let finalCommissionRate = commissionRate;
      if (!finalCommissionRate) {
        // Default commission rates
        finalCommissionRate = orderType === 'B2B_BULK' ? 10 : 20; // 10% for B2B, 20% for ON_DEMAND
      } else {
        // Validate commission rate is within allowed range
        if (orderType === 'B2B_BULK') {
          finalCommissionRate = Math.max(8, Math.min(12, finalCommissionRate)); // 8-12% for B2B
        } else {
          finalCommissionRate = Math.max(15, Math.min(30, finalCommissionRate)); // 15-30% for ON_DEMAND
        }
      }

      // Calculate order amount if not provided (default: payoutAmount * 1.25 for 25% partner markup)
      const finalOrderAmount = orderAmount || (payoutAmount * 1.25);

      // Create order first (barcode/QR will be generated after)
      // Try with all fields first, fallback to basic fields if columns don't exist
      let order;
      try {
        order = await prisma.order.create({
          data: {
            partnerId,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
            payoutAmount,
            orderAmount: finalOrderAmount,
            orderType: orderType as 'ON_DEMAND' | 'B2B_BULK',
            commissionRate: finalCommissionRate,
            priority,
            estimatedDuration,
            status: 'SEARCHING_AGENT',
          },
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
            createdAt: true,
            partner: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    id: true,
                  },
                },
              },
            },
          },
        });
      } catch (createError: any) {
        // If columns don't exist (P2021/P2022), create order without them
        if (createError?.code === 'P2021' || createError?.code === 'P2022' || 
            createError?.message?.includes('orderAmount') || 
            createError?.message?.includes('commissionRate') ||
            createError?.message?.includes('orderType') ||
            createError?.message?.includes('does not exist')) {
          console.warn('[Partner] Order columns missing, creating order without revenue fields:', createError.message);
          
          // Try creating with minimal fields - catch any additional missing column errors
          try {
            order = await prisma.order.create({
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
                createdAt: true,
                partner: {
                  select: {
                    id: true,
                    user: {
                      select: {
                        name: true,
                        id: true,
                      },
                    },
                  },
                },
              },
            });
          } catch (fallbackError: any) {
            // If even basic fields fail, try with absolute minimum
            if (fallbackError?.code === 'P2021' || fallbackError?.code === 'P2022' || 
                fallbackError?.message?.includes('does not exist')) {
              console.warn('[Partner] Additional columns missing, trying absolute minimum fields:', fallbackError.message);
              order = await prisma.order.create({
                data: {
                  partnerId,
                  pickupLat,
                  pickupLng,
                  dropLat,
                  dropLng,
                  payoutAmount,
                  status: 'SEARCHING_AGENT',
                },
                select: {
                  id: true,
                  status: true,
                  pickupLat: true,
                  pickupLng: true,
                  dropLat: true,
                  dropLng: true,
                  payoutAmount: true,
                  createdAt: true,
                  partner: {
                    select: {
                      id: true,
                      user: {
                        select: {
                          name: true,
                          id: true,
                        },
                      },
                    },
                  },
                },
              });
        } else {
          // Re-throw if it's a different error
          throw createError;
        }
      }

      // Generate and assign barcode/QR code after order creation
      try {
        const { barcodeService } = await import('../services/barcode.service');
        await barcodeService.assignBarcodeToOrder(order.id);
      } catch (error: any) {
        // Log but don't fail if barcode service has issues
        console.warn('[Partner] Barcode service error:', error.message);
      }

      // Fetch updated order (using select to avoid non-existent columns)
      const orderWithBarcode = await prisma.order.findUnique({
        where: { id: order.id },
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
          createdAt: true,
          partner: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      // Log order creation event
      eventService.logOrderEvent(
        EventType.ORDER_CREATED,
        orderWithBarcode!.id,
        ActorType.PARTNER,
        orderWithBarcode!.partner.user.id,
        {
          partnerId,
          payoutAmount,
          priority,
          estimatedDuration,
        }
      );

      // Trigger order assignment engine (Phase 5)
      // This will find nearby agents and offer the order to them
      // Assignment happens when an agent accepts the order
      const { assignOrder } = await import('../services/assignment.service');
      const finalOrder = orderWithBarcode || order;
      console.log(`[Partner] Triggering assignment for order ${finalOrder.id} at (${finalOrder.pickupLat}, ${finalOrder.pickupLng})`);
      assignOrder({
        orderId: finalOrder.id,
        pickupLat: finalOrder.pickupLat,
        pickupLng: finalOrder.pickupLng,
        payoutAmount: finalOrder.payoutAmount,
        priority: (finalOrder.priority as 'HIGH' | 'NORMAL' | 'LOW') || 'NORMAL',
        maxRadius: 5000, // 5km
        maxAgentsToOffer: 5,
        offerTimeout: 30, // 30 seconds
      })
        .then((result) => {
          console.log(`[Partner] Assignment result for order ${finalOrder.id}:`, {
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
        finalOrder.id,
        finalOrder.status,
        {
          trackingNumber: finalOrder.id.substring(0, 8).toUpperCase(),
          payout: finalOrder.payoutAmount,
        }
      );

      res.status(201).json({
        id: finalOrder.id,
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

      // Calculate timing information for each order
      const { delayCheckerService } = await import('../services/delay-checker.service');
      
      res.json({
        orders: orders.map(order => {
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
            priority: order.priority,
            estimatedDuration: order.estimatedDuration,
            assignedAt: order.assignedAt?.toISOString(),
            pickedUpAt: order.pickedUpAt?.toISOString(),
            deliveredAt: order.deliveredAt?.toISOString(),
            cancelledAt: order.cancelledAt?.toISOString(),
            cancellationReason: order.cancellationReason,
            createdAt: order.createdAt.toISOString(),
            timing: {
              elapsedMinutes: timing.elapsedMinutes,
              remainingMinutes: timing.remainingMinutes,
              isDelayed: timing.isDelayed,
              elapsedTime: timing.elapsedTime,
              remainingTime: timing.remainingTime,
            },
            agent: order.agent ? {
              id: order.agent.id,
              name: order.agent.user.name,
              phone: order.agent.user.phone,
              vehicleType: order.agent.vehicleType,
            } : null,
          };
        }),
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
          actualDuration: true,
          assignedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          cancelledAt: true,
          cancellationReason: true,
          createdAt: true,
          updatedAt: true,
          agent: {
            select: {
              id: true,
              vehicleType: true,
              rating: true,
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
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check and update delayed status
      try {
        const { delayCheckerService } = await import('../services/delay-checker.service');
        await delayCheckerService.checkOrderDelay(orderId);
      } catch (error: any) {
        // Log but don't fail if delay checker service has issues
        console.warn('[Partner] Delay checker service error:', error.message);
      }
      
      // Refresh order to get updated status (using select to avoid non-existent columns)
      let refreshedOrder = null;
      try {
        refreshedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            pickedUpAt: true,
            estimatedDuration: true,
          },
        });
      } catch (error: any) {
        console.warn('[Partner] Error refreshing order:', error.message);
      }
      
      // Calculate timing information
      let timing = {
        elapsedMinutes: 0,
        remainingMinutes: 0,
        isDelayed: false,
        elapsedTime: '0m',
        remainingTime: '0m',
      };
      try {
        const { delayCheckerService } = await import('../services/delay-checker.service');
        timing = delayCheckerService.getOrderTiming({
          pickedUpAt: refreshedOrder?.pickedUpAt || order.pickedUpAt,
          estimatedDuration: refreshedOrder?.estimatedDuration || order.estimatedDuration,
        });
      } catch (error: any) {
        console.warn('[Partner] Error calculating timing:', error.message);
      }

      res.json({
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
        timing: {
          elapsedMinutes: timing.elapsedMinutes,
          remainingMinutes: timing.remainingMinutes,
          isDelayed: timing.isDelayed,
          elapsedTime: timing.elapsedTime,
          remainingTime: timing.remainingTime,
        },
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
        orderAmount, // What partner charges customer
        orderType = 'ON_DEMAND', // ON_DEMAND or B2B_BULK
        commissionRate, // Optional custom commission rate
        priority = 'NORMAL',
        estimatedDuration,
      } = req.body;

      // Validate commission rate based on order type
      let finalCommissionRate = commissionRate;
      if (!finalCommissionRate) {
        // Default commission rates
        finalCommissionRate = orderType === 'B2B_BULK' ? 10 : 20; // 10% for B2B, 20% for ON_DEMAND
      } else {
        // Validate commission rate is within allowed range
        if (orderType === 'B2B_BULK') {
          finalCommissionRate = Math.max(8, Math.min(12, finalCommissionRate)); // 8-12% for B2B
        } else {
          finalCommissionRate = Math.max(15, Math.min(30, finalCommissionRate)); // 15-30% for ON_DEMAND
        }
      }

      // Calculate order amount if not provided (default: payoutAmount * 1.25 for 25% partner markup)
      const finalOrderAmount = orderAmount || (payoutAmount * 1.25);

      // Create order first
      // Try with all fields first, fallback to basic fields if columns don't exist
      let order;
      try {
        order = await prisma.order.create({
          data: {
            partnerId: partner.partnerId,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
            payoutAmount,
            orderAmount: finalOrderAmount,
            orderType: orderType as 'ON_DEMAND' | 'B2B_BULK',
            commissionRate: finalCommissionRate,
            priority,
            estimatedDuration,
            status: 'SEARCHING_AGENT',
          },
        });
      } catch (createError: any) {
        // If columns don't exist (P2021/P2022), create order without them
        if (createError?.code === 'P2021' || createError?.code === 'P2022' || 
            createError?.message?.includes('orderAmount') || 
            createError?.message?.includes('commissionRate') ||
            createError?.message?.includes('orderType')) {
          console.warn('[Partner API] Order columns missing, creating order without revenue fields:', createError.message);
          
          // Try creating with minimal fields - catch any additional missing column errors
          try {
            order = await prisma.order.create({
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
          } catch (fallbackError: any) {
            // If even basic fields fail, try with absolute minimum
            if (fallbackError?.code === 'P2021' || fallbackError?.code === 'P2022' || 
                fallbackError?.message?.includes('does not exist') ||
                fallbackError?.message?.includes('priority') ||
                fallbackError?.message?.includes('estimatedDuration')) {
              console.warn('[Partner API] Additional columns missing, trying absolute minimum fields:', fallbackError.message);
              order = await prisma.order.create({
                data: {
                  partnerId: partner.partnerId,
                  pickupLat,
                  pickupLng,
                  dropLat,
                  dropLng,
                  payoutAmount,
                  status: 'SEARCHING_AGENT',
                },
              });
            } else {
              // Re-throw if it's a different error
              throw fallbackError;
            }
          }
        } else {
          // Re-throw if it's a different error
          throw createError;
        }
      }

      // Generate and assign barcode/QR code after order creation
      const { barcodeService } = await import('../services/barcode.service');
      await barcodeService.assignBarcodeToOrder(order.id);

      // Fetch updated order with barcode/QR
      const orderWithBarcode = await prisma.order.findUnique({
        where: { id: order.id },
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
          createdAt: true,
          updatedAt: true,
          partner: {
            select: {
              id: true,
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

      // Try cache first (TTL: 2 minutes - dashboard data changes frequently)
      const cacheKey = cacheKeys.partner.dashboard(partnerId);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
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

      const response = {
        todayOrders,
        monthlyOrders: thisMonthOrders,
        monthlyTrend: Math.round(monthlyTrend),
        activeOrders,
        deliveryIssues: cancelledOrders,
        totalDeliveries: totalCompletedOrders,
      };

      // Cache the response (2 minutes TTL)
      await cacheService.set(cacheKey, response, 120);

      res.json(response);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/partner/analytics/heatmap - Get order locations for heatmap
  async getOrderHeatmap(req: Request, res: Response, next: NextFunction) {
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

      // Get order locations (pickup and dropoff points)
      const orders = await prisma.order.findMany({
        where: {
          partnerId,
          createdAt: { gte: start, lte: end },
        },
        select: {
          pickupLat: true,
          pickupLng: true,
          dropLat: true,
          dropLng: true,
          status: true,
          createdAt: true,
        },
      });

      // Format data for heatmap: [lng, lat, intensity]
      const heatmapData = orders.flatMap((order) => [
        {
          location: [order.pickupLng, order.pickupLat] as [number, number],
          type: 'pickup' as const,
          status: order.status,
          date: order.createdAt.toISOString(),
        },
        {
          location: [order.dropLng, order.dropLat] as [number, number],
          type: 'dropoff' as const,
          status: order.status,
          date: order.createdAt.toISOString(),
        },
      ]);

      res.json({
        data: heatmapData,
        bounds: orders.length > 0 ? {
          minLng: Math.min(...orders.map(o => Math.min(o.pickupLng, o.dropLng))),
          maxLng: Math.max(...orders.map(o => Math.max(o.pickupLng, o.dropLng))),
          minLat: Math.min(...orders.map(o => Math.min(o.pickupLat, o.dropLat))),
          maxLat: Math.max(...orders.map(o => Math.max(o.pickupLat, o.dropLat))),
        } : null,
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

  // GET /api/partner/support/tickets - Get partner's support tickets
  async getSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const partnerId = getPartnerId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        userId,
        ...(partnerId ? { partnerId } : {}),
      };

      if (status && status !== 'ALL') {
        where.status = status;
      }

      let tickets: any[] = [];
      let total = 0;

      try {
        [tickets, total] = await Promise.all([
          prisma.supportTicket.findMany({
            where,
            select: {
              id: true,
              issueType: true,
              description: true,
              status: true,
              resolvedAt: true,
              createdAt: true,
              updatedAt: true,
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
      } catch (error: any) {
        // Handle missing SupportTicket table
        if (error.code === 'P2021' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[Partner] SupportTicket table does not exist, returning empty results');
          return res.json({
            tickets: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0,
            },
          });
        }
        throw error;
      }

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

  // POST /api/partner/support/tickets - Create support ticket
  async createSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const partnerId = getPartnerId(req);
      
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

      // Verify order exists and belongs to partner if orderId is provided
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }

        if (order.partnerId !== partnerId) {
          return res.status(403).json({ error: 'You can only create tickets for your own orders' });
        }
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          partnerId: partnerId || null,
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

