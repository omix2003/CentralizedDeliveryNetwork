import { prisma } from '../lib/prisma';
import { walletService } from './wallet.service';

export interface PayoutSummary {
  agentId: string;
  agentName: string;
  totalEarnings: number;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  payoutPlan: 'WEEKLY' | 'MONTHLY';
}

export interface WeeklyPayoutSummary extends PayoutSummary {
  payoutPlan: 'WEEKLY';
}

export interface MonthlyPayoutSummary extends PayoutSummary {
  payoutPlan: 'MONTHLY';
}

export const payoutService = {
  /**
   * Calculate weekly payout for an agent
   * Week runs from Monday to Sunday
   */
  async calculateWeeklyPayout(agentId: string, weekStart?: Date): Promise<WeeklyPayoutSummary> {
    // Default to current week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const startDate = weekStart || new Date(today);
    startDate.setDate(today.getDate() - daysFromMonday);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get wallet balance (this is the pending payout amount)
    const wallet = await walletService.getAgentWallet(agentId);

    // Count orders delivered in this week
    const orders = await prisma.order.findMany({
      where: {
        agentId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        payoutAmount: true,
      },
    });

    const totalEarnings = wallet.balance; // Current wallet balance is the payout amount

    return {
      agentId,
      agentName: agent.user.name,
      totalEarnings,
      periodStart: startDate,
      periodEnd: endDate,
      orderCount: orders.length,
      payoutPlan: 'WEEKLY',
    };
  },

  /**
   * Process weekly payout for an agent
   */
  async processWeeklyPayout(
    agentId: string,
    paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY',
    bankAccount?: string,
    upiId?: string,
    weekStart?: Date
  ) {
    const summary = await payoutService.calculateWeeklyPayout(agentId, weekStart);
    
    if (summary.totalEarnings <= 0) {
      throw new Error('No earnings to payout');
    }

    // Check if payout already exists for this period
    let existingPayout;
    try {
      existingPayout = await prisma.walletPayout.findUnique({
        where: {
          agentId_periodStart_periodEnd: {
            agentId,
            periodStart: summary.periodStart,
            periodEnd: summary.periodEnd,
          },
        },
      });
    } catch (error: any) {
      // If table doesn't exist, continue without checking for existing payout
      if (error?.code === 'P2021' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  WalletPayout table does not exist - skipping duplicate check');
        existingPayout = null;
      } else {
        throw error;
      }
    }

    if (existingPayout) {
      if (existingPayout.status === 'PROCESSED') {
        throw new Error('Payout already processed for this period');
      }
      // Update existing payout
      return await prisma.walletPayout.update({
        where: { id: existingPayout.id },
        data: {
          amount: summary.totalEarnings,
          status: 'PROCESSED',
          paymentMethod,
          bankAccount,
          upiId,
          processedAt: new Date(),
        },
      });
    }

    // Get agent wallet
    const wallet = await walletService.getAgentWallet(agentId);

    // Create payout record
    const payout = await prisma.walletPayout.create({
      data: {
        agentWalletId: wallet.id,
        agentId,
        amount: summary.totalEarnings,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        status: 'PROCESSED',
        paymentMethod,
        bankAccount,
        upiId,
        processedAt: new Date(),
      },
    });

    // Debit agent wallet
    await walletService.debitAgentWallet(
      agentId,
      summary.totalEarnings,
      payout.id,
      `Weekly payout for ${summary.periodStart.toLocaleDateString()} - ${summary.periodEnd.toLocaleDateString()}`
    );

    // Debit admin wallet
    await walletService.debitAdminWallet(
      summary.totalEarnings,
      payout.id,
      `Payout to agent ${agentId.substring(0, 8).toUpperCase()}`
    );

    return payout;
  },

  /**
   * Calculate monthly payout for an agent
   * Month runs from 1st to last day of the month
   */
  async calculateMonthlyPayout(agentId: string, monthStart?: Date): Promise<MonthlyPayoutSummary> {
    // Default to current month
    const today = new Date();
    const startDate = monthStart || new Date(today.getFullYear(), today.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get wallet balance (this is the pending payout amount)
    const wallet = await walletService.getAgentWallet(agentId);

    // Count orders delivered in this month
    const orders = await prisma.order.findMany({
      where: {
        agentId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        payoutAmount: true,
      },
    });

    const totalEarnings = wallet.balance; // Current wallet balance is the payout amount

    return {
      agentId,
      agentName: agent.user.name,
      totalEarnings,
      periodStart: startDate,
      periodEnd: endDate,
      orderCount: orders.length,
      payoutPlan: 'MONTHLY',
    };
  },

  /**
   * Process monthly payout for an agent
   */
  async processMonthlyPayout(
    agentId: string,
    paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY',
    bankAccount?: string,
    upiId?: string,
    monthStart?: Date
  ) {
    const summary = await payoutService.calculateMonthlyPayout(agentId, monthStart);
    
    if (summary.totalEarnings <= 0) {
      throw new Error('No earnings to payout');
    }

    // Check if payout already exists for this period
    let existingPayout;
    try {
      existingPayout = await prisma.walletPayout.findUnique({
        where: {
          agentId_periodStart_periodEnd: {
            agentId,
            periodStart: summary.periodStart,
            periodEnd: summary.periodEnd,
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  WalletPayout table does not exist - skipping duplicate check');
        existingPayout = null;
      } else {
        throw error;
      }
    }

    if (existingPayout) {
      if (existingPayout.status === 'PROCESSED') {
        throw new Error('Payout already processed for this period');
      }
      return await prisma.walletPayout.update({
        where: { id: existingPayout.id },
        data: {
          amount: summary.totalEarnings,
          status: 'PROCESSED',
          paymentMethod,
          bankAccount,
          upiId,
          processedAt: new Date(),
        },
      });
    }

    // Get agent wallet
    const wallet = await walletService.getAgentWallet(agentId);

    // Create payout record
    const payout = await prisma.walletPayout.create({
      data: {
        agentWalletId: wallet.id,
        agentId,
        amount: summary.totalEarnings,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        status: 'PROCESSED',
        paymentMethod,
        bankAccount,
        upiId,
        processedAt: new Date(),
      },
    });

    // Debit agent wallet
    await walletService.debitAgentWallet(
      agentId,
      summary.totalEarnings,
      payout.id,
      `Monthly payout for ${summary.periodStart.toLocaleDateString()} - ${summary.periodEnd.toLocaleDateString()}`
    );

    // Debit admin wallet
    await walletService.debitAdminWallet(
      summary.totalEarnings,
      payout.id,
      `Monthly payout to agent ${agentId.substring(0, 8).toUpperCase()}`
    );

    return payout;
  },

  /**
   * Get all agents ready for payout (balance > 0, nextPayoutDate is today or past)
   * Returns agents grouped by payout plan
   */
  async getAgentsReadyForPayout(): Promise<{
    weekly: Array<{ agentId: string; balance: number; nextPayoutDate: Date | null; agentName: string }>;
    monthly: Array<{ agentId: string; balance: number; nextPayoutDate: Date | null; agentName: string }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const wallets = await prisma.agentWallet.findMany({
        where: {
          balance: { gt: 0 },
          OR: [
            { nextPayoutDate: { lte: today } },
            { nextPayoutDate: null },
          ],
        },
        include: {
          agent: {
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

      const weekly: Array<{ agentId: string; balance: number; nextPayoutDate: Date | null; agentName: string }> = [];
      const monthly: Array<{ agentId: string; balance: number; nextPayoutDate: Date | null; agentName: string }> = [];

      for (const wallet of wallets) {
        const agentData = {
          agentId: wallet.agentId,
          balance: wallet.balance,
          nextPayoutDate: wallet.nextPayoutDate,
          agentName: wallet.agent?.user?.name || 'Unknown',
        };

        if (wallet.agent?.payoutPlan === 'MONTHLY') {
          monthly.push(agentData);
        } else {
          weekly.push(agentData);
        }
      }

      return { weekly, monthly };
    } catch (error: any) {
      // If table doesn't exist, return empty arrays
      if (error?.code === 'P2021' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  AgentWallet table does not exist - returning empty results');
        return { weekly: [], monthly: [] };
      }
      throw error;
    }
  },

  /**
   * Process weekly payouts for all eligible agents
   */
  async processAllWeeklyPayouts(paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY' = 'BANK_TRANSFER') {
    const { weekly } = await payoutService.getAgentsReadyForPayout();
    const results = [];

    for (const agent of weekly) {
      try {
        const payout = await payoutService.processWeeklyPayout(
          agent.agentId,
          paymentMethod
        );
        results.push({ success: true, agentId: agent.agentId, payoutId: payout.id });
      } catch (error: any) {
        results.push({ success: false, agentId: agent.agentId, error: error.message });
      }
    }

    return {
      totalProcessed: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results,
    };
  },

  /**
   * Process monthly payouts for all eligible agents
   */
  async processAllMonthlyPayouts(paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY' = 'BANK_TRANSFER') {
    const { monthly } = await payoutService.getAgentsReadyForPayout();
    const results = [];

    for (const agent of monthly) {
      try {
        const payout = await payoutService.processMonthlyPayout(
          agent.agentId,
          paymentMethod
        );
        results.push({ success: true, agentId: agent.agentId, payoutId: payout.id });
      } catch (error: any) {
        results.push({ success: false, agentId: agent.agentId, error: error.message });
      }
    }

    return {
      totalProcessed: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results,
    };
  },

  /**
   * Get payout history for an agent
   */
  async getAgentPayoutHistory(agentId: string, limit: number = 20, offset: number = 0) {
    try {
      const payouts = await prisma.walletPayout.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.walletPayout.count({ where: { agentId } });

      return { payouts, total };
    } catch (error: any) {
      // If table doesn't exist, return empty results
      if (error?.code === 'P2021' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  WalletPayout table does not exist - returning empty results');
        return { payouts: [], total: 0 };
      }
      throw error;
    }
  },

  /**
   * Get all payouts (admin view)
   */
  async getAllPayouts(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const payouts = await prisma.walletPayout.findMany({
        where,
        select: {
          id: true,
          agentId: true,
          amount: true,
          periodStart: true,
          periodEnd: true,
          status: true,
          paymentMethod: true,
          bankAccount: true,
          upiId: true,
          processedAt: true,
          createdAt: true,
          agent: {
            select: {
              id: true,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.walletPayout.count({ where });

      return { payouts, total };
    } catch (error: any) {
      // If table doesn't exist, return empty results
      if (error?.code === 'P2021' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️  WalletPayout table does not exist - returning empty results');
        return { payouts: [], total: 0 };
      }
      throw error;
    }
  },
};



