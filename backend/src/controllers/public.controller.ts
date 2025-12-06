import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import axios from 'axios';

export const publicController = {
  // GET /api/public/orders/:id/track - Public order tracking (no auth required)
  async trackOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Find order by ID (first 8 characters match or full ID) - using select to avoid non-existent columns
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { id: id },
            { id: { startsWith: id.toUpperCase() } },
            { id: { startsWith: id.toLowerCase() } },
          ],
        },
        select: {
          id: true,
          status: true,
          pickupLat: true,
          pickupLng: true,
          dropLat: true,
          dropLng: true,
          priority: true,
          estimatedDuration: true,
          actualDuration: true,
          assignedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          cancelledAt: true,
          cancellationReason: true,
          createdAt: true,
          updatedAt: true,
          partner: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
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

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Format response for public tracking
      res.json({
        id: order.id,
        trackingNumber: order.id.substring(0, 8).toUpperCase(),
        status: order.status,
        pickup: order.pickupLat != null && order.pickupLng != null ? {
          latitude: order.pickupLat,
          longitude: order.pickupLng,
        } : null,
        dropoff: order.dropLat != null && order.dropLng != null ? {
          latitude: order.dropLat,
          longitude: order.dropLng,
        } : null,
        priority: order.priority || 'NORMAL',
        estimatedDuration: order.estimatedDuration,
        actualDuration: order.actualDuration,
        assignedAt: order.assignedAt?.toISOString(),
        pickedUpAt: order.pickedUpAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        cancellationReason: order.cancellationReason,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        partner: {
          name: order.partner.user.name,
          companyName: order.partner.companyName,
        },
        agent: order.agent ? {
          name: order.agent.user.name,
          phone: order.agent.user.phone,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/public/directions - Proxy for Google Directions API (no auth required)
  async getDirections(req: Request, res: Response, next: NextFunction) {
    try {
      const { origin, destination } = req.query;

      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required' });
      }

      // Check both environment variable names for flexibility
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        return res.status(500).json({ 
          error: 'Google Maps API key is not configured',
          message: 'Please set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your backend .env file'
        });
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json`;
      const response = await axios.get(url, {
        params: {
          origin: origin,
          destination: destination,
          key: googleApiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.status !== 'OK') {
        return res.status(400).json({
          error: `Directions API error: ${response.data.status}`,
          message: response.data.error_message,
        });
      }

      res.json(response.data);
    } catch (error: any) {
      if (error.response) {
        // API returned an error response
        return res.status(error.response.status).json({
          error: 'Directions API error',
          message: error.response.data?.error_message || error.message,
        });
      } else if (error.request) {
        // Request was made but no response received
        return res.status(504).json({
          error: 'Directions API timeout',
          message: 'The request to Google Directions API timed out',
        });
      } else {
        // Something else happened
        next(error);
      }
    }
  },
};

