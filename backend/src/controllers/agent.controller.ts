import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getAgentId } from '../utils/role.util';

export const agentController = {
  // GET /api/agent/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
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

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json({
        id: agent.id,
        status: agent.status,
        vehicleType: agent.vehicleType,
        city: agent.city,
        state: agent.state,
        pincode: agent.pincode,
        isApproved: agent.isApproved,
        rating: agent.rating,
        user: agent.user,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/agent/profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { city, state, pincode, vehicleType } = req.body;

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          ...(city && { city }),
          ...(state && { state }),
          ...(pincode && { pincode }),
          ...(vehicleType && { vehicleType }),
        },
      });

      res.json({
        id: agent.id,
        status: agent.status,
        vehicleType: agent.vehicleType,
        city: agent.city,
        state: agent.state,
        pincode: agent.pincode,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/location
  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { latitude, longitude } = req.body;

      // TODO: Store in Redis GEO
      // await redisGeo.addAgentLocation(agentId, longitude, latitude);

      // Store in database for history
      await prisma.agentLocation.create({
        data: {
          agentId,
          latitude,
          longitude,
        },
      });

      res.json({ message: 'Location updated successfully' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/agent/status
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = getAgentId(req);
      if (!agentId) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      const { status } = req.body;

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: { status },
      });

      res.json({
        id: agent.id,
        status: agent.status,
      });
    } catch (error) {
      next(error);
    }
  },
};

