import {z} from 'zod';
import {UserRole, AgentStatus, VehicleType} from '@prisma/client';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const registerSchema =z.object({
    name: z.string().min(2, 'Name must be atleast 2 character'),
    email:z.string().email('Invallid email Address'),
    phone:z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number'),
    password:z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.enum(['AGENT', 'PARTNER', 'ADMIN']),
});

export const updateLocationSchema =z.object({
    latitude:z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude:z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),

});

export const updateStatusSchema =z.object({
    status: z.enum(['OFFLINE', 'ONLINE', 'ON_TRIP']),
    });

export const agentProfileUpdateSchema= z.object({
   city: z.string().optional(),
   state: z.string().optional(),
   pincode: z.string().optional(),
   vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'BICYCLE']).optional(),
});

export const createOrderSchema= z.object({
    pickupLat: z.number().min(-90).max(90),
    pickupLng: z.number().min(-180).max(180),
    dropLat: z.number().min(-90).max(90),
    dropLng: z.number().min(-180).max(180),
    payoutAmount: z.number().positive('Payout amount must be positive'),
    priority: z.enum(['HIGH', 'NORMAL','LOW']).optional().default('NORMAL'),
    estimatedDuration: z.number().int().positive().optional(),
});

export const updateOrderStatusSchema =z.object({
    status: z.enum([
        'SEARCHING_AGENT',
        'ASSIGNED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
    ]),
    cancellationReason: z.string().optional(),
});
export const partnerOrderSchema = createOrderSchema;

export const updateWebhookSchema =z.object({
    webhookUrl: z.string().url('Invalid webhook URL').optional(),
});

export const approveAgentSchema=z.object({
    isApproved:z.boolean(),
});

export const blockAgentSchema=z.object({
    isBlocked:z.boolean(),
    blockedReason: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
