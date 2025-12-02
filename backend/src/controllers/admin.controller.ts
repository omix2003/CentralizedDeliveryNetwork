import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { redisGeo, getRedisClient, isRedisConnected } from '../lib/redis';
import { OrderStatus, AgentStatus, EventType, ActorType } from '@prisma/client';
import { eventService } from '../services/event.service';
import { getUserId } from '../utils/role.util';

export const adminController = {
  // ==================== METRICS ====================
  
  // GET /api/admin/metrics/overview
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalAgents,
        totalPartners,
        totalOrders,
        activeAgents,
        onlineAgents,
        onTripAgents,
        todayOrders,
        thisMonthOrders,
        pendingOrders,
        completedOrders,
        activePartners,
      ] = await Promise.all([
        prisma.agent.count(),
        prisma.partner.count(),
        prisma.order.count(),
        prisma.agent.count({
          where: { 
            status: { in: ['ONLINE', 'ON_TRIP'] },
            isApproved: true,
          },
        }),
        prisma.agent.count({
          where: { status: 'ONLINE' },
        }),
        prisma.agent.count({
          where: { status: 'ON_TRIP' },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: todayStart },
          },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: thisMonthStart },
          },
        }),
        prisma.order.count({
          where: { status: 'SEARCHING_AGENT' },
        }),
        prisma.order.count({
          where: { status: 'DELIVERED' },
        }),
        prisma.partner.count({
          where: { isActive: true },
        }),
      ]);

      res.json({
        totalAgents,
        totalPartners,
        totalOrders,
        activeAgents,
        onlineAgents,
        onTripAgents,
        todayOrders,
        thisMonthOrders,
        pendingOrders,
        completedOrders,
        activePartners,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/metrics/orders
  async getOrderMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Orders by status
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: true,
      });

      // Orders over time (daily)
      // Use Prisma's field name format - PostgreSQL column is "createdAt" (camelCase)
      const ordersOverTime = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM "Order"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      // Revenue (sum of payout amounts)
      const revenue = await prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          payoutAmount: true,
        },
      });

      res.json({
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status,
          count: item._count,
        })),
        ordersOverTime: ordersOverTime.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
        totalRevenue: revenue._sum.payoutAmount || 0,
        period: { start, end },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/metrics/agents
  async getAgentMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        agentsByStatus,
        agentsByVehicleType,
        averageRating,
        totalCompletedOrders,
      ] = await Promise.all([
        prisma.agent.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.agent.groupBy({
          by: ['vehicleType'],
          _count: true,
        }),
        prisma.agent.aggregate({
          _avg: {
            rating: true,
          },
          where: {
            rating: { not: null },
          },
        }),
        prisma.agent.aggregate({
          _sum: {
            completedOrders: true,
          },
        }),
      ]);

      res.json({
        agentsByStatus: agentsByStatus.map((item) => ({
          status: item.status,
          count: item._count,
        })),
        agentsByVehicleType: agentsByVehicleType.map((item) => ({
          vehicleType: item.vehicleType,
          count: item._count,
        })),
        averageRating: averageRating._avg.rating || 0,
        totalCompletedOrders: totalCompletedOrders._sum.completedOrders || 0,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/metrics/partners
  async getPartnerMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const partners = await prisma.partner.findMany({
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      const partnerStats = partners.map((partner) => ({
        id: partner.id,
        companyName: partner.companyName,
        isActive: partner.isActive,
        totalOrders: partner._count.orders,
      }));

      res.json({
        totalPartners: partners.length,
        activePartners: partners.filter((p) => p.isActive).length,
        partnerStats,
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== AGENT MANAGEMENT ====================

  // GET /api/admin/agents
  async getAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        status, 
        isApproved, 
        isBlocked, 
        city, 
        vehicleType,
        search,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (status) where.status = status;
      if (isApproved !== undefined) where.isApproved = isApproved === 'true';
      if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true';
      if (city) where.city = { contains: city as string, mode: 'insensitive' };
      if (vehicleType) where.vehicleType = vehicleType;

      if (search) {
        where.OR = [
          { user: { name: { contains: search as string, mode: 'insensitive' } } },
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
          { user: { phone: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [agents, total] = await Promise.all([
        prisma.agent.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profilePicture: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.agent.count({ where }),
      ]);

      res.json({
        agents,
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

  // GET /api/admin/agents/:id
  async getAgentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profilePicture: true,
              createdAt: true,
            },
          },
          documents: true,
          orders: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              partner: {
                include: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json(agent);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/agents/:id/approve
  async approveAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.update({
        where: { id },
        data: {
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log agent approval event
      const userId = getUserId(req);
      await eventService.logAdminEvent(
        EventType.AGENT_ONLINE, // Using existing event type, metadata will clarify it's approval
        userId,
        'AGENT',
        id,
        {
          action: 'AGENT_APPROVED',
          agentId: id,
          agentName: agent.user.name,
        }
      );

      res.json({
        message: 'Agent approved successfully',
        agent,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/agents/:id/block
  async blockAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const agent = await prisma.agent.update({
        where: { id },
        data: {
          isBlocked: true,
          blockedReason: reason || 'Blocked by admin',
          status: 'OFFLINE',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log agent blocking event
      const userId = getUserId(req);
      await eventService.logAdminEvent(
        EventType.AGENT_OFFLINE, // Using existing event type, metadata will clarify it's blocking
        userId,
        'AGENT',
        id,
        {
          action: 'AGENT_BLOCKED',
          agentId: id,
          agentName: agent.user.name,
          reason: reason || 'Blocked by admin',
        }
      );

      // Remove agent location from Redis
      await redisGeo.removeAgentLocation(id);

      res.json({
        message: 'Agent blocked successfully',
        agent,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/agents/:id
  async deleteAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if agent exists
      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Warn if agent has active orders
      if (agent._count.orders > 0) {
        // Check for active orders
        const activeOrdersCount = await prisma.order.count({
          where: {
            agentId: id,
            status: {
              in: [
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
        });

        if (activeOrdersCount > 0) {
          return res.status(400).json({
            error: `Cannot delete agent with ${activeOrdersCount} active order(s). Please complete or cancel all active orders first.`,
          });
        }
      }

      // Delete agent and related data in a transaction
      await prisma.$transaction(async (tx) => {
        const userId = agent.user.id;

        // Delete agent's orders first (required because agentId might be referenced)
        await tx.order.deleteMany({
          where: { agentId: id },
        });

        // Delete agent's support tickets
        await tx.supportTicket.deleteMany({
          where: { agentId: id },
        });

        // Note: AgentDocument and AgentLocation will be cascade deleted
        // when the agent is deleted, but we need to delete the user first
        // which will cascade delete the agent

        // Delete the user (this will cascade delete the agent due to onDelete: Cascade)
        await tx.user.delete({
          where: { id: userId },
        });
      });

      // Remove agent location from Redis if connected
      try {
        await redisGeo.removeAgentLocation(id);
      } catch (redisError) {
        // Log but don't fail if Redis cleanup fails
        console.warn('[Admin] Failed to remove agent location from Redis:', redisError);
      }

      res.json({
        message: 'Agent deleted successfully',
        deletedAgentId: id,
      });
    } catch (error: any) {
      console.error('[Admin] Error deleting agent:', error);
      console.error('[Admin] Error details:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });

      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({
          error: 'Cannot delete agent. There are active orders or other dependencies.',
        });
      }

      // Handle record not found errors
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Agent not found or already deleted.',
        });
      }

      // Return a more user-friendly error message
      return res.status(500).json({
        error: error.message || 'Failed to delete agent. Please try again.',
      });
    }
  },

  // PUT /api/admin/agents/:id/location - Update agent location (admin only)
  async updateAgentLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Latitude and longitude must be numbers' });
      }

      // Check if agent exists
      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Update location in Redis GEO (for real-time queries)
      await redisGeo.addAgentLocation(id, longitude, latitude);

      // Store in database for history
      await prisma.agentLocation.create({
        data: {
          agentId: id,
          latitude,
          longitude,
        },
      });

      // Update lastOnlineAt timestamp
      await prisma.agent.update({
        where: { id },
        data: { lastOnlineAt: new Date() },
      });

      res.json({
        message: 'Agent location updated successfully',
        agent: {
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
        },
        location: {
          latitude,
          longitude,
        },
      });
    } catch (error: any) {
      console.error('[Admin] Error updating agent location:', error);
      next(error);
    }
  },

  // POST /api/admin/agents/:id/unblock
  async unblockAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.update({
        where: { id },
        data: {
          isBlocked: false,
          blockedReason: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log agent unblocking event
      const userId = getUserId(req);
      await eventService.logAdminEvent(
        EventType.AGENT_ONLINE, // Using existing event type, metadata will clarify it's unblocking
        userId,
        'AGENT',
        id,
        {
          action: 'AGENT_UNBLOCKED',
          agentId: id,
          agentName: agent.user.name,
        }
      );

      res.json({
        message: 'Agent unblocked successfully',
        agent,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/agents/locations
  async getAgentLocations(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all agents from database (not just those with Redis locations)
      const allAgents = await prisma.agent.findMany({
        where: {
          isApproved: true, // Only show approved agents
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      const agentLocations: any[] = [];

      // If Redis is connected, get locations from Redis GEO
      if (isRedisConnected()) {
        const client = getRedisClient();
        if (client) {
          // Get all members of the GEO set
          const redisMembers = await client.zrange('agents_locations', 0, -1);
          const redisAgentIds = redisMembers as string[];

          // Get coordinates for agents that have Redis locations
          await Promise.all(
            redisAgentIds.map(async (agentId) => {
              const agent = allAgents.find((a) => a.id === agentId);
              if (!agent) return;

          // Get coordinates from Redis GEO
          const position = await client.geopos('agents_locations', agentId);
          
          if (!position || position.length === 0 || !position[0]) {
                return;
              }

              // Redis GEO returns coordinates as strings, parse them to numbers
              const [lonStr, latStr] = position[0] as [string | null, string | null];
              if (!lonStr || !latStr) {
                return;
              }
              
              const longitude = parseFloat(lonStr);
              const latitude = parseFloat(latStr);
              
              if (isNaN(longitude) || isNaN(latitude)) {
                return;
              }

              agentLocations.push({
            agentId,
              longitude,
              latitude,
                hasLocation: true,
                agent: {
                  id: agent.id,
                  status: agent.status,
                  user: agent.user,
                },
              });
            })
          );
        }
      }

      // For agents without Redis locations, try to get their last known location from database
      const agentsWithLocations = new Set(agentLocations.map((loc) => loc.agentId));
      const agentsWithoutRedisLocations = allAgents.filter(
        (agent) => !agentsWithLocations.has(agent.id)
      );

      if (agentsWithoutRedisLocations.length > 0) {
        // Get last known locations from database for agents without Redis locations
        const agentIds = agentsWithoutRedisLocations.map((a) => a.id);
        const allRecentLocations = await prisma.agentLocation.findMany({
          where: {
            agentId: { in: agentIds },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        // Group by agentId and get the most recent location for each agent
        const locationMap = new Map<string, { lat: number; lng: number }>();
        for (const loc of allRecentLocations) {
          if (!locationMap.has(loc.agentId)) {
            locationMap.set(loc.agentId, { lat: loc.latitude, lng: loc.longitude });
          }
        }

        // Add agents with database locations or mark as having no location
        agentsWithoutRedisLocations.forEach((agent) => {
          const lastLocation = locationMap.get(agent.id);
          if (lastLocation) {
            agentLocations.push({
              agentId: agent.id,
              longitude: lastLocation.lng,
              latitude: lastLocation.lat,
              hasLocation: true, // Has location from database
              agent: {
                id: agent.id,
                status: agent.status,
                user: agent.user,
              },
            });
          } else {
            agentLocations.push({
              agentId: agent.id,
              longitude: null,
              latitude: null,
              hasLocation: false,
              agent: {
                id: agent.id,
                status: agent.status,
                user: agent.user,
              },
            });
          }
        });
      }

      console.log(`[Admin] Returning ${agentLocations.length} agent locations (${agentLocations.filter(loc => loc.hasLocation).length} with locations)`);
      res.json(agentLocations);
    } catch (error) {
      console.error('[Admin] Error getting agent locations:', error);
      next(error);
    }
  },

  // ==================== PARTNER MANAGEMENT ====================

  // GET /api/admin/partners
  async getPartners(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, search, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { companyName: { contains: search as string, mode: 'insensitive' } },
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [partners, total] = await Promise.all([
        prisma.partner.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profilePicture: true,
              },
            },
            _count: {
              select: {
                orders: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.partner.count({ where }),
      ]);

      res.json({
        partners,
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

  // GET /api/admin/partners/:id
  async getPartnerDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profilePicture: true,
            },
          },
          orders: {
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              agent: {
                include: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json(partner);
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/partners/:id
  async deletePartner(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if partner exists
      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Warn if partner has active orders
      if (partner._count.orders > 0) {
        // Check for active orders
        const activeOrdersCount = await prisma.order.count({
          where: {
            partnerId: id,
            status: {
              in: [
                OrderStatus.SEARCHING_AGENT,
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
        });

        if (activeOrdersCount > 0) {
          return res.status(400).json({
            error: `Cannot delete partner with ${activeOrdersCount} active order(s). Please cancel or complete all active orders first.`,
          });
        }
      }

      // Delete partner and related data in a transaction
      await prisma.$transaction(async (tx) => {
        const userId = partner.user.id;

        // Delete partner's orders first (required because partnerId is not nullable)
        // Note: This deletes all orders for historical accuracy
        // If you want to keep orders, you'd need to make partnerId nullable in the schema
        await tx.order.deleteMany({
          where: { partnerId: id },
        });

        // Delete partner's daily stats
        await tx.partnerDailyStats.deleteMany({
          where: { partnerId: id },
        });

        // Delete partner's support tickets
        await tx.supportTicket.deleteMany({
          where: { partnerId: id },
        });

        // Delete the user (this will cascade delete the partner due to onDelete: Cascade)
        await tx.user.delete({
          where: { id: userId },
        });
      });

      res.json({
        message: 'Partner deleted successfully',
        deletedPartnerId: id,
      });
    } catch (error: any) {
      console.error('[Admin] Error deleting partner:', error);
      console.error('[Admin] Error details:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });

      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({
          error: 'Cannot delete partner. There are active orders or other dependencies.',
        });
      }

      // Handle record not found errors
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Partner not found or already deleted.',
        });
      }

      // Return a more user-friendly error message
      return res.status(500).json({
        error: error.message || 'Failed to delete partner. Please try again.',
      });
    }
  },

  // ==================== ORDER MANAGEMENT ====================

  // GET /api/admin/orders
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        partnerId,
        agentId,
        search,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (status) where.status = status;
      if (partnerId) where.partnerId = partnerId;
      if (agentId) where.agentId = agentId;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            partner: {
              select: {
                id: true,
                companyName: true,
                isActive: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
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
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      res.json({
        orders,
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

  // GET /api/admin/orders/:id
  async getOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
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
          agent: {
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

      res.json(order);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/orders/:id/reassign
  async reassignOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      // Get current order
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // If order has current agent, remove assignment
      if (order.agentId) {
        await prisma.agent.update({
          where: { id: order.agentId },
          data: {
            currentOrderId: null,
            status: 'ONLINE',
          },
        });
      }

      // Reassign to new agent or set to searching
      if (agentId) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id },
            data: {
              agentId,
              status: 'ASSIGNED',
              assignedAt: new Date(),
            },
          });

          await tx.agent.update({
            where: { id: agentId },
            data: {
              currentOrderId: id,
              status: 'ON_TRIP',
            },
          });
        });
      } else {
        await prisma.order.update({
          where: { id },
          data: {
            agentId: null,
            status: 'SEARCHING_AGENT',
            assignedAt: null,
          },
        });

        // Trigger assignment engine
        const { assignOrder } = await import('../services/assignment.service');
        assignOrder({
          orderId: id,
          pickupLat: order.pickupLat,
          pickupLng: order.pickupLng,
          payoutAmount: order.payoutAmount,
          priority: (order.priority as 'HIGH' | 'NORMAL' | 'LOW') || 'NORMAL',
        });
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          agent: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Log order reassignment event
      const userId = getUserId(req);
      await eventService.logAdminEvent(
        EventType.ORDER_ASSIGNED,
        userId,
        'ORDER',
        id,
        {
          action: 'ORDER_REASSIGNED',
          previousAgentId: order.agentId,
          newAgentId: agentId || null,
          orderId: id,
        }
      );

      res.json({
        message: agentId ? 'Order reassigned successfully' : 'Order set to searching for new agent',
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/orders/:id/cancel
  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id },
        });

        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // If order is assigned, free the agent
        if (currentOrder.agentId) {
          await tx.agent.update({
            where: { id: currentOrder.agentId },
            data: {
              currentOrderId: null,
              status: 'ONLINE',
            },
          });
        }

        // Cancel the order
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason || 'Cancelled by admin',
          },
        });

        return updatedOrder;
      });

      // Notify partner
      const { notifyPartner } = await import('../lib/webhook');
      await notifyPartner(
        order.partnerId,
        'ORDER_CANCELLED',
        id,
        'CANCELLED',
        {
          reason: reason || 'Cancelled by admin',
        }
      );

      res.json({
        message: 'Order cancelled successfully',
        order,
      });
    } catch (error: any) {
      if (error.message === 'Order not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  },

  // GET /api/admin/activity - Get recent activity
  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '20' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      // Get recent events from AppEvent table
      const events = await prisma.appEvent.findMany({
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format events for response
      const activities = await Promise.all(
        events.map(async (event) => {
          let description = '';
          let color = 'gray';
          let icon = 'Activity';

          // Generate description based on event type
          switch (event.eventType) {
            case 'AGENT_ONLINE':
              description = 'Agent went online';
              color = 'green';
              break;
            case 'AGENT_OFFLINE':
              description = 'Agent went offline';
              color = 'gray';
              break;
            case 'ORDER_CREATED':
              description = 'New order created';
              color = 'blue';
              break;
            case 'ORDER_ASSIGNED':
              description = 'Order assigned to agent';
              color = 'purple';
              break;
            case 'ORDER_ACCEPTED':
              description = 'Order accepted by agent';
              color = 'blue';
              break;
            case 'ORDER_REJECTED':
              description = 'Order rejected by agent';
              color = 'orange';
              break;
            case 'ORDER_PICKED_UP':
              description = 'Order picked up';
              color = 'yellow';
              break;
            case 'ORDER_OUT_FOR_DELIVERY':
              description = 'Order out for delivery';
              color = 'blue';
              break;
            case 'ORDER_DELIVERED':
              description = 'Order delivered';
              color = 'green';
              break;
            case 'ORDER_CANCELLED':
              description = 'Order cancelled';
              color = 'red';
              break;
            case 'AGENT_LOCATION_UPDATE':
              description = 'Agent location updated';
              color = 'blue';
              break;
            default:
              description = 'System event';
          }

          // Get entity details if available
          let entityName = '';
          if (event.entityType === 'ORDER' && event.entityId) {
            try {
              const order = await prisma.order.findUnique({
                where: { id: event.entityId },
                select: { id: true },
              });
              if (order) {
                entityName = `Order #${order.id.slice(-6).toUpperCase()}`;
              }
            } catch (e) {
              // Ignore errors
            }
          } else if (event.entityType === 'AGENT' && event.entityId) {
            try {
              const agent = await prisma.agent.findUnique({
                where: { id: event.entityId },
                include: { user: { select: { name: true } } },
              });
              if (agent) {
                entityName = agent.user.name;
              }
            } catch (e) {
              // Ignore errors
            }
          } else if (event.entityType === 'PARTNER' && event.entityId) {
            try {
              const partner = await prisma.partner.findUnique({
                where: { id: event.entityId },
                include: { user: { select: { name: true } } },
              });
              if (partner) {
                entityName = partner.user.name;
              }
            } catch (e) {
              // Ignore errors
            }
          }

          return {
            id: event.id,
            description: entityName ? `${description}: ${entityName}` : description,
            type: event.eventType,
            actorType: event.actorType,
            entityType: event.entityType,
            entityId: event.entityId,
            color,
            createdAt: event.createdAt,
            metadata: event.metadata,
          };
        })
      );

      res.json(activities);
    } catch (error) {
      next(error);
    }
  },

  // ==================== KYC VERIFICATION ====================

  // GET /api/admin/agents/:id/documents
  async getAgentDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const documents = await prisma.agentDocument.findMany({
        where: { agentId: id },
        orderBy: { uploadedAt: 'desc' },
      });

      res.json({
        agent: {
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
          isApproved: agent.isApproved,
        },
        documents,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/documents/:id/verify
  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const document = await prisma.agentDocument.findUnique({
        where: { id },
        include: {
          agent: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Update document as verified
      const updatedDocument = await prisma.agentDocument.update({
        where: { id },
        data: {
          verified: true,
        },
      });

      // Check if all required documents are verified
      const allDocuments = await prisma.agentDocument.findMany({
        where: { agentId: document.agentId },
      });

      const requiredTypes = ['LICENSE', 'VEHICLE_REG', 'ID_PROOF'];
      const hasAllRequired = requiredTypes.every((type) =>
        allDocuments.some((doc) => doc.documentType === type && doc.verified)
      );

      // Auto-approve agent if all required documents are verified
      if (hasAllRequired && !document.agent.isApproved) {
        await prisma.agent.update({
          where: { id: document.agentId },
          data: {
            isApproved: true,
          },
        });
      }

      res.json({
        message: 'Document verified successfully',
        document: updatedDocument,
        agentAutoApproved: hasAllRequired && !document.agent.isApproved,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/documents/:id/reject
  async rejectDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const document = await prisma.agentDocument.findUnique({
        where: { id },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Mark document as not verified (reject)
      const updatedDocument = await prisma.agentDocument.update({
        where: { id },
        data: {
          verified: false,
        },
      });

      // If agent was auto-approved, revoke approval if required documents are not verified
      const agent = await prisma.agent.findUnique({
        where: { id: document.agentId },
        include: {
          documents: true,
        },
      });

      if (agent && agent.isApproved) {
        const requiredTypes = ['LICENSE', 'VEHICLE_REG', 'ID_PROOF'];
        const hasAllRequired = requiredTypes.every((type) =>
          agent.documents.some((doc) => doc.documentType === type && doc.verified)
        );

        if (!hasAllRequired) {
          await prisma.agent.update({
            where: { id: document.agentId },
            data: {
              isApproved: false,
            },
          });
        }
      }

      res.json({
        message: 'Document rejected',
        document: updatedDocument,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/agents/:id/verify-kyc
  async verifyAgentKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          documents: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Verify all documents
      await prisma.agentDocument.updateMany({
        where: { agentId: id },
        data: { verified: true },
      });

      // Approve agent
      const updatedAgent = await prisma.agent.update({
        where: { id },
        data: {
          isApproved: true,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          documents: true,
        },
      });

      res.json({
        message: 'Agent KYC verified and approved',
        agent: updatedAgent,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/kyc/pending
  async getPendingKYC(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[KYC] getPendingKYC called', { query: req.query });
      const { page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Get agents that need KYC verification:
      // All agents with isApproved: false (regardless of document status)
      // This includes:
      // - Agents with no documents
      // - Agents with unverified documents
      // - Agents with all documents verified but still not approved
      // Get all unapproved agents, including those with all documents verified
      // This ensures agents with complete documents but pending approval are visible
      // IMPORTANT: We return ALL agents with isApproved: false, regardless of document status
      // Optimize query by using select instead of include and only fetching needed document fields
      const agents = await prisma.agent.findMany({
        where: {
          isApproved: false,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          vehicleType: true,
          city: true,
          state: true,
          pincode: true,
          isApproved: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          documents: {
            select: {
              id: true,
              documentType: true,
              verified: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
      });

      // Debug logging (disabled for performance - enable only when debugging)
      // console.log(`[KYC] Query params: page=${pageNum}, limit=${limitNum}, skip=${skip}`);
      // console.log(`[KYC] Found ${agents.length} agents with isApproved: false`);

      // Count total pending (all unapproved agents)
      const total = await prisma.agent.count({
        where: {
          isApproved: false,
        },
      });

      // Calculate verification status for each agent
      const agentsWithStatus = agents.map((agent) => {
        const requiredTypes = ['LICENSE', 'VEHICLE_REG', 'ID_PROOF'];
        const verifiedDocs = agent.documents.filter((doc) => doc.verified);
        const pendingDocs = agent.documents.filter((doc) => !doc.verified);
        const missingTypes = requiredTypes.filter(
          (type) => !agent.documents.some((doc) => doc.documentType === type)
        );

        return {
          ...agent,
          kycStatus: {
            verifiedCount: verifiedDocs.length,
            pendingCount: pendingDocs.length,
            totalCount: agent.documents.length,
            missingTypes,
            isComplete: requiredTypes.every((type) =>
              agent.documents.some((doc) => doc.documentType === type && doc.verified)
            ),
          },
        };
      });

      console.log('[KYC] Returning response', { 
        agentsCount: agentsWithStatus.length, 
        total, 
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
      
      res.json({
        agents: agentsWithStatus,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[KYC] Error in getPendingKYC:', error);
      next(error);
    }
  },

  // ==================== SUPPORT TICKETS ====================
  
  // GET /api/admin/support/tickets - Get all support tickets
  async getSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, issueType, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (issueType && issueType !== 'ALL') {
        where.issueType = issueType;
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
              },
            },
            order: {
              select: {
                id: true,
                status: true,
              },
            },
            agent: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    email: true,
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
          adminNotes: ticket.adminNotes || null,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          user: ticket.user || null,
          order: ticket.order || null,
          agent: ticket.agent || null,
          partner: ticket.partner || null,
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

  // GET /api/admin/support/tickets/:id - Get ticket details
  async getSupportTicketDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          order: {
            include: {
              partner: {
                select: {
                  companyName: true,
                },
              },
              agent: {
                select: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          agent: {
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
          partner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      const ticketData = ticket as any;
      res.json({
        id: ticketData.id,
        issueType: ticketData.issueType,
        description: ticketData.description,
        status: ticketData.status,
        resolvedAt: ticketData.resolvedAt,
        adminNotes: ticketData.adminNotes || null,
        createdAt: ticketData.createdAt.toISOString(),
        updatedAt: ticketData.updatedAt.toISOString(),
        user: ticketData.user || null,
        order: ticketData.order || null,
        agent: ticketData.agent || null,
        partner: ticketData.partner || null,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/support/tickets/:id/status - Update ticket status
  async updateTicketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const updateData: any = {
        status: status as any,
        ...(status === 'RESOLVED' && !req.body.resolvedAt ? { resolvedAt: new Date() } : {}),
      };

      // Save admin notes when closing or resolving
      if ((status === 'CLOSED' || status === 'RESOLVED') && adminNotes) {
        (updateData as any).adminNotes = adminNotes;
      }

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          agent: {
            select: {
              id: true,
              userId: true,
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

      // Notify agent if ticket status changed to IN_PROGRESS and ticket is order-related
      const ticketData = ticket as any;
      if (status === 'IN_PROGRESS' && ticketData.agentId && ticketData.orderId) {
        try {
          const { sendPushNotification } = await import('../services/fcm.service');
          await sendPushNotification(
            ticketData.agent.userId,
            'Support Ticket Update',
            `Admin has started working on your ticket for order ${ticketData.order.id.substring(0, 8)}`,
            {
              type: 'TICKET_UPDATE',
              ticketId: ticketData.id,
              orderId: ticketData.order.id,
              status: 'IN_PROGRESS',
            }
          );
          console.log(`[Admin] Sent notification to agent ${ticketData.agentId} about ticket ${ticketData.id}`);
        } catch (notifError) {
          console.error('[Admin] Failed to send notification to agent:', notifError);
          // Don't fail the request if notification fails
        }
      }

      res.json({
        id: ticket.id,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        message: 'Ticket status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/support/tickets/:id/resolve - Resolve ticket
  async resolveTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { resolutionNotes, adminNotes } = req.body;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          adminNotes: (adminNotes || resolutionNotes || null) as string | null,
        } as any,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          agent: {
            select: {
              id: true,
              userId: true,
            },
          },
          partner: {
            select: {
              id: true,
              userId: true,
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

      // Notify user (agent or partner) if ticket is order-related
      const ticketData = ticket as any;
      const userIdToNotify = ticketData.agentId ? ticketData.agent?.userId : ticketData.partnerId ? ticketData.partner?.userId : null;
      if (userIdToNotify && ticketData.orderId && ticketData.order) {
        try {
          const { sendPushNotification } = await import('../services/fcm.service');
          await sendPushNotification(
            userIdToNotify,
            'Support Ticket Resolved',
            `Your support ticket for order ${ticketData.order.id.substring(0, 8)} has been resolved`,
            {
              type: 'TICKET_RESOLVED',
              ticketId: ticketData.id,
              orderId: ticketData.order.id,
              status: 'RESOLVED',
            }
          );
          console.log(`[Admin] Sent resolution notification to user ${userIdToNotify} about ticket ${ticketData.id}`);
        } catch (notifError) {
          console.error('[Admin] Failed to send resolution notification:', notifError);
          // Don't fail the request if notification fails
        }
      }

      res.json({
        id: ticket.id,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        message: 'Ticket resolved successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== ANALYTICS ====================

  // GET /api/admin/analytics/overview - Get comprehensive analytics overview
  async getAnalyticsOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [
        totalRevenue,
        totalOrders,
        completedOrders,
        cancelledOrders,
        avgDeliveryTime,
        ordersByDay,
        ordersByStatus,
        revenueByDay,
        topAgents,
        topPartners,
      ] = await Promise.all([
        // Total revenue
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
          },
          _sum: {
            payoutAmount: true,
          },
        }),
        // Total orders
        prisma.order.count({
          where: {
            createdAt: { gte: start, lte: end },
          },
        }),
        // Completed orders
        prisma.order.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
          },
        }),
        // Cancelled orders
        prisma.order.count({
          where: {
            status: 'CANCELLED',
            cancelledAt: { gte: start, lte: end },
          },
        }),
        // Average delivery time
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
            actualDuration: { not: null },
          },
          _avg: {
            actualDuration: true,
          },
        }),
        // Orders by day (last 30 days)
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
          SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
          FROM "Order"
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `,
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: start, lte: end },
          },
          _count: {
            id: true,
          },
        }),
        // Revenue by day
        prisma.$queryRaw<Array<{ date: Date; revenue: number }>>`
          SELECT DATE("deliveredAt") as date, SUM("payoutAmount")::float as revenue
          FROM "Order"
          WHERE status = 'DELIVERED' AND "deliveredAt" >= ${start} AND "deliveredAt" <= ${end}
          GROUP BY DATE("deliveredAt")
          ORDER BY date ASC
        `,
        // Top agents by completed orders
        prisma.agent.findMany({
          where: {
            orders: {
              some: {
                status: 'DELIVERED',
                deliveredAt: { gte: start, lte: end },
              },
            },
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                orders: {
                  where: {
                    status: 'DELIVERED',
                    deliveredAt: { gte: start, lte: end },
                  },
                },
              },
            },
          },
          orderBy: {
            orders: {
              _count: 'desc',
            },
          },
          take: 10,
        }),
        // Top partners by orders
        prisma.partner.findMany({
          where: {
            orders: {
              some: {
                createdAt: { gte: start, lte: end },
              },
            },
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                orders: {
                  where: {
                    createdAt: { gte: start, lte: end },
                  },
                },
              },
            },
          },
          orderBy: {
            orders: {
              _count: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      res.json({
        summary: {
          totalRevenue: totalRevenue._sum.payoutAmount || 0,
          totalOrders,
          completedOrders,
          cancelledOrders,
          avgDeliveryTime: avgDeliveryTime._avg.actualDuration || 0,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        },
        ordersByDay: (ordersByDay as any[]).map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.id,
        })),
        revenueByDay: (revenueByDay as any[]).map(item => ({
          date: item.date,
          revenue: Number(item.revenue) || 0,
        })),
        topAgents: topAgents.map(agent => ({
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
          completedOrders: agent._count.orders,
          rating: agent.rating,
        })),
        topPartners: topPartners.map(partner => ({
          id: partner.id,
          companyName: partner.companyName,
          orders: partner._count.orders,
        })),
      });
    } catch (error) {
      console.error('[Analytics] Error:', error);
      next(error);
    }
  },

  // GET /api/admin/analytics/revenue - Get revenue analytics
  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Revenue by time period
      let revenueData;
      if (groupBy === 'day') {
        revenueData = await prisma.$queryRaw<Array<{ date: Date; revenue: number; orders: bigint }>>`
          SELECT DATE("deliveredAt") as date, SUM("payoutAmount")::float as revenue, COUNT(*)::bigint as orders
          FROM "Order"
          WHERE status = 'DELIVERED' AND "deliveredAt" >= ${start} AND "deliveredAt" <= ${end}
          GROUP BY DATE("deliveredAt")
          ORDER BY date ASC
        `;
      } else if (groupBy === 'week') {
        revenueData = await prisma.$queryRaw<Array<{ week: Date; revenue: number; orders: bigint }>>`
          SELECT DATE_TRUNC('week', "deliveredAt") as week, SUM("payoutAmount")::float as revenue, COUNT(*)::bigint as orders
          FROM "Order"
          WHERE status = 'DELIVERED' AND "deliveredAt" >= ${start} AND "deliveredAt" <= ${end}
          GROUP BY DATE_TRUNC('week', "deliveredAt")
          ORDER BY week ASC
        `;
      } else {
        revenueData = await prisma.$queryRaw<Array<{ month: Date; revenue: number; orders: bigint }>>`
          SELECT DATE_TRUNC('month', "deliveredAt") as month, SUM("payoutAmount")::float as revenue, COUNT(*)::bigint as orders
          FROM "Order"
          WHERE status = 'DELIVERED' AND "deliveredAt" >= ${start} AND "deliveredAt" <= ${end}
          GROUP BY DATE_TRUNC('month', "deliveredAt")
          ORDER BY month ASC
        `;
      }

      res.json({
        revenueData: (revenueData as any[]).map(item => ({
          date: item.date || item.week || item.month,
          revenue: Number(item.revenue) || 0,
          orders: Number(item.orders) || 0,
        })),
        period: { start, end },
        groupBy,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/analytics/performance - Get performance analytics
  async getPerformanceAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [
        avgDeliveryTime,
        avgAssignmentTime,
        onTimeDeliveryRate,
        agentPerformance,
      ] = await Promise.all([
        // Average delivery time
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
            actualDuration: { not: null },
          },
          _avg: {
            actualDuration: true,
          },
        }),
        // Average assignment time (time from creation to assignment)
        prisma.$queryRaw<Array<{ avg_assignment_time: number }>>`
          SELECT AVG(EXTRACT(EPOCH FROM ("assignedAt" - "createdAt")))::float as avg_assignment_time
          FROM "Order"
          WHERE "assignedAt" IS NOT NULL 
            AND "createdAt" >= ${start} 
            AND "createdAt" <= ${end}
        `,
        // On-time delivery rate (delivered within estimated time)
        prisma.$queryRaw<Array<{ on_time: bigint; total: bigint }>>`
          SELECT 
            COUNT(*) FILTER (WHERE "actualDuration" <= "estimatedDuration")::bigint as on_time,
            COUNT(*)::bigint as total
          FROM "Order"
          WHERE status = 'DELIVERED' 
            AND "deliveredAt" >= ${start} 
            AND "deliveredAt" <= ${end}
            AND "actualDuration" IS NOT NULL
            AND "estimatedDuration" IS NOT NULL
        `,
        // Agent performance metrics
        prisma.agent.findMany({
          where: {
            orders: {
              some: {
                deliveredAt: { gte: start, lte: end },
              },
            },
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
            orders: {
              where: {
                deliveredAt: { gte: start, lte: end },
              },
              select: {
                actualDuration: true,
                estimatedDuration: true,
              },
            },
          },
        }),
      ]);

      const onTimeRate = (onTimeDeliveryRate as any[])[0];
      const onTimeDeliveryRateValue = onTimeRate?.total && Number(onTimeRate.total) > 0 
        ? (Number(onTimeRate.on_time) / Number(onTimeRate.total)) * 100 
        : 0;

      res.json({
        avgDeliveryTime: avgDeliveryTime._avg.actualDuration || 0,
        avgAssignmentTime: Number((avgAssignmentTime as any[])[0]?.avg_assignment_time) || 0,
        onTimeDeliveryRate: onTimeDeliveryRateValue,
        agentPerformance: agentPerformance.map(agent => ({
          id: agent.id,
          name: agent.user.name,
          totalOrders: agent.orders.length,
          avgDeliveryTime: agent.orders.length > 0
            ? agent.orders.reduce((sum, o) => sum + (o.actualDuration || 0), 0) / agent.orders.length
            : 0,
          onTimeRate: agent.orders.length > 0
            ? (agent.orders.filter(o => o.actualDuration && o.estimatedDuration && o.actualDuration <= o.estimatedDuration).length / agent.orders.length) * 100
            : 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== SETTINGS ====================

  // GET /api/admin/settings - Get system settings
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      // For now, return default settings
      // In a real app, these would be stored in a database
      res.json({
        system: {
          name: 'DeliveryHub',
          maintenanceMode: false,
          registrationEnabled: true,
          agentAutoApproval: false,
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
        },
        delivery: {
          maxRadius: 5000, // meters
          maxAgentsToOffer: 5,
          offerTimeout: 30, // seconds
        },
        fees: {
          platformFee: 0.1, // 10%
          minPayout: 10.0,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/settings - Update system settings
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { system, notifications, delivery, fees } = req.body;

      // In a real app, save these to database
      // For now, just return success
      res.json({
        message: 'Settings updated successfully',
        settings: {
          system: system || {},
          notifications: notifications || {},
          delivery: delivery || {},
          fees: fees || {},
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

