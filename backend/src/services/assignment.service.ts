import { prisma } from '../lib/prisma';
import { redisGeo } from '../lib/redis';
import { notifyPartner } from '../lib/webhook';
import { sendOrderOfferToAgent, notifyPartnerOrderAssigned } from '../lib/websocket';
import { sendOrderOfferNotification, sendOrderAssignedNotification } from './fcm.service';

/**
 * Agent scoring interface
 */
interface AgentScore {
  agentId: string;
  distance: number; // in meters
  score: number; // calculated score (higher is better)
  agent: {
    id: string;
    acceptanceRate: number;
    rating: number | null;
    totalOrders: number;
    currentOrderId: string | null;
  };
}

/**
 * Order assignment options
 */
interface AssignmentOptions {
  orderId: string;
  pickupLat: number;
  pickupLng: number;
  payoutAmount: number;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  maxRadius?: number; // in meters, default 5000 (5km)
  maxAgentsToOffer?: number; // default 5
  offerTimeout?: number; // in seconds, default 30
}

/**
 * Calculate agent score based on multiple factors
 */
function calculateAgentScore(
  agent: {
    acceptanceRate: number;
    rating: number | null;
    totalOrders: number;
    currentOrderId: string | null;
  },
  distance: number, // in meters
  payoutAmount: number,
  priority: 'HIGH' | 'NORMAL' | 'LOW'
): number {
  // Base score starts at 100
  let score = 100;

  // Distance factor (shorter distance = higher score)
  // Normalize distance: 0-1000m = 100 points, 1000-5000m = 50-100 points
  const distanceScore = Math.max(0, 100 - (distance / 50)); // 50m = 1 point deduction
  score += distanceScore * 0.3; // 30% weight on distance

  // Acceptance rate factor (higher = better)
  // acceptanceRate is a percentage (0-100)
  score += agent.acceptanceRate * 0.2; // 20% weight

  // Rating factor (higher = better, normalized to 0-100)
  const ratingScore = agent.rating ? (agent.rating / 5) * 100 : 50; // Default to 50 if no rating
  score += ratingScore * 0.15; // 15% weight

  // Experience factor (more orders = slightly better, but diminishing returns)
  const experienceScore = Math.min(100, (agent.totalOrders / 10) * 10); // 10 orders = 100 points
  score += experienceScore * 0.1; // 10% weight

  // Payout preference (higher payout = slightly higher score)
  // Normalize payout: $5 = 50 points, $20+ = 100 points
  const payoutScore = Math.min(100, (payoutAmount / 0.2)); // $0.20 = 1 point
  score += payoutScore * 0.1; // 10% weight

  // Priority boost (HIGH priority orders get distance bonus)
  if (priority === 'HIGH') {
    score += 20; // Boost for high priority
  }

  // Penalty if agent has current order (but still allow if no other options)
  if (agent.currentOrderId) {
    score -= 30; // Penalty for having current order
  }

  return Math.max(0, score); // Ensure non-negative
}

/**
 * Find and score nearby agents for an order
 */
