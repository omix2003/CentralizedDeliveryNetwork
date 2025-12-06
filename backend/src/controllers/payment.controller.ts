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
      try {
        const [payments, total] = await Promise.all([
          prisma.payment.findMany({
            where: { agentId },
            select: {
              id: true,
              agentId: true,
              orderId: true,
              amount: true,
              status: true,
              createdAt: true,
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
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return [];
            }
            throw err;
          }),
          prisma.payment.count({ where: { agentId } }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return 0;
            }
            throw err;
          }),
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
        // If table doesn't exist, return empty results
        if (error?.code === 'P2021' || error?.code === 'P2022' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn('⚠️  Payment table does not exist - returning empty results');
          return res.json({
            payments: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          });
        }
        throw error;
      }
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
      
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Wrap each query individually to handle missing table errors
        const [todayPayments, weekPayments, monthPayments, pendingPayments] = await Promise.all([
          prisma.payment.aggregate({
            where: {
              agentId,
              createdAt: { gte: todayStart },
              status: 'PROCESSED',
            },
            _sum: { amount: true },
            _count: true,
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return { _sum: { amount: null }, _count: 0 };
            }
            throw err;
          }),
          prisma.payment.aggregate({
            where: {
              agentId,
              createdAt: { gte: weekStart },
              status: 'PROCESSED',
            },
            _sum: { amount: true },
            _count: true,
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return { _sum: { amount: null }, _count: 0 };
            }
            throw err;
          }),
          prisma.payment.aggregate({
            where: {
              agentId,
              createdAt: { gte: monthStart },
              status: 'PROCESSED',
            },
            _sum: { amount: true },
            _count: true,
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return { _sum: { amount: null }, _count: 0 };
            }
            throw err;
          }),
          prisma.payment.aggregate({
            where: {
              agentId,
              status: 'PENDING',
            },
            _sum: { amount: true },
            _count: true,
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return { _sum: { amount: null }, _count: 0 };
            }
            throw err;
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
        // If table doesn't exist, return empty results
        if (error?.code === 'P2021' || error?.code === 'P2022' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn('⚠️  Payment table does not exist - returning empty summary');
          return res.json({
            today: { amount: 0, count: 0 },
            week: { amount: 0, count: 0 },
            month: { amount: 0, count: 0 },
            pending: { amount: 0, count: 0 },
          });
        }
        throw error;
      }
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
      try {
        const [payrolls, total] = await Promise.all([
          prisma.payroll.findMany({
            where: { agentId },
            orderBy: { periodStart: 'desc' },
            skip,
            take: limit,
          }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return [];
            }
            throw err;
          }),
          prisma.payroll.count({ where: { agentId } }).catch((err: any) => {
            if (err?.code === 'P2021' || err?.code === 'P2022' || err?.code === '42P01' || err?.message?.includes('does not exist')) {
              return 0;
            }
            throw err;
          }),
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
        // If table doesn't exist, return empty results
        if (error?.code === 'P2021' || error?.code === 'P2022' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.warn('⚠️  Payroll table does not exist - returning empty results');
          return res.json({
            payrolls: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          });
        }
        throw error;
      }
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



