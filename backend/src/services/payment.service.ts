import { prisma } from '../lib/prisma';

export interface PaymentCalculation {
  basePay: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  totalOrders: number;
}

/**
 * Calculate payment for a completed order
 */
export async function calculateOrderPayment(
  orderId: string,
  agentId: string,
  payStructureId?: string
): Promise<PaymentCalculation> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || !order.agentId || order.agentId !== agentId) {
    throw new Error('Order not found or not assigned to agent');
  }

  if (order.status !== 'DELIVERED') {
    throw new Error('Order must be delivered to calculate payment');
  }

  // Get pay structure if provided
  let payStructure = null;
  if (payStructureId) {
    payStructure = await prisma.payStructure.findUnique({
      where: { id: payStructureId },
    });
  } else {
    // Get active pay structure
    payStructure = await prisma.payStructure.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  let basePay = order.payoutAmount || 0;
  let bonuses = 0;
  let deductions = 0;

  // Apply pay structure if available
  if (payStructure) {
    if (payStructure.payType === 'PER_DELIVERY') {
      basePay = payStructure.baseRate || order.payoutAmount || 0;
    } else if (payStructure.payType === 'COMMISSION') {
      const commissionRate = payStructure.commissionRate || 0;
      basePay = (order.payoutAmount * commissionRate) / 100;
    }

    // Apply bonuses (can be extended with bonusRules JSON)
    // For now, simple bonus calculation
    if (order.priority === 'HIGH') {
      bonuses += basePay * 0.1; // 10% bonus for high priority
    }

    // Apply deductions (can be extended with deductionRules JSON)
    // For now, simple deduction for delays
    if (order.actualDuration && order.estimatedDuration) {
      if (order.actualDuration > order.estimatedDuration * 1.5) {
        deductions += basePay * 0.05; // 5% deduction for significant delay
      }
    }
  }

  const netPay = basePay + bonuses - deductions;

  return {
    basePay,
    bonuses,
    deductions,
    netPay,
    totalOrders: 1,
  };
}

/**
 * Create payment record for an order
 */
export async function createPayment(
  agentId: string,
  orderId: string,
  amount: number,
  paymentType: string = 'DELIVERY_FEE',
  paymentMethod?: string
) {
  return await prisma.payment.create({
    data: {
      agentId,
      orderId,
      amount,
      paymentType,
      paymentMethod,
      status: 'PENDING',
    },
  });
}

/**
 * Process payment (mark as processed)
 */
export async function processPayment(
  paymentId: string,
  transactionId?: string,
  paymentMethod?: string
) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PROCESSED',
      processedAt: new Date(),
      transactionId,
      paymentMethod,
    },
  });
}

/**
 * Calculate payroll for a period
 */
export async function calculatePayroll(
  agentId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY'
): Promise<PaymentCalculation> {
  // Get all completed orders in the period
  const orders = await prisma.order.findMany({
    where: {
      agentId,
      status: 'DELIVERED',
      deliveredAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  // Get pay structure
  const payStructure = await prisma.payStructure.findFirst({
    where: {
      isActive: true,
      effectiveFrom: { lte: periodStart },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: periodEnd } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  let basePay = 0;
  let bonuses = 0;
  let deductions = 0;

  for (const order of orders) {
    const payment = await calculateOrderPayment(order.id, agentId, payStructure?.id);
    basePay += payment.basePay;
    bonuses += payment.bonuses;
    deductions += payment.deductions;
  }

  const netPay = basePay + bonuses - deductions;

  return {
    basePay,
    bonuses,
    deductions,
    netPay,
    totalOrders: orders.length,
  };
}

/**
 * Create payroll record
 */
export async function createPayroll(
  agentId: string,
  periodStart: Date,
  periodEnd: Date,
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  calculation: PaymentCalculation
) {
  // Check if payroll already exists
  const existing = await prisma.payroll.findUnique({
    where: {
      agentId_periodStart_periodEnd_periodType: {
        agentId,
        periodStart,
        periodEnd,
        periodType,
      },
    },
  });

  if (existing) {
    return await prisma.payroll.update({
      where: { id: existing.id },
      data: {
        totalEarnings: calculation.netPay,
        totalOrders: calculation.totalOrders,
        basePay: calculation.basePay,
        bonuses: calculation.bonuses,
        deductions: calculation.deductions,
        netPay: calculation.netPay,
      },
    });
  }

  return await prisma.payroll.create({
    data: {
      agentId,
      periodStart,
      periodEnd,
      periodType,
      totalEarnings: calculation.netPay,
      totalOrders: calculation.totalOrders,
      basePay: calculation.basePay,
      bonuses: calculation.bonuses,
      deductions: calculation.deductions,
      netPay: calculation.netPay,
      status: 'PENDING',
    },
  });
}

/**
 * Process payroll payment
 */
export async function processPayroll(
  payrollId: string,
  transactionId?: string,
  paymentMethod?: string
) {
  return await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      transactionId,
      paymentMethod,
    },
  });
}

export const paymentService = {
  calculateOrderPayment,
  createPayment,
  processPayment,
  calculatePayroll,
  createPayroll,
  processPayroll,
};



