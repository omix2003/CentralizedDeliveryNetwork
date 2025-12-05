import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { getAgentId } from '../utils/role.util';
import { AppError } from '../utils/errors.util';

export const paymentController = {
  // GET /api/agent/payments - Get agent payment history
  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const { prisma } = await import('../lib/prisma');
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { agentId },
          include: {
            order: {
              select: {
                id: true,
                status: true,
                deliveredAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where: { agentId } }),
      ]);

      res.json({
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // GET /api/agent/payments/summary - Get payment summary
  async getPaymentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { prisma } = await import('../lib/prisma');
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayPayments, weekPayments, monthPayments, pendingPayments] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            agentId,
            createdAt: { gte: todayStart },
            status: 'PROCESSED',
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            agentId,
            createdAt: { gte: weekStart },
            status: 'PROCESSED',
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            agentId,
            createdAt: { gte: monthStart },
            status: 'PROCESSED',
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            agentId,
            status: 'PENDING',
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      res.json({
        today: {
          amount: todayPayments._sum.amount || 0,
          count: todayPayments._count,
        },
        week: {
          amount: weekPayments._sum.amount || 0,
          count: weekPayments._count,
        },
        month: {
          amount: monthPayments._sum.amount || 0,
          count: monthPayments._count,
        },
        pending: {
          amount: pendingPayments._sum.amount || 0,
          count: pendingPayments._count,
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // GET /api/agent/payrolls - Get payroll history
  async getPayrolls(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const { prisma } = await import('../lib/prisma');
      const [payrolls, total] = await Promise.all([
        prisma.payroll.findMany({
          where: { agentId },
          orderBy: { periodStart: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payroll.count({ where: { agentId } }),
      ]);

      res.json({
        payrolls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // POST /api/agent/payrolls/calculate - Calculate payroll for a period
  async calculatePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { periodStart, periodEnd, periodType } = req.body;

      if (!periodStart || !periodEnd || !periodType) {
        throw new AppError('periodStart, periodEnd, and periodType are required', 400);
      }

      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);

      const calculation = await paymentService.calculatePayroll(
        agentId,
        startDate,
        endDate,
        periodType
      );

      const payroll = await paymentService.createPayroll(
        agentId,
        startDate,
        endDate,
        periodType,
        calculation
      );

      res.json({
        success: true,
        payroll,
        calculation,
      });
    } catch (error: any) {
      next(error);
    }
  },
};



