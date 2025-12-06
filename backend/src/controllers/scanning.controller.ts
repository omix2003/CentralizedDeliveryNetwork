import { Request, Response, NextFunction } from 'express';
import { barcodeService } from '../services/barcode.service';
import { AppError } from '../utils/errors.util';
import { getAgentId } from '../utils/role.util';

export const scanningController = {
  // POST /api/agent/scan/barcode - Scan barcode
  async scanBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { barcode } = req.body;
      const agentId = getAgentId(req);

      console.log('[SCAN BARCODE] Request received:', {
        hasBarcode: !!barcode,
        barcodeLength: barcode?.length,
        agentId,
        userId: req.user?.id,
        userRole: req.user?.role,
      });

      if (!barcode) {
        throw new AppError('Barcode is required', 400);
      }

      if (!agentId) {
        console.error('[SCAN BARCODE] Agent ID not found in request');
        throw new AppError('Agent ID not found. Please ensure you are logged in as an agent.', 401);
      }

      const order = await barcodeService.findOrderByBarcode(barcode);

      if (!order) {
        console.log('[SCAN BARCODE] Order not found for barcode:', barcode);
        throw new AppError('Order not found', 404);
      }

      console.log('[SCAN BARCODE] Order found:', {
        orderId: order.id,
        orderAgentId: order.agentId,
        requestingAgentId: agentId,
        status: order.status,
      });

      // Allow scanning if:
      // 1. Order is assigned to this agent, OR
      // 2. Order is not assigned to anyone yet (available for pickup)
      if (order.agentId && order.agentId !== agentId) {
        console.warn('[SCAN BARCODE] Order assigned to different agent:', {
          orderAgentId: order.agentId,
          requestingAgentId: agentId,
        });
        throw new AppError('Order is assigned to another agent', 403);
      }

      res.json({
        success: true,
        order: {
          id: order.id,
          trackingNumber: order.id.substring(0, 8).toUpperCase(),
          status: order.status,
          pickup: {
            latitude: order.pickupLat,
            longitude: order.pickupLng,
          },
          dropoff: {
            latitude: order.dropLat,
            longitude: order.dropLng,
          },
          partner: {
            name: order.partner.user.name,
            companyName: order.partner.companyName,
            phone: order.partner.user.phone,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // POST /api/agent/scan/qr - Scan QR code
  async scanQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { qrCode } = req.body;
      const agentId = getAgentId(req);

      console.log('[SCAN QR] Request received:', {
        hasQrCode: !!qrCode,
        qrCodeLength: qrCode?.length,
        agentId,
        userId: req.user?.id,
        userRole: req.user?.role,
      });

      if (!qrCode) {
        throw new AppError('QR code is required', 400);
      }

      if (!agentId) {
        console.error('[SCAN QR] Agent ID not found in request');
        throw new AppError('Agent ID not found. Please ensure you are logged in as an agent.', 401);
      }

      const order = await barcodeService.findOrderByQRCode(qrCode);

      if (!order) {
        console.log('[SCAN QR] Order not found for QR code:', qrCode);
        throw new AppError('Order not found', 404);
      }

      console.log('[SCAN QR] Order found:', {
        orderId: order.id,
        orderAgentId: order.agentId,
        requestingAgentId: agentId,
        status: order.status,
      });

      // Allow scanning if:
      // 1. Order is assigned to this agent, OR
      // 2. Order is not assigned to anyone yet (available for pickup)
      if (order.agentId && order.agentId !== agentId) {
        console.warn('[SCAN QR] Order assigned to different agent:', {
          orderAgentId: order.agentId,
          requestingAgentId: agentId,
        });
        throw new AppError('Order is assigned to another agent', 403);
      }

      res.json({
        success: true,
        order: {
          id: order.id,
          trackingNumber: order.id.substring(0, 8).toUpperCase(),
          status: order.status,
          pickup: {
            latitude: order.pickupLat,
            longitude: order.pickupLng,
          },
          dropoff: {
            latitude: order.dropLat,
            longitude: order.dropLng,
          },
          partner: {
            name: order.partner.user.name,
            companyName: order.partner.companyName,
            phone: order.partner.user.phone,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  },
};

