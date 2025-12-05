import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/wallet.service';
import { payoutService } from '../services/payout.service';
import { getAgentId } from '../utils/role.util';
import { AppError } from '../utils/errors.util';

export const walletController = {
  /**
   * GET /api/agent/wallet
   * Get agent wallet balance
   */
  async getAgentWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        throw new AppError('Agent ID not found', 401);
      }

      const balance = await walletService.getAgentWalletBalance(agentId);
      const wallet = await walletService.getAgentWallet(agentId);

      res.json({
        ...balance,
        lastPayoutDate: wallet.lastPayoutDate,
        nextPayoutDate: wallet.nextPayoutDate,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/agent/wallet/transactions
   * Get agent wallet transactions
   */
  async getAgentWalletTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        throw new AppError('Agent ID not found', 401);
      }

      const wallet = await walletService.getAgentWallet(agentId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { transactions, total } = await walletService.getWalletTransactions(
        'AGENT_WALLET',
        wallet.id,
        limit,
        offset
      );

      res.json({
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/wallet
   * Get admin wallet balance
   */
  async getAdminWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await walletService.getAdminWalletBalance();
      res.json(balance);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/wallet/transactions
   * Get admin wallet transactions
   */
  async getAdminWalletTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const wallet = await walletService.getAdminWallet();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { transactions, total } = await walletService.getWalletTransactions(
        'ADMIN_WALLET',
        wallet.id,
        limit,
        offset
      );

      res.json({
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/agent/payouts
   * Get agent payout history
   */
  async getAgentPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        throw new AppError('Agent ID not found', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { payouts, total } = await payoutService.getAgentPayoutHistory(agentId, limit, offset);

      res.json({
        payouts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/payouts
   * Get all payouts (admin view)
   */
  async getAllPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { payouts, total } = await payoutService.getAllPayouts(status, limit, offset);

      res.json({
        payouts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/payouts/ready
   * Get agents ready for payout
   */
  async getAgentsReadyForPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await payoutService.getAgentsReadyForPayout();
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/payouts/process
   * Process weekly payout for an agent
   */
  async processPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, paymentMethod, bankAccount, upiId, weekStart } = req.body;

      if (!agentId || !paymentMethod) {
        throw new AppError('Agent ID and payment method are required', 400);
      }

      const payout = await payoutService.processWeeklyPayout(
        agentId,
        paymentMethod,
        bankAccount,
        upiId,
        weekStart ? new Date(weekStart) : undefined
      );

      res.json({
        message: 'Payout processed successfully',
        payout,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/payouts/process-all
   * Process weekly payouts for all eligible agents
   */
  async processAllPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethod = 'BANK_TRANSFER' } = req.body;

      const results = await payoutService.processAllWeeklyPayouts(paymentMethod);

      res.json({
        message: 'Payout processing completed',
        results,
        totalProcessed: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
      });
    } catch (error) {
      next(error);
    }
  },
};

