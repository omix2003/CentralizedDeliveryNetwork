import { Router } from 'express';
import { ratingController } from '../controllers/rating.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All rating routes require authentication
router.use(authenticate);

// POST /api/ratings - Submit a rating
router.post('/', ratingController.submitRating);

// GET /api/ratings/agent/:agentId - Get agent ratings
router.get('/agent/:agentId', ratingController.getAgentRatings);

// GET /api/ratings/order/:orderId - Get order rating
router.get('/order/:orderId', ratingController.getOrderRating);

console.log('⭐ Rating routes registered:');
console.log('  POST /api/ratings');
console.log('  GET /api/ratings/agent/:agentId');
console.log('  GET /api/ratings/order/:orderId');

export default router;

