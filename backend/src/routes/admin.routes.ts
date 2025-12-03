import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { adminController } from '../controllers/admin.controller';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== METRICS ====================
router.get('/metrics/overview', adminController.getOverview);
router.get('/metrics/orders', adminController.getOrderMetrics);
router.get('/metrics/agents', adminController.getAgentMetrics);
router.get('/metrics/partners', adminController.getPartnerMetrics);
router.get('/activity', adminController.getRecentActivity);

// ==================== AGENT MANAGEMENT ====================
router.get('/agents', adminController.getAgents);
router.get('/agents/locations', adminController.getAgentLocations);
router.get('/agents/:id', adminController.getAgentDetails);
router.post('/agents/:id/approve', adminController.approveAgent);
router.post('/agents/:id/block', adminController.blockAgent);
router.post('/agents/:id/unblock', adminController.unblockAgent);
router.put('/agents/:id/location', adminController.updateAgentLocation);
router.delete('/agents/:id', adminController.deleteAgent);

// ==================== PARTNER MANAGEMENT ====================
router.get('/partners', adminController.getPartners);
router.get('/partners/:id', adminController.getPartnerDetails);
router.delete('/partners/:id', adminController.deletePartner);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.post('/orders/:id/reassign', adminController.reassignOrder);
router.post('/orders/:id/cancel', adminController.cancelOrder);

// ==================== KYC VERIFICATION ====================
router.get('/kyc/pending', adminController.getPendingKYC);
router.get('/agents/:id/documents', adminController.getAgentDocuments);
router.post('/documents/:id/verify', adminController.verifyDocument);
router.post('/documents/:id/reject', adminController.rejectDocument);
router.post('/agents/:id/verify-kyc', adminController.verifyAgentKYC);

// ==================== SUPPORT TICKETS ====================
router.get('/support/tickets', adminController.getSupportTickets);
router.get('/support/tickets/:id', adminController.getSupportTicketDetails);
router.put('/support/tickets/:id/status', adminController.updateTicketStatus);
router.post('/support/tickets/:id/resolve', adminController.resolveTicket);

// ==================== ANALYTICS ====================
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/performance', adminController.getPerformanceAnalytics);

// ==================== SETTINGS ====================
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

export default router;