async function findAndScoreAgents(
  pickupLat: number,
  pickupLng: number,
  payoutAmount: number,
  priority: 'HIGH' | 'NORMAL' | 'LOW',
  maxRadius: number = 5000
): Promise<AgentScore[]> {
  // Get nearby agents from Redis GEO
  const nearbyAgents = await redisGeo.getNearbyAgents(
    pickupLng,
    pickupLat,
    maxRadius,
    'm'
  );

  if (!nearbyAgents || nearbyAgents.length === 0) {
    return [];
  }

  // Parse Redis GEO response
  // Format with WITHDIST and WITHCOORD: [[agentId, distance, [lng, lat]], ...]
  // Or flat format: [agentId, distance, [lng, lat], agentId, distance, [lng, lat], ...]
  const agentIds: string[] = [];
  const distances: Map<string, number> = new Map();

  // Check if response is nested array format
  if (nearbyAgents.length > 0 && Array.isArray(nearbyAgents[0])) {
    // Nested format: [[agentId, distance, [lng, lat]], ...]
    for (const item of nearbyAgents as any[]) {
      if (Array.isArray(item) && item.length >= 2) {
        const agentId = item[0] as string;
        const distance = parseFloat(item[1] as string);
        agentIds.push(agentId);
        distances.set(agentId, distance);
      }
    }
  } else {
    // Flat format: [agentId, distance, [lng, lat], agentId, distance, [lng, lat], ...]
    for (let i = 0; i < nearbyAgents.length; i += 3) {
      if (i + 1 < nearbyAgents.length) {
        const agentId = nearbyAgents[i] as string;
        const distance = parseFloat(nearbyAgents[i + 1] as string);
        agentIds.push(agentId);
        distances.set(agentId, distance);
      }
    }
  }

  // Fetch agent details from database
  const agents = await prisma.agent.findMany({
    where: {
      id: { in: agentIds },
      status: 'ONLINE', // Only online agents
      isApproved: true, // Only approved agents
      isBlocked: false, // Not blocked
    },
    select: {
      id: true,
      acceptanceRate: true,
      rating: true,
      totalOrders: true,
      currentOrderId: true,
    },
  });

  // Calculate scores for each agent
  const scoredAgents: AgentScore[] = agents
    .map((agent) => {
      const distance = distances.get(agent.id) || Infinity;
      const score = calculateAgentScore(
        {
          acceptanceRate: agent.acceptanceRate,
          rating: agent.rating,
          totalOrders: agent.totalOrders,
          currentOrderId: agent.currentOrderId,
        },
        distance,
        payoutAmount,
        priority
      );

      return {
        agentId: agent.id,
        distance,
        score,
        agent,
      };
    })
    .filter((scored) => scored.score > 0) // Filter out negative scores
    .sort((a, b) => b.score - a.score); // Sort by score (highest first)

  return scoredAgents;
}

/**
 * Offer order to top N agents
 * Returns the list of agent IDs that received the offer
 */
async function offerOrderToAgents(
  orderId: string,
  agentIds: string[],
  orderData: {
    pickupAddress?: string;
    dropAddress?: string;
    payoutAmount: number;
    distance?: number;
  },
  offerTimeout: number = 30
): Promise<string[]> {
  // Get order details for notifications
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      payoutAmount: true,
      pickupLat: true,
      pickupLng: true,
      dropLat: true,
      dropLng: true,
      priority: true,
    },
  });

  if (!order) {
    console.error(`[Assignment] Order ${orderId} not found for offer`);
    return [];
  }

  // Send notifications to each agent
  for (const agentId of agentIds) {
    // Get agent's distance from order
    const agentLocation = await redisGeo.getNearbyAgents(
      order.pickupLng,
      order.pickupLat,
      5000,
      'm'
    );

    let distance: number | undefined;
    // Find this agent's distance
    // Redis GEORADIUS with WITHDIST returns: [agentId, distance, ...] or [[agentId, distance], ...]
    for (let i = 0; i < agentLocation.length; i += 3) {
      const item = agentLocation[i];
      if (Array.isArray(item)) {
        // Nested format: [[agentId, distance], ...]
        const nestedItem = item as unknown[];
        if (nestedItem[0] === agentId) {
          distance = parseFloat(String(nestedItem[1]));
          break;
        }
      } else if (item === agentId) {
        // Flat format: [agentId, distance, ...]
        const nextItem = agentLocation[i + 1];
        if (nextItem !== undefined) {
          distance = parseFloat(String(nextItem));
          break;
        }
      }
    }

    // Send WebSocket notification
    await sendOrderOfferToAgent(agentId, {
      id: order.id,
      payoutAmount: order.payoutAmount,
      distance,
      priority: order.priority,
    });

    // Send FCM push notification
    await sendOrderOfferNotification(agentId, orderId, {
      payoutAmount: order.payoutAmount,
      distance,
    });
  }

  console.log(`[Assignment] Order ${orderId} offered to ${agentIds.length} agents via WebSocket + FCM`);
  
  return agentIds;
}

/**
 * Assign order to an agent (first-accept logic)
 * Uses database transaction to prevent double assignment
 */
