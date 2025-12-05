import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';

export interface RevenueCalculation {
  orderAmount: number;      // Total amount partner charges customer
  deliveryFee: number;       // Amount paid to agent
  platformFee: number;       // Platform commission/fee
  netRevenue: number;        // Partner: orderAmount - deliveryFee - platformFee | Platform: platformFee
}

export interface RevenueSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  platformFees: number;
  agentPayouts: number;
}

export const revenueService = {
  /**
   * Calculate revenue for a delivered order
   * Platform fee is typically 10-15% of order amount or a fixed fee
   */
  calculateOrderRevenue: async (orderId: string): Promise<RevenueCalculation> => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'DELIVERED') {
      throw new Error('Order must be delivered to calculate revenue');
    }

    // Order amount (what partner charges customer)
    // If not set, use payoutAmount * 1.25 as default (assuming 25% markup for partner)
    const orderAmount = order.orderAmount || (order.payoutAmount * 1.25);
    
    // Delivery fee (what partner pays to agent) = base payment
    const deliveryFee = order.payoutAmount;

    // Determine order type (default to ON_DEMAND)
    const orderType = (order.orderType as 'ON_DEMAND' | 'B2B_BULK') || 'ON_DEMAND';

    // Calculate platform commission based on order type
    let commissionRate = 0;
    if (order.commissionRate) {
      // Use specified commission rate
      commissionRate = order.commissionRate;
    } else {
      // Default commission rates based on order type
      if (orderType === 'B2B_BULK') {
        commissionRate = 10; // 10% for B2B bulk deliveries
      } else {
        commissionRate = 20; // 20% for on-demand deliveries
      }
    }

    // Ensure commission rate is within valid range
    if (orderType === 'B2B_BULK') {
      // B2B: 8-12%
      commissionRate = Math.max(8, Math.min(12, commissionRate));
    } else {
      // ON_DEMAND: 15-30%
      commissionRate = Math.max(15, Math.min(30, commissionRate));
    }

    // Calculate platform fee (commission)
    // Commission is calculated on the order amount (what customer pays)
    const platformFee = (orderAmount * commissionRate) / 100;

    // Partner net revenue = orderAmount - deliveryFee - platformFee
    const partnerNetRevenue = orderAmount - deliveryFee - platformFee;

    return {
      orderAmount,
      deliveryFee,
      platformFee,
      netRevenue: partnerNetRevenue, // For partner
    };
  },

  /**
   * Create partner revenue record
   */
  createPartnerRevenue: async (
    partnerId: string,
    orderId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ) => {
    const calculation = await revenueService.calculateOrderRevenue(orderId);
    
    // Get order details for commission rate
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { commissionRate: true, orderType: true },
    });

    // Check if revenue record already exists
    const existing = await prisma.partnerRevenue.findUnique({
      where: { orderId },
    });

    if (existing) {
      return await prisma.partnerRevenue.update({
        where: { id: existing.id },
        data: {
          orderAmount: calculation.orderAmount,
          deliveryFee: calculation.deliveryFee,
          platformFee: calculation.platformFee,
          netRevenue: calculation.netRevenue,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    }

    return await prisma.partnerRevenue.create({
      data: {
        partnerId,
        orderId,
        orderAmount: calculation.orderAmount,
        deliveryFee: calculation.deliveryFee,
        platformFee: calculation.platformFee,
        netRevenue: calculation.netRevenue,
        periodStart,
        periodEnd,
        periodType,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
  },

  /**
   * Create platform revenue record
   */
  createPlatformRevenue: async (
    orderId: string,
    partnerId: string,
    agentId: string | null,
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ) => {
    const calculation = await revenueService.calculateOrderRevenue(orderId);

    // Check if revenue record already exists
    const existing = await prisma.platformRevenue.findUnique({
      where: { orderId },
    });

    if (existing) {
      return await prisma.platformRevenue.update({
        where: { id: existing.id },
        data: {
          orderAmount: calculation.orderAmount,
          platformFee: calculation.platformFee,
          agentPayout: calculation.deliveryFee,
          netRevenue: calculation.platformFee, // Platform keeps the fee
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    }

    return await prisma.platformRevenue.create({
      data: {
        orderId,
        partnerId,
        agentId: agentId || null,
        orderAmount: calculation.orderAmount,
        platformFee: calculation.platformFee,
        agentPayout: calculation.deliveryFee,
        netRevenue: calculation.platformFee, // Platform keeps the fee
        revenueType: 'COMMISSION',
        periodStart,
        periodEnd,
        periodType,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
  },

  /**
   * Get partner revenue summary
   */
  getPartnerRevenueSummary: async (
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RevenueSummary> => {
    const where: any = {
      partnerId,
      status: 'PROCESSED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const revenues = await prisma.partnerRevenue.findMany({
      where,
      include: {
        order: {
          select: {
            status: true,
          },
        },
      },
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + r.netRevenue, 0);
    const totalOrders = revenues.length;
    const completedOrders = revenues.filter(r => r.order.status === 'DELIVERED').length;
    const cancelledOrders = revenues.filter(r => r.order.status === 'CANCELLED').length;
    const platformFees = revenues.reduce((sum, r) => sum + r.platformFee, 0);
    const agentPayouts = revenues.reduce((sum, r) => sum + r.deliveryFee, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      platformFees,
      agentPayouts,
    };
  },

  /**
   * Get platform revenue summary
   */
  getPlatformRevenueSummary: async (
    startDate?: Date,
    endDate?: Date
  ): Promise<RevenueSummary> => {
    const where: any = {
      status: 'PROCESSED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const revenues = await prisma.platformRevenue.findMany({
      where,
      include: {
        order: {
          select: {
            status: true,
          },
        },
      },
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + r.netRevenue, 0);
    const totalOrders = revenues.length;
    const completedOrders = revenues.filter(r => r.order.status === 'DELIVERED').length;
    const cancelledOrders = revenues.filter(r => r.order.status === 'CANCELLED').length;
    const platformFees = totalRevenue; // Platform revenue is the fees
    const agentPayouts = revenues.reduce((sum, r) => sum + r.agentPayout, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      platformFees,
      agentPayouts,
    };
  },

  /**
   * Get partner revenue by period
   */
  getPartnerRevenueByPeriod: async (
    partnerId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ) => {
    return await prisma.partnerRevenue.findMany({
      where: {
        partnerId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        periodType,
        status: 'PROCESSED',
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get platform revenue by period
   */
  getPlatformRevenueByPeriod: async (
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ) => {
    return await prisma.platformRevenue.findMany({
      where: {
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        periodType,
        status: 'PROCESSED',
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
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
    });
  },
};

