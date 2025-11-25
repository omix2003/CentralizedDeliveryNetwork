import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const adminController = {
  // GET /api/admin/metrics/overview
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalAgents,
        totalPartners,
        totalOrders,
        activeAgents,
      ] = await Promise.all([
        prisma.agent.count(),
        prisma.partner.count(),
        prisma.order.count(),
        prisma.agent.count({
          where: { status: 'ONLINE' },
        }),
      ]);

      res.json({
        totalAgents,
        totalPartners,
        totalOrders,
        activeAgents,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/agents
  async getAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await prisma.agent.findMany({
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(agents);
    } catch (error) {
      next(error);
    }
  },
};