async function assignOrderToAgent(
  orderId: string,
  agentId: string
): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check order is still available
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          partner: {
            select: {
              id: true,
              webhookUrl: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'SEARCHING_AGENT') {
        throw new Error(`Order is no longer available (status: ${order.status})`);
      }

      if (order.agentId) {
        throw new Error('Order has already been assigned');
      }

      // Check agent is still available
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.status !== 'ONLINE') {
        throw new Error('Agent is not online');
      }

      if (agent.isBlocked || !agent.isApproved) {
        throw new Error('Agent is not available');
      }

      // Update order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          agentId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
        include: {
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
          agent: {
            select: {
              id: true,
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

      // Update agent
      await tx.agent.update({
        where: { id: agentId },
        data: {
          currentOrderId: orderId,
          status: 'ON_TRIP',
        },
      });

      return updatedOrder;
    });

    // Notify partner via webhook
    await notifyPartner(
      result.partner.id,
      'ORDER_ASSIGNED',
      orderId,
      'ASSIGNED',
      {
        agentId,
        assignedAt: result.assignedAt,
        agentName: result.agent?.user.name,
        agentPhone: result.agent?.user.phone,
      }
    );

    // Send WebSocket notification to partner
    await notifyPartnerOrderAssigned(result.partner.id, {
      id: result.id,
      status: result.status,
      agentId,
      assignedAt: result.assignedAt,
    });

    // Send FCM notification to agent
    await sendOrderAssignedNotification(agentId, orderId);

    return { success: true, order: result };
  } catch (error: any) {
    console.error('[Assignment] Error assigning order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main assignment function
 * Finds nearby agents, scores them, offers to top N, and assigns to first acceptor
 */
export async function assignOrder(options: AssignmentOptions): Promise<{
  success: boolean;
  assigned?: boolean;
  agentsOffered?: number;
  agentId?: string;
  error?: string;
}> {
  const {
    orderId,
    pickupLat,
    pickupLng,
    payoutAmount,
    priority = 'NORMAL',
    maxRadius = 5000,
    maxAgentsToOffer = 5,
    offerTimeout = 30,
  } = options;

  try {
    // Step 1: Find and score nearby agents
    const scoredAgents = await findAndScoreAgents(
      pickupLat,
      pickupLng,
      payoutAmount,
      priority,
      maxRadius
    );

    if (scoredAgents.length === 0) {
      console.log(`[Assignment] No available agents found for order ${orderId}`);
      return {
        success: true,
        assigned: false,
        agentsOffered: 0,
        error: 'No available agents found within range',
      };
    }

    // Step 2: Select top N agents
    const topAgents = scoredAgents.slice(0, maxAgentsToOffer);
    const agentIds = topAgents.map((a) => a.agentId);

    console.log(`[Assignment] Selected ${topAgents.length} agents for order ${orderId}:`, {
      agents: topAgents.map((a) => ({
        id: a.agentId,
        score: a.score.toFixed(2),
        distance: `${(a.distance / 1000).toFixed(2)}km`,
      })),
    });

    // Step 3: Offer order to agents via WebSocket + FCM
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        payoutAmount: true,
      },
    });

    await offerOrderToAgents(
      orderId,
      agentIds,
      {
        payoutAmount: order?.payoutAmount || payoutAmount,
      },
      offerTimeout
    );

    // Step 4: For now, we'll wait for agents to accept via the existing API endpoint
    // In Phase 5.2, we'll implement real-time acceptance via WebSocket
    // The assignment will happen when agent calls POST /api/agent/orders/:id/accept

    return {
      success: true,
      assigned: false, // Will be assigned when agent accepts
      agentsOffered: agentIds.length,
    };
  } catch (error: any) {
    console.error('[Assignment] Error in assignOrder:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign order',
    };
  }
}

/**
 * Auto-assign order to best agent (for high priority or when no response expected)
 * This bypasses the offer system and directly assigns to the top agent
 */
export async function autoAssignOrder(
  orderId: string,
  pickupLat: number,
  pickupLng: number,
  payoutAmount: number,
  priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
): Promise<{
  success: boolean;
  assigned: boolean;
  agentId?: string;
  error?: string;
}> {
  try {
    // Find and score agents
    const scoredAgents = await findAndScoreAgents(
      pickupLat,
      pickupLng,
      payoutAmount,
      priority,
      5000
    );

    if (scoredAgents.length === 0) {
      return {
        success: true,
        assigned: false,
        error: 'No available agents found',
      };
    }

    // Assign to top agent
    const topAgent = scoredAgents[0];
    const result = await assignOrderToAgent(orderId, topAgent.agentId);

    if (result.success && result.order) {
      return {
        success: true,
        assigned: true,
        agentId: topAgent.agentId,
      };
    }

    return {
      success: false,
      assigned: false,
      error: result.error || 'Failed to assign order',
    };
  } catch (error: any) {
    console.error('[Assignment] Error in autoAssignOrder:', error);
    return {
      success: false,
      assigned: false,
      error: error.message || 'Failed to auto-assign order',
    };
  }
}

// Export helper functions for testing
export { calculateAgentScore, findAndScoreAgents, assignOrderToAgent };

