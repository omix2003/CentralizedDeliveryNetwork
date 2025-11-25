import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getPartnerId } from '../utils/role.util';

export const partnerController = {
  // GET /api/partner/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
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

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json({
        id: partner.id,
        companyName: partner.companyName,
        apiKey: partner.apiKey,
        webhookUrl: partner.webhookUrl,
        isActive: partner.isActive,
        user: partner.user,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/partner/webhook
  async updateWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerId = getPartnerId(req);
      if (!partnerId) {
        return res.status(404).json({ error: 'Partner profile not found' });
      }

      const { webhookUrl } = req.body;

      const partner = await prisma.partner.update({
        where: { id: partnerId },
        data: { webhookUrl },
      });

      res.json({
        id: partner.id,
        webhookUrl: partner.webhookUrl,
      });
    } catch (error) {
      next(error);
    }
  },
};

