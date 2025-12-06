import { prisma } from '../lib/prisma';
import crypto from 'crypto';

/**
 * Generate unique barcode for an order
 */
export function generateBarcode(orderId: string): string {
  // Generate a 12-digit barcode from order ID
  const hash = crypto.createHash('md5').update(orderId).digest('hex');
  return hash.substring(0, 12).toUpperCase();
}

/**
 * Generate QR code data for an order
 */
export function generateQRCode(orderId: string): string {
  // Generate QR code data (can be used to generate QR code image)
  return `ORDER:${orderId}`;
}

/**
 * Assign barcode and QR code to an order
 */
export async function assignBarcodeToOrder(orderId: string) {
  const barcode = generateBarcode(orderId);
  const qrCode = generateQRCode(orderId);

  try {
    // Try to update with barcode/qrCode
    return await prisma.order.update({
      where: { id: orderId },
      data: {
        barcode,
        qrCode,
      },
    });
  } catch (error: any) {
    // If columns don't exist (P2022), log and return null
    if (error?.code === 'P2022' || error?.message?.includes('barcode') || error?.message?.includes('qrCode')) {
      console.warn(`[Barcode Service] Barcode/QR code columns not available for order ${orderId.substring(0, 8)}. Migration may need to run.`);
      // Return the order without barcode/qrCode
      return await prisma.order.findUnique({
        where: { id: orderId },
      });
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Find order by barcode
 */
export async function findOrderByBarcode(barcode: string) {
  return await prisma.order.findUnique({
    where: { barcode },
    include: {
      partner: {
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      },
      agent: {
        include: {
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
}

/**
 * Find order by QR code
 */
export async function findOrderByQRCode(qrCode: string) {
  // Handle both QR code format and direct order ID
  const orderId = qrCode.startsWith('ORDER:') ? qrCode.replace('ORDER:', '') : qrCode;
  
  return await prisma.order.findFirst({
    where: {
      OR: [
        { qrCode },
        { id: orderId },
      ],
    },
    include: {
      partner: {
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      },
      agent: {
        include: {
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
}

export const barcodeService = {
  generateBarcode,
  generateQRCode,
  assignBarcodeToOrder,
  findOrderByBarcode,
  findOrderByQRCode,
};



