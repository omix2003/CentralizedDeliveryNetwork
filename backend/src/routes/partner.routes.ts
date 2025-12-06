import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePartner } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { partnerController } from '../controllers/partner.controller';
import { revenueController } from '../controllers/revenue.controller';
import { updateWebhookSchema, createOrderSchema, updateOrderSchema } from '../utils/validation.schemas';

const router = Router();

// All routes require authentication and partner role
router.use(authenticate);
router.use(requirePartner);

// Partner profile routes
router.get('/profile', partnerController.getProfile);
router.put('/webhook', validate(updateWebhookSchema), partnerController.updateWebhook);
router.post('/regenerate-api-key', partnerController.regenerateApiKey);

// Partner order routes
router.post('/orders', validate(createOrderSchema), partnerController.createOrder);
router.get('/orders', partnerController.getOrders);
router.get('/orders/:id', partnerController.getOrderDetails);
router.put('/orders/:id', validate(updateOrderSchema), partnerController.updateOrder);

// Partner dashboard and analytics
router.get('/dashboard', partnerController.getDashboardMetrics);
router.get('/analytics', partnerController.getAnalytics);
router.get('/analytics/heatmap', partnerController.getOrderHeatmap);

// Support tickets
router.get('/support/tickets', partnerController.getSupportTickets);
router.post('/support/tickets', partnerController.createSupportTicket);

// Revenue routes
router.get('/revenue/summary', revenueController.getPartnerRevenueSummary);
router.get('/revenue', revenueController.getPartnerRevenue);

export default router